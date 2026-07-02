import { useCallback, useEffect, useState } from "react";
import type { AuditLogDTO } from "@aryv/shared";
import { api } from "./api";
import { cleJour } from "./dates";
import { ACTION_AUDIT, ROLE_UTILISATEUR } from "./etiquettes";

const TAILLE_PAGE = 50;

const FMT_HORODATAGE = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * Visionneuse du journal d'audit (gérant uniquement, D14) : plage de dates
 * par défaut "aujourd'hui", paginée, avec export CSV. Le journal est
 * insert-only côté serveur — cet écran est la seule façon de le lire.
 */
export function JournalAudit() {
  const [debut, setDebut] = useState(() => cleJour(new Date()));
  const [fin, setFin] = useState(() => cleJour(new Date()));
  const [page, setPage] = useState(1);
  const [lignes, setLignes] = useState<AuditLogDTO[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [exportEnCours, setExportEnCours] = useState(false);

  function plageISO() {
    return {
      debutISO: new Date(`${debut}T00:00:00Z`).toISOString(),
      finISO: new Date(`${fin}T23:59:59.999Z`).toISOString(),
    };
  }

  const charger = useCallback(async () => {
    setErreur(null);
    setChargement(true);
    try {
      const { debutISO, finISO } = plageISO();
      const resultat = await api.listerAuditLog(debutISO, finISO, page);
      setLignes(resultat);
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setChargement(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debut, fin, page]);

  useEffect(() => {
    void charger();
  }, [charger]);

  function changerPlage(setter: (v: string) => void) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setPage(1);
      setter(e.target.value);
    };
  }

  async function exporter() {
    setExportEnCours(true);
    setErreur(null);
    try {
      const { debutISO, finISO } = plageISO();
      await api.exporterAuditLogCsv(debutISO, finISO);
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setExportEnCours(false);
    }
  }

  return (
    <div className="journal-audit">
      <div className="journal-filtres">
        <div className="champ">
          <label htmlFor="journal-debut">Du</label>
          <input
            id="journal-debut"
            type="date"
            value={debut}
            onChange={changerPlage(setDebut)}
          />
        </div>
        <div className="champ">
          <label htmlFor="journal-fin">Au</label>
          <input id="journal-fin" type="date" value={fin} onChange={changerPlage(setFin)} />
        </div>
        <button className="btn-secondaire" onClick={exporter} disabled={exportEnCours}>
          {exportEnCours ? "Export…" : "Exporter CSV"}
        </button>
      </div>

      {erreur && <div className="bandeau-erreur">{erreur}</div>}

      {chargement ? (
        <div className="chargement">Chargement…</div>
      ) : lignes.length === 0 ? (
        <p className="contexte">Aucune entrée sur cette période.</p>
      ) : (
        <table className="table-journal">
          <thead>
            <tr>
              <th>Horodatage</th>
              <th>Membre</th>
              <th>Rôle</th>
              <th>Action</th>
              <th>Détails</th>
            </tr>
          </thead>
          <tbody>
            {lignes.map((ligne) => (
              <tr key={ligne.id}>
                <td>{FMT_HORODATAGE.format(new Date(ligne.horodatage))}</td>
                <td>{ligne.utilisateur.nom}</td>
                <td>{ROLE_UTILISATEUR[ligne.utilisateur.role] ?? ligne.utilisateur.role}</td>
                <td>{ACTION_AUDIT[ligne.action] ?? ligne.action}</td>
                <td>{ligne.details ? JSON.stringify(ligne.details) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="journal-pagination">
        <button
          className="btn-secondaire"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1 || chargement}
        >
          ◀ Précédent
        </button>
        <span>Page {page}</span>
        <button
          className="btn-secondaire"
          onClick={() => setPage((p) => p + 1)}
          disabled={chargement || lignes.length < TAILLE_PAGE}
        >
          Suivant ▶
        </button>
      </div>
    </div>
  );
}
