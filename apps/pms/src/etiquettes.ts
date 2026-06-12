import type { StatutChambre, StatutReservation, TypeSejour } from "@aryv/shared";

export const STATUT_CHAMBRE: Record<StatutChambre, string> = {
  libre: "Libre",
  reservee: "Réservée",
  occupee: "Occupée",
  a_nettoyer: "À nettoyer",
};

export const STATUT_RESERVATION: Record<StatutReservation, string> = {
  en_attente: "En attente",
  confirmee: "Confirmée",
  en_cours: "En cours",
  terminee: "Terminée",
  annulee: "Annulée",
};

export const TYPE_SEJOUR: Record<TypeSejour, string> = {
  nuitee: "Nuitée",
  repos: "Repos (journée)",
  multi: "Multi-nuits",
};

/** Actions possibles depuis chaque statut de réservation (miroir de l'API). */
export const ACTIONS: Record<
  StatutReservation,
  { statut: StatutReservation; libelle: string; classe: string }[]
> = {
  en_attente: [
    { statut: "confirmee", libelle: "Confirmer", classe: "btn-principal" },
    { statut: "annulee", libelle: "Annuler", classe: "btn-danger" },
  ],
  confirmee: [
    { statut: "en_cours", libelle: "Check-in", classe: "btn-principal" },
    { statut: "annulee", libelle: "Annuler", classe: "btn-danger" },
  ],
  en_cours: [
    { statut: "terminee", libelle: "Check-out", classe: "btn-principal" },
  ],
  terminee: [],
  annulee: [],
};
