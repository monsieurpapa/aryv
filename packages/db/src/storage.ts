import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import bcrypt from "bcryptjs";
import { and, asc, desc, eq, gt, inArray, lt, ne } from "drizzle-orm";
import * as schema from "./schema.js";

const ECHECS_AVANT_VERROUILLAGE = 3;
const DUREE_VERROUILLAGE_MS = 24 * 60 * 60 * 1000; // levé par une reconnexion (D6)
const AUDIT_PAGE_SIZE = 50;
// Sous la limite Postgres de ~65 535 paramètres liés par requête (7
// colonnes/ligne sur audit_log_archive) — voir archiverAuditLog.
const AUDIT_ARCHIVE_LOT = 500;

type Db = PostgresJsDatabase<typeof schema>;
type Executor = Db | Parameters<Parameters<Db["transaction"]>[0]>[0];

// Connexion paresseuse : l'API peut démarrer sans DATABASE_URL (la connexion
// n'est ouverte qu'à la première requête).
let dbInstance: ReturnType<typeof creerDb> | undefined;

function creerDb() {
  const client = postgres(process.env.DATABASE_URL!, { prepare: false });
  return drizzle(client, { schema });
}

function db() {
  if (!dbInstance) dbInstance = creerDb();
  return dbInstance;
}

export class ConflitReservation extends Error {
  constructor() {
    super("La chambre est déjà réservée sur cette période");
  }
}

/**
 * Levée par les mutations PIN-gated (D3) quand la vérification du PIN
 * échoue — distincte de ConflitReservation pour que la route choisisse le
 * bon code HTTP par issue (incorrect/verrouille/config_requise), comme
 * confirmerPin le fait déjà.
 */
export class PinInvalide extends Error {
  constructor(public readonly resultat: "incorrect" | "verrouille" | "config_requise") {
    super(`PIN invalide : ${resultat}`);
  }
}

// Statuts qui bloquent la disponibilité d'une chambre.
const STATUTS_ACTIFS = ["en_attente", "confirmee", "en_cours"] as const;

/**
 * Insère une ligne d'audit (D9 — journal insert-only). Toujours appelé à
 * l'intérieur de la même transaction que la mutation qu'il enregistre :
 * si cet insert échoue, la transaction entière échoue (fail-closed —
 * une mutation non auditée est pire qu'une mutation refusée).
 */
async function enregistrerAudit(
  executeur: Executor,
  info: {
    acteurId: string;
    action: string;
    entiteType: string;
    entiteId?: number;
    details?: Record<string, unknown>;
  },
) {
  await executeur.insert(schema.auditLog).values({
    utilisateurId: info.acteurId,
    action: info.action,
    entiteType: info.entiteType,
    entiteId: info.entiteId,
    details: info.details,
  });
}

