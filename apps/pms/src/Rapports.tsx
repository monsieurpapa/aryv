import { useCallback, useEffect, useState } from "react";
import type { RapportRecettesDTO } from "@aryv/shared";
import { formaterMontant } from "@aryv/shared";
import { api } from "./api";
import { cleJour } from "./dates";
import { STATUT_RESERVATION, TYPE_SEJOUR } from "./etiquettes";

const FMT_DATE = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function premierDuMois(): string {
  const d = new Date();
  return cleJour(new Date(d.getFullYear(), d.getMonth(), 1));
}

export function Rapports() {
  const [debut, setDebut] = useState(premierDuMois);
  const [fin, setFin] = useState(() => cleJour(new Date()));
  const [rapport, setRapport] = useState<RapportRecettesDTO | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(async () => {
    setErreur(null);
    setChargement(true);
    try {
      const debutISO = new Date(`${debut}T00:00:00Z`).toISOString();
      const finISO = new Date(`${fin}T23:59:59.999Z`).toISOString();
      setRapport(await api.listerRapport(debutISO, finISO));
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setChargement(false);
    }
  }, [debut, fin]);

  useEffect(() => {
    void charger();
  }, [charger]);

  function changerPlage(setter: (v: string) => void) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setter(e.target.value);
  }

  return (
    <div className="rapports">
      <div className="rapports-filtres">
        <div className="champ">
          <label htmlFor="rapport-debut">Du</label>
          <input
            id="rapport-debut"
            type="date"
            value={debut}
            onChange={changerPlage(setDebut)}
          />
        </div>
        <div className="champ">
          <label htmlFor="rapport-fin">Au</label>
          <input
            id="rapport-fin"
            type="date"
            value={fin}
            onChange={changerPlage(setFin)}
          />
        </div>
      </div>

      {erreur && <div className="bandeau-erreur">{erreur}</div>}

      {chargement ? (
        <div className="chargement">Chargement…</div>
      ) : rapport === null ? null : (
        <>
          <div className="rapports-synthese">
            <div className="carte-synthese encaisse">
              <span className="valeur">{formaterMontant(rapport.totalEncaisse)}</span>
              <span className="libelle">Encaissé (séjours terminés)</span>
            </div>
            <div className="carte-synthese attendu">
              <span className="valeur">{formaterMontant(rapport.totalAttendu)}</span>
              <span className="libelle">Total attendu (hors annulations)</span>
            </div>
            <div className="carte-synthese neutre">
              <span className="valeur">{rapport.lignes.length}</span>
              <span className="libelle">Séjour{rapport.lignes.length !== 1 ? "s" : ""}</span>
            </div>
          </div>

          {rapport.parEtage.length > 0 && (
            <div className="rapports-section">
              <h3>Recettes par étage</h3>
              <table className="table-rapport">
                <thead>
                  <tr>
                    <th>Étage</th>
                    <th>Séjours</th>
                    <th className="colonne-montant">Attendu</th>
                  </tr>
                </thead>
                <tbody>
                  {rapport.parEtage.map(({ etage, nb, montant }) => (
                    <tr key={etage}>
                      <td>Étage {etage}</td>
                      <td>{nb}</td>
                      <td className="colonne-montant">{formaterMontant(montant)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="rapports-section">
            <h3>Détail des séjours</h3>
            {rapport.lignes.length === 0 ? (
              <p className="contexte">Aucun séjour sur cette période.</p>
            ) : (
              <table className="table-rapport">
                <thead>
                  <tr>
                    <th>Chambre</th>
                    <th>Client</th>
                    <th>Type</th>
                    <th>Arrivée</th>
                    <th>Départ</th>
                    <th>Statut</th>
                    <th>Réf. paiement</th>
                    <th className="colonne-montant">Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {rapport.lignes.map((ligne) => (
                    <tr key={ligne.id} className={`statut-${ligne.statut}`}>
                      <td>
                        <strong>{ligne.chambre.numero}</strong>{" "}
                        <span className="etage-badge">Ét. {ligne.chambre.etage}</span>
                      </td>
                      <td>
                        {ligne.client.nom ?? "—"}
                        <br />
                        <span className="telephone">{ligne.client.telephone}</span>
                      </td>
                      <td>{TYPE_SEJOUR[ligne.typeSejour]}</td>
                      <td>{FMT_DATE.format(new Date(ligne.arrivee))}</td>
                      <td>{FMT_DATE.format(new Date(ligne.depart))}</td>
                      <td>
                        <span className={`pastille-statut ${ligne.statut}`}>
                          {STATUT_RESERVATION[ligne.statut]}
                        </span>
                      </td>
                      <td className="ref-paiement">{ligne.refPaiement ?? "—"}</td>
                      <td className="colonne-montant">{formaterMontant(ligne.montant)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
