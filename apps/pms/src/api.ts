import type {
  ChambreDTO,
  ReservationDTO,
  StatutChambre,
  StatutReservation,
} from "@aryv/shared";

async function requete<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const corps = await res.json().catch(() => ({}));
    throw new Error(corps.erreur ?? `Erreur ${res.status}`);
  }
  return res.json();
}

export const api = {
  listerChambres: () => requete<ChambreDTO[]>("/api/chambres"),

  listerReservations: (debut: string, fin: string) =>
    requete<ReservationDTO[]>(
      `/api/reservations?debut=${debut}&fin=${fin}`,
    ),

  creerReservation: (donnees: {
    telephone: string;
    nom?: string;
    chambreId: number;
    typeSejour: string;
    arrivee: string;
    depart: string;
    montant: string;
    refPaiement?: string;
  }) =>
    requete<ReservationDTO>("/api/reservations", {
      method: "POST",
      body: JSON.stringify(donnees),
    }),

  changerStatutReservation: (id: number, statut: StatutReservation) =>
    requete<ReservationDTO>(`/api/reservations/${id}/statut`, {
      method: "PATCH",
      body: JSON.stringify({ statut }),
    }),

  changerStatutChambre: (id: number, statut: StatutChambre) =>
    requete<ChambreDTO>(`/api/chambres/${id}/statut`, {
      method: "PATCH",
      body: JSON.stringify({ statut }),
    }),
};
