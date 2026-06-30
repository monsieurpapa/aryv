import type {
  AuditLogDTO,
  ChambreDTO,
  RapportRecettesDTO,
  ReservationDTO,
  StatutChambre,
  StatutReservation,
  UtilisateurDTO,
} from "@aryv/shared";
import { jetonActuel } from "./auth";

// Appelé par App.tsx au montage : permet à requete() de déclencher un
// retour à l'écran de connexion sur 401, sans coupler ce module à React.
let gestionnaire401: (() => void) | undefined;
export function definirGestionnaire401(fn: () => void) {
  gestionnaire401 = fn;
}

async function appelAuthentifie(url: string, options?: RequestInit): Promise<Response> {
  const jeton = await jetonActuel();
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(jeton ? { Authorization: `Bearer ${jeton}` } : {}),
    },
    ...options,
  });
  if (res.status === 401) {
    gestionnaire401?.();
  }
  return res;
}

async function requete<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await appelAuthentifie(url, options);
  if (!res.ok) {
    const corps = await res.json().catch(() => ({}));
    throw new Error(corps.erreur ?? `Erreur ${res.status}`);
  }
  return res.json();
}

/** Pour les réponses 204 sans corps. */
async function requeteVide(url: string, options?: RequestInit): Promise<void> {
  const res = await appelAuthentifie(url, options);
  if (!res.ok) {
    const corps = await res.json().catch(() => ({}));
    throw new Error(corps.erreur ?? `Erreur ${res.status}`);
  }
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

  /**
   * pin (D3) : transmis dans LE MÊME appel pour les actions PIN-switch —
   * le serveur le vérifie avant d'appliquer la mutation (voir
   * storage.changerStatutChambre). Sur PIN invalide, l'erreur lancée a pour
   * message exactement "incorrect" / "verrouille" / "config_requise"
   * (PIN_RESULTATS dans App.tsx), à distinguer d'une erreur générique.
   */
  changerStatutChambre: (id: number, statut: StatutChambre, pin?: string) =>
    requete<ChambreDTO>(`/api/chambres/${id}/statut`, {
      method: "PATCH",
      body: JSON.stringify(pin ? { statut, pin } : { statut }),
    }),

  obtenirMoi: () =>
    requete<{ id: string; nom: string; role: string }>("/api/utilisateurs/moi"),

  definirPin: (pin: string) =>
    requeteVide("/api/utilisateurs/moi/pin", {
      method: "POST",
      body: JSON.stringify({ pin }),
    }),

  inviterUtilisateur: (donnees: { email: string; nom: string; role: string }) =>
    requete<{ id: string; nom: string; role: string }>("/api/utilisateurs", {
      method: "POST",
      body: JSON.stringify(donnees),
    }),

  listerUtilisateurs: () => requete<UtilisateurDTO[]>("/api/utilisateurs"),

  // Rapport de recettes (gérant uniquement).
  listerRapport: (debut: string, fin: string) =>
    requete<RapportRecettesDTO>(
      `/api/rapports?debut=${debut}&fin=${fin}`,
    ),

  // Journal d'audit (D14 — gérant uniquement, plage de dates paginée).
  listerAuditLog: (debut: string, fin: string, page: number) =>
    requete<AuditLogDTO[]>(
      `/api/audit-log?debut=${debut}&fin=${fin}&page=${page}`,
    ),

  /** Télécharge le CSV du journal d'audit (nécessite l'en-tête Authorization, donc pas un lien direct). */
  exporterAuditLogCsv: async (debut: string, fin: string): Promise<void> => {
    const res = await appelAuthentifie(
      `/api/audit-log/export?debut=${debut}&fin=${fin}`,
    );
    if (!res.ok) {
      const corps = await res.json().catch(() => ({}));
      throw new Error(corps.erreur ?? `Erreur ${res.status}`);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const lien = document.createElement("a");
    lien.href = url;
    lien.download = "journal-audit.csv";
    lien.click();
    URL.revokeObjectURL(url);
  },
};
