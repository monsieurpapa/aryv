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
