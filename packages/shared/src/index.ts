// Types et utilitaires partagés entre l'API, le PMS et l'app Tower.

export const ETAGES = [1, 2, 3, 4] as const;

export type TypeSejour = "nuitee" | "repos" | "multi";
export type StatutChambre = "libre" | "reservee" | "occupee" | "a_nettoyer";

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
