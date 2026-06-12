/** Utilitaires de dates au niveau jour (clés YYYY-MM-DD, fuseau local). */

export function cleJour(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const j = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${j}`;
}

export function ajouterJours(d: Date, n: number): Date {
  const copie = new Date(d);
  copie.setDate(copie.getDate() + n);
  return copie;
}

export function debutDuJour(d: Date): Date {
  const copie = new Date(d);
  copie.setHours(0, 0, 0, 0);
  return copie;
}

const FMT_JOUR = new Intl.DateTimeFormat("fr-FR", { weekday: "short" });
const FMT_DATE = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
});

export function libelleJour(d: Date): { semaine: string; date: string } {
  return { semaine: FMT_JOUR.format(d), date: FMT_DATE.format(d) };
}

/**
 * Jours couverts par un séjour, en clés YYYY-MM-DD.
 * Nuitée/multi : les nuits dormies (arrivée incluse, départ exclu).
 * Repos (day-use, arrivée = départ le même jour) : le jour même.
 */
export function joursCouverts(arriveeISO: string, departISO: string): string[] {
  const arrivee = debutDuJour(new Date(arriveeISO));
  const depart = debutDuJour(new Date(departISO));
  if (arrivee.getTime() >= depart.getTime()) return [cleJour(arrivee)];
  const jours: string[] = [];
  for (let d = arrivee; d < depart; d = ajouterJours(d, 1)) {
    jours.push(cleJour(d));
  }
  return jours;
}