// Couche d'accès aux données unique du monorepo.
// Les routes de l'API n'importent jamais Drizzle directement — tout passe par ici.
export const storage = {
  // --- Chambres ---
  async listerChambres() {
    return db()
      .select()
      .from(schema.chambres)
      .orderBy(asc(schema.chambres.etage), asc(schema.chambres.numero));
  },

  /**
   * acteurId : présent une fois AUTH_ENFORCED actif (D9) — la mutation et
   * son entrée d'audit sont alors écrites dans une seule transaction.
   * Absent pendant la fenêtre de bascule (D16) : comportement inchangé,
   * sans audit (il n'existe pas d'acteur authentifié à enregistrer).
   *
   * pin : quand fourni (D3 — action PIN-switch sur appareil partagé), la
   * mutation N'EST APPLIQUÉE qu'après une vérification RÉUSSIE par
   * confirmerPin pour ce même acteurId, dans le MÊME appel — avant cette
   * vérification, valider le PIN se faisait via un appel HTTP séparé
   * (POST /moi/pin-confirm) totalement déconnecté de la mutation
   * elle-même : rien n'empêchait d'appeler ce PATCH directement avec un
   * jeton JWT valide sans jamais saisir de PIN correct (trouvé en outside
   * voice — la « vérification » PIN ne protégeait en réalité rien côté
   * serveur). Lève PinInvalide si le PIN est incorrect/verrouillé/absent.
   */
  async changerStatutChambre(
    id: number,
    statut: (typeof schema.statutChambre.enumValues)[number],
    acteurId?: string,
    pin?: string,
  ) {
    if (acteurId && pin) {
      const resultat = await this.confirmerPin(acteurId, pin);
      if (resultat !== "ok") throw new PinInvalide(resultat);
    }
    if (!acteurId) {
      const [chambre] = await db()
        .update(schema.chambres)
        .set({ statut })
        .where(eq(schema.chambres.id, id))
        .returning();
      return chambre;
    }
    return db().transaction(async (tx) => {
      const [chambre] = await tx
        .update(schema.chambres)
        .set({ statut })
        .where(eq(schema.chambres.id, id))
        .returning();
      if (chambre) {
        await enregistrerAudit(tx, {
          acteurId,
          action: "chambre.statut",
          entiteType: "chambre",
          entiteId: chambre.id,
          details: { statut },
        });
      }
      return chambre;
    });
  },

  // --- Utilisateurs (personnel) ---
  async obtenirUtilisateur(id: string) {
    return db().query.utilisateurs.findFirst({
      where: eq(schema.utilisateurs.id, id),
    });
  },

  /** Crée la ligne utilisateurs APRÈS la création du compte Supabase Auth (D13). */
  async creerUtilisateur(donnees: {
    id: string;
    nom: string;
    role: (typeof schema.roleUtilisateur.enumValues)[number];
  }) {
    const [utilisateur] = await db()
      .insert(schema.utilisateurs)
      .values(donnees)
      .returning();
    return utilisateur;
  },

  /** Trombinoscope de l'équipe (D'A — vue gérant), du plus ancien au plus récent. */
  async listerUtilisateurs() {
    return db()
      .select({
        id: schema.utilisateurs.id,
        nom: schema.utilisateurs.nom,
        role: schema.utilisateurs.role,
        creeLe: schema.utilisateurs.creeLe,
      })
      .from(schema.utilisateurs)
      .orderBy(asc(schema.utilisateurs.creeLe));
  },

  /** Appelé juste après une connexion Supabase réussie — lève le verrouillage PIN (D6). */
  async reinitialiserVerrouillagePin(id: string) {
    await db()
      .update(schema.utilisateurs)
      .set({ echecsPinConsecutifs: 0, verrouilleJusqua: null })
      .where(eq(schema.utilisateurs.id, id));
  },

  /** Première configuration du PIN (D12) ou changement volontaire. */
  async definirPin(id: string, pin: string) {
    const pinHash = await bcrypt.hash(pin, 10);
    await db()
      .update(schema.utilisateurs)
      .set({ pinHash, echecsPinConsecutifs: 0, verrouilleJusqua: null })
      .where(eq(schema.utilisateurs.id, id));
  },

  /**
   * Vérifie le PIN avant une action protégée (D3/D6/D12). Ne lève jamais
   * d'exception — le résultat distingue explicitement les 4 issues pour
   * que la route choisisse le bon code HTTP et message.
   */
  async confirmerPin(
    id: string,
    pin: string,
  ): Promise<"ok" | "verrouille" | "config_requise" | "incorrect"> {
    const utilisateur = await this.obtenirUtilisateur(id);
    if (!utilisateur) return "incorrect";
    if (utilisateur.verrouilleJusqua && utilisateur.verrouilleJusqua > new Date()) {
      return "verrouille";
    }
    if (!utilisateur.pinHash) return "config_requise";

    const correct = await bcrypt.compare(pin, utilisateur.pinHash);
    if (correct) {
      if (utilisateur.echecsPinConsecutifs > 0) {
        await this.reinitialiserVerrouillagePin(id);
      }
      return "ok";
    }

    const echecs = utilisateur.echecsPinConsecutifs + 1;
    const verrouille = echecs >= ECHECS_AVANT_VERROUILLAGE;
    await db()
      .update(schema.utilisateurs)
      .set({
        echecsPinConsecutifs: echecs,
        verrouilleJusqua: verrouille
          ? new Date(Date.now() + DUREE_VERROUILLAGE_MS)
          : null,
      })
      .where(eq(schema.utilisateurs.id, id));
    return verrouille ? "verrouille" : "incorrect";
  },

  // --- Clients (identité = numéro de téléphone) ---
  async trouverOuCreerClient(telephone: string, nom?: string) {
    const dbc = db();
    const existant = await dbc.query.clients.findFirst({
      where: eq(schema.clients.telephone, telephone),
    });
    if (existant) {
      if (nom && !existant.nom) {
        const [maj] = await dbc
          .update(schema.clients)
          .set({ nom })
          .where(eq(schema.clients.id, existant.id))
          .returning();
        return maj;
      }
      return existant;
    }
    const [nouveau] = await dbc
      .insert(schema.clients)
      .values({ telephone, nom })
      .returning();
    return nouveau;
  },

  // --- Réservations ---
  async chambreDisponible(chambreId: number, arrivee: Date, depart: Date) {
    const conflits = await db()
      .select({ id: schema.reservations.id })
      .from(schema.reservations)
      .where(
        and(
          eq(schema.reservations.chambreId, chambreId),
          inArray(schema.reservations.statut, [...STATUTS_ACTIFS]),
          lt(schema.reservations.arrivee, depart),
          gt(schema.reservations.depart, arrivee),
        ),
      )
      .limit(1);
    return conflits.length === 0;
  },

  async creerReservation(donnees: schema.NouvelleReservation, acteurId?: string) {
    const libre = await this.chambreDisponible(
      donnees.chambreId,
      donnees.arrivee,
      donnees.depart,
    );
    if (!libre) throw new ConflitReservation();
    if (!acteurId) {
      const [reservation] = await db()
        .insert(schema.reservations)
        .values(donnees)
        .returning();
      return reservation;
    }
    return db().transaction(async (tx) => {
      const [reservation] = await tx
        .insert(schema.reservations)
        .values(donnees)
        .returning();
      await enregistrerAudit(tx, {
        acteurId,
        action: "reservation.creer",
        entiteType: "reservation",
        entiteId: reservation.id,
        details: { typeSejour: reservation.typeSejour, montant: reservation.montant },
      });
      return reservation;
    });
  },

  async obtenirReservation(id: number) {
    return db().query.reservations.findFirst({
      where: eq(schema.reservations.id, id),
    });
  },

  /** Réservations (avec client) chevauchant la plage [debut, fin), hors annulées. */
  async listerReservationsPlage(debut: Date, fin: Date) {
    return db()
      .select({
        reservation: schema.reservations,
        client: schema.clients,
      })
      .from(schema.reservations)
      .innerJoin(
        schema.clients,
        eq(schema.reservations.clientId, schema.clients.id),
      )
      .where(
        and(
          ne(schema.reservations.statut, "annulee"),
          lt(schema.reservations.arrivee, fin),
          gt(schema.reservations.depart, debut),
        ),
      );
  },

  // --- Journal d'audit (D9, insert-only — voir enregistrerAudit ci-dessus) ---

  /** Page de journal d'audit (avec nom du membre du personnel), la plus récente d'abord (D14). */
  async listerAuditLog(debut: Date, fin: Date, page = 1) {
    return db()
      .select({
        audit: schema.auditLog,
        utilisateur: { nom: schema.utilisateurs.nom, role: schema.utilisateurs.role },
      })
      .from(schema.auditLog)
      .innerJoin(
        schema.utilisateurs,
        eq(schema.auditLog.utilisateurId, schema.utilisateurs.id),
      )
      .where(
        and(
          gt(schema.auditLog.horodatage, debut),
          lt(schema.auditLog.horodatage, fin),
        ),
      )
      .orderBy(desc(schema.auditLog.horodatage))
      .limit(AUDIT_PAGE_SIZE)
      .offset((page - 1) * AUDIT_PAGE_SIZE);
  },

  /**
   * Archive mensuelle (D15) : déplace les lignes d'audit antérieures à
   * `avant` vers audit_log_archive puis les supprime de audit_log, par
   * lots de AUDIT_ARCHIVE_LOT lignes — chaque lot dans sa propre
   * transaction (insert + delete atomiques l'un par rapport à l'autre).
   * Évite de dépasser la limite Postgres de ~65 535 paramètres liés par
   * requête sur un premier run avec un gros arriéré non archivé. Le
   * delete cible les IDs exacts du lot sélectionné (jamais la condition
   * de date seule) pour ne jamais supprimer une ligne qui n'a pas été
   * archivée dans CE lot. Renvoie le nombre total de lignes archivées.
   */
  async archiverAuditLog(avant: Date): Promise<number> {
    let total = 0;
    for (;;) {
      const archivees = await db().transaction(async (tx) => {
        const lignes = await tx
          .select()
          .from(schema.auditLog)
          .where(lt(schema.auditLog.horodatage, avant))
          .limit(AUDIT_ARCHIVE_LOT);
        if (lignes.length === 0) return 0;

        await tx.insert(schema.auditLogArchive).values(
          lignes.map((ligne) => ({
            auditLogId: ligne.id,
            utilisateurId: ligne.utilisateurId,
            action: ligne.action,
            entiteType: ligne.entiteType,
            entiteId: ligne.entiteId,
            details: ligne.details,
            horodatage: ligne.horodatage,
          })),
        );
        await tx
          .delete(schema.auditLog)
          .where(inArray(schema.auditLog.id, lignes.map((l) => l.id)));
        return lignes.length;
      });
      total += archivees;
      if (archivees < AUDIT_ARCHIVE_LOT) break;
    }
    return total;
  },

  /**
   * Transition de statut d'une réservation, avec effet sur la chambre :
   * confirmee → chambre reservee · en_cours (check-in) → occupee ·
   * terminee (check-out) → a_nettoyer · annulee → libre si rien d'autre.
   */
  /**
   * acteurId : voir changerStatutChambre. Quand présent, la mise à jour de
   * la réservation, l'effet de bord sur la chambre, ET l'entrée d'audit
   * sont les TROIS dans la même transaction — sans ça, un rollback de
   * l'audit pourrait laisser la chambre dans un statut incohérent avec une
   * réservation dont le changement a été annulé (trouvé en eng review).
   */
  async changerStatutReservation(
    id: number,
    statut: (typeof schema.statutReservation.enumValues)[number],
    acteurId?: string,
  ) {
    const appliquerEffetChambre = async (
      executeur: Executor,
      reservation: schema.Reservation,
    ) => {
      const statutChambreCible = {
        confirmee: "reservee",
        en_cours: "occupee",
        terminee: "a_nettoyer",
        annulee: "libre",
        en_attente: null,
      }[statut] as (typeof schema.statutChambre.enumValues)[number] | null;

      if (statutChambreCible) {
        await executeur
          .update(schema.chambres)
          .set({ statut: statutChambreCible })
          .where(eq(schema.chambres.id, reservation.chambreId));
      }
    };

    if (!acteurId) {
      const dbc = db();
      const [reservation] = await dbc
        .update(schema.reservations)
        .set({ statut })
        .where(eq(schema.reservations.id, id))
        .returning();
      if (!reservation) return undefined;
      await appliquerEffetChambre(dbc, reservation);
      return reservation;
    }

    return db().transaction(async (tx) => {
      const [reservation] = await tx
        .update(schema.reservations)
        .set({ statut })
        .where(eq(schema.reservations.id, id))
        .returning();
      if (!reservation) return undefined;
      await appliquerEffetChambre(tx, reservation);
      await enregistrerAudit(tx, {
        acteurId,
        action: "reservation.statut",
        entiteType: "reservation",
        entiteId: reservation.id,
        details: { statut },
      });
      return reservation;
    });
  },
};

export type Storage = typeof storage;
