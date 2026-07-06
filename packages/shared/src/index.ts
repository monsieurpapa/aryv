// Types et utilitaires partagés entre l'API, le PMS et l'app Tower.

export const ETAGES = [1, 2, 3, 4] as const;

export type TypeSejour = "nuitee" | "repos" | "multi";
export type StatutChambre = "libre" | "reservee" | "occupee" | "a_nettoyer";
export type StatutReservation =
  | "en_attente"
  | "confirmee"
  | "en_cours"
  | "terminee"
  | "annulee";

// DTO échangés entre l'API et les frontends (les frontends n'importent jamais @aryv/db).
export interface ChambreDTO {
  id: number;
  numero: string;
  etage: number;
  type: "grande" | "petite";
  statut: StatutChambre;
  tarifNuitee: string;
  tarifRepos: string;
}

export interface ReservationDTO {
  id: number;
  chambreId: number;
  typeSejour: TypeSejour;
  statut: StatutReservation;
  arrivee: string; // ISO 8601
  depart: string; // ISO 8601
  montant: string;
  refPaiement: string | null;
  client: {
    id: number;
    telephone: string;
    nom: string | null;
  };
}

// Trombinoscope du personnel (gérant uniquement).
export interface UtilisateurDTO {
  id: string;
  nom: string;
  role: string;
  creeLe: string; // ISO 8601
}

// Journal d'audit (D9) — insert-only, exposé en lecture au gérant uniquement.
export interface AuditLogDTO {
  id: number;
  action: string;
  entiteType: string;
  entiteId: number | null;
  details: Record<string, unknown> | null;
  horodatage: string; // ISO 8601
  utilisateur: {
    nom: string;
    role: string;
  };
}

// Rapport de recettes (gérant uniquement).
export interface LigneRapportDTO {
  id: number;
  chambre: { numero: string; etage: number };
  client: { telephone: string; nom: string | null };
  typeSejour: TypeSejour;
  statut: StatutReservation;
  arrivee: string; // ISO 8601
  depart: string; // ISO 8601
  montant: string;
  refPaiement: string | null;
}

export interface RapportRecettesDTO {
  totalEncaisse: string; // séjours terminés uniquement
  totalAttendu: string;  // tous non-annulés
  parEtage: { etage: number; montant: string; nb: number }[];
  lignes: LigneRapportDTO[];
}

// --- Tarification (module « Tarification flexible », section A du budget) ---

// Paramètres de tarification globaux, modifiables par le gérant dans le PMS.
export interface ParametresTarificationDTO {
  majorationWeekendPct: number; // 0–100, appliqué aux nuits/journées week-end
}

const JOUR_MS = 24 * 60 * 60 * 1000;
// Goma est en UTC+2 (heure de Lubumbashi, sans heure d'été). Le jour de la
// semaine d'une nuitée doit être celui vu par le client à Goma, pas celui du
// fuseau du serveur (Railway tourne en UTC : samedi 00h00 à Goma est encore
// vendredi 22h00 UTC).
const FUSEAU_GOMA_MS = 2 * 60 * 60 * 1000;

/** Jour de la semaine à Goma (0 = dimanche … 6 = samedi). */
export function jourSemaineGoma(date: Date): number {
  return new Date(date.getTime() + FUSEAU_GOMA_MS).getUTCDay();
}

/** Une nuitée est « week-end » si elle commence un vendredi ou un samedi. */
export function estNuitWeekend(date: Date): boolean {
  const jour = jourSemaineGoma(date);
  return jour === 5 || jour === 6;
}

/** Un repos (journée) est « week-end » s'il tombe un samedi ou un dimanche. */
export function estReposWeekend(date: Date): boolean {
  const jour = jourSemaineGoma(date);
  return jour === 6 || jour === 0;
}

function arrondir2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Montant d'un séjour, majoration week-end comprise. Fonction UNIQUE de
 * calcul des prix : les frontends l'utilisent pour l'affichage et l'API la
 * ré-exécute côté serveur — le montant envoyé par un navigateur n'est
 * jamais la source de vérité pour les réservations publiques.
 */
export function calculerMontantSejour(
  tarifs: { tarifNuitee: string | number; tarifRepos: string | number },
  typeSejour: TypeSejour,
  arrivee: Date,
  depart: Date,
  majorationWeekendPct: number,
): number {
  const facteur = 1 + majorationWeekendPct / 100;

  if (typeSejour === "repos") {
    const base = Number(tarifs.tarifRepos);
    return arrondir2(estReposWeekend(arrivee) ? base * facteur : base);
  }

  const base = Number(tarifs.tarifNuitee);
  const nuits = Math.max(1, Math.ceil((depart.getTime() - arrivee.getTime()) / JOUR_MS));
  let total = 0;
  for (let i = 0; i < nuits; i++) {
    const nuit = new Date(arrivee.getTime() + i * JOUR_MS);
    total += arrondir2(estNuitWeekend(nuit) ? base * facteur : base);
  }
  return arrondir2(total);
}

/** Formate un montant USD pour l'affichage (fr-CD). */
export function formaterMontant(montant: number | string): string {
  return new Intl.NumberFormat("fr-CD", {
    style: "currency",
    currency: "USD",
  }).format(Number(montant));
}

/** Normalise un numéro de téléphone RDC en +243XXXXXXXXX. */
export function normaliserTelephone(brut: string): string {
  const chiffres = brut.replace(/\D/g, "");
  if (chiffres.startsWith("243")) return `+${chiffres}`;
  if (chiffres.startsWith("0")) return `+243${chiffres.slice(1)}`;
  return `+243${chiffres}`;
}
