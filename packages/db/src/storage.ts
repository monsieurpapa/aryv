import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { and, asc, eq, gt, inArray, lt, ne } from "drizzle-orm";
import * as schema from "./schema.js";

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

// Statuts qui bloquent la disponibilité d'une chambre.
const STATUTS_ACTIFS = ["en_attente", "confirmee", "en_cours"] as const;

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

  async changerStatutChambre(
    id: number,
    statut: (typeof schema.statutChambre.enumValues)[number],
  ) {
    const [chambre] = await db()
      .update(schema.chambres)
      .set({ statut })
      .where(eq(schema.chambres.id, id))
      .returning();
    return chambre;
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

  async creerReservation(donnees: schema.NouvelleReservation) {
    const libre = await this.chambreDisponible(
      donnees.chambreId,
      donnees.arrivee,
      donnees.depart,
    );
    if (!libre) throw new ConflitReservation();
    const [reservation] = await db()
      .insert(schema.reservations)
      .values(donnees)
      .returning();
    return reservation;
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

  /**
   * Transition de statut d'une réservation, avec effet sur la chambre :
   * confirmee → chambre reservee · en_cours (check-in) → occupee ·
   * terminee (check-out) → a_nettoyer · annulee → libre si rien d'autre.
   */
  async changerStatutReservation(
    id: number,
    statut: (typeof schema.statutReservation.enumValues)[number],
  ) {
    const dbc = db();
    const [reservation] = await dbc
      .update(schema.reservations)
      .set({ statut })
      .where(eq(schema.reservations.id, id))
      .returning();
    if (!reservation) return undefined;

    const statutChambreCible = {
      confirmee: "reservee",
      en_cours: "occupee",
      terminee: "a_nettoyer",
      annulee: "libre",
      en_attente: null,
    }[statut] as (typeof schema.statutChambre.enumValues)[number] | null;

    if (statutChambreCible) {
      await dbc
        .update(schema.chambres)
        .set({ statut: statutChambreCible })
        .where(eq(schema.chambres.id, reservation.chambreId));
    }
    return reservation;
  },
};

export type Storage = typeof storage;
