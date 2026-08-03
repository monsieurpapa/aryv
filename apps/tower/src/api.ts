import type { ChambreDTO, ConfigPubliqueDTO, ParametresTarificationDTO, TypeSejour } from "@aryv/shared";

// Pas de montant : le serveur le calcule à partir des tarifs de la chambre
// et de la majoration week-end (le prix affiché n'est qu'une prévisualisation).
export interface DonneesReservation {
  telephone: string;
  nom?: string;
  chambreId: number;
  typeSejour: TypeSejour;
  arrivee: string;
  depart: string;
  refPaiement?: string;
}

export interface ReservationCreee {
  id: number;
  chambreId: number;
  typeSejour: TypeSejour;
  statut: string;
  arrivee: string;
  depart: string;
  montant: string;
  refPaiement: string | null;
}

export async function rechercherChambres(debut: string, fin: string): Promise<ChambreDTO[]> {
  const params = new URLSearchParams({ debut, fin });
  const r = await fetch(`/api/disponibilites?${params}`);
  if (!r.ok) throw new Error("Erreur lors de la recherche des chambres");
  return r.json() as Promise<ChambreDTO[]>;
}

/** Paramètres de tarification publics (majoration week-end) ; 0 en cas d'échec. */
export async function obtenirTarifs(): Promise<ParametresTarificationDTO> {
  try {
    const r = await fetch("/api/tarifs");
    if (!r.ok) return { majorationWeekendPct: 0 };
    return (await r.json()) as ParametresTarificationDTO;
  } catch {
    return { majorationWeekendPct: 0 };
  }
}

/** Configuration publique (numéro WhatsApp) ; null en cas d'échec. */
export async function obtenirConfig(): Promise<ConfigPubliqueDTO> {
  try {
    const r = await fetch("/api/config");
    if (!r.ok) return { whatsappPhone: null };
    return (await r.json()) as ConfigPubliqueDTO;
  } catch {
    return { whatsappPhone: null };
  }
}

export async function creerReservation(donnees: DonneesReservation): Promise<ReservationCreee> {
  const r = await fetch("/api/reservations/publique", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(donnees),
  });
  if (r.status === 409) {
    const body = await r.json().catch(() => ({})) as { erreur?: string };
    throw { type: "conflit" as const, message: body.erreur ?? "Chambre déjà réservée sur cette période" };
  }
  if (!r.ok) {
    const body = await r.json().catch(() => ({})) as { erreur?: string };
    throw { type: "erreur" as const, message: body.erreur ?? "Erreur lors de la réservation" };
  }
  return r.json() as Promise<ReservationCreee>;
}
