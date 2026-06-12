import { useMemo, useState } from "react";
import type { ChambreDTO } from "@aryv/shared";
import { formaterMontant } from "@aryv/shared";
import { api } from "./api";
import { ajouterJours, cleJour } from "./dates";

interface Props {
  chambre: ChambreDTO;
  jour: string; // YYYY-MM-DD
  onFermer: () => void;
  onCree: () => void;
}

type ModeSejour = "repos" | "nuitee";

export function ModalReservation({ chambre, jour, onFermer, onCree }: Props) {
  const [telephone, setTelephone] = useState("");
  const [nom, setNom] = useState("");
  const [mode, setMode] = useState<ModeSejour>("nuitee");
  const [arrivee, setArrivee] = useState(jour);
  const [nuits, setNuits] = useState(1);
  const [refPaiement, setRefPaiement] = useState("");
  const [montantPerso, setMontantPerso] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  const montantAuto = useMemo(() => {
    if (mode === "repos") return Number(chambre.tarifRepos);
    return Number(chambre.tarifNuitee) * Math.max(1, nuits);
  }, [mode, nuits, chambre]);

  const montant = montantPerso ?? String(montantAuto);

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    if (!telephone.trim()) {
      setErreur("Le numéro de téléphone est requis.");
      return;
    }

    // Repos : 06h → 18h le même jour. Nuitée(s) : 12h → 10h le jour du départ.
    const jourArrivee = new Date(`${arrivee}T00:00:00`);
    let dateArrivee: Date;
    let dateDepart: Date;
    if (mode === "repos") {
      dateArrivee = new Date(jourArrivee);
      dateArrivee.setHours(6, 0, 0, 0);
      dateDepart = new Date(jourArrivee);
      dateDepart.setHours(18, 0, 0, 0);
    } else {
      dateArrivee = new Date(jourArrivee);
      dateArrivee.setHours(12, 0, 0, 0);
      dateDepart = ajouterJours(jourArrivee, Math.max(1, nuits));
      dateDepart.setHours(10, 0, 0, 0);
    }

    setEnvoiEnCours(true);
    try {
      await api.creerReservation({
        telephone: telephone.trim(),
        nom: nom.trim() || undefined,
        chambreId: chambre.id,
        typeSejour: mode === "repos" ? "repos" : nuits > 1 ? "multi" : "nuitee",
        arrivee: dateArrivee.toISOString(),
        depart: dateDepart.toISOString(),
        montant,
        refPaiement: refPaiement.trim() || undefined,
      });
      onCree();
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Erreur inattendue");
      setEnvoiEnCours(false);
    }
  }

  return (
    <div className="voile" onClick={onFermer}>
      <div className="modale" onClick={(e) => e.stopPropagation()}>
        <h2>Nouvelle réservation — Chambre {chambre.numero}</h2>
        <p className="contexte">
          {chambre.type === "grande" ? "Grande chambre" : "Petite chambre"} ·
          étage {chambre.etage} · nuitée {formaterMontant(chambre.tarifNuitee)} ·
          repos {formaterMontant(chambre.tarifRepos)}
        </p>

        <form onSubmit={soumettre}>
          <div className="rangee">
            <div className="champ">
              <label htmlFor="telephone">Téléphone *</label>
              <input
                id="telephone"
                type="tel"
                placeholder="0991234567"
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                autoFocus
              />
            </div>
            <div className="champ">
              <label htmlFor="nom">Nom</label>
              <input
                id="nom"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
              />
            </div>
          </div>

          <div className="rangee">
            <div className="champ">
              <label htmlFor="mode">Type de séjour</label>
              <select
                id="mode"
                value={mode}
                onChange={(e) => {
                  setMode(e.target.value as ModeSejour);
                  setMontantPerso(null);
                }}
              >
                <option value="nuitee">Nuitée(s)</option>
                <option value="repos">Repos (journée)</option>
              </select>
            </div>
            <div className="champ">
              <label htmlFor="arrivee">
                {mode === "repos" ? "Jour" : "Arrivée"}
              </label>
              <input
                id="arrivee"
                type="date"
                value={arrivee}
                min={cleJour(new Date())}
                onChange={(e) => setArrivee(e.target.value)}
              />
            </div>
            {mode === "nuitee" && (
              <div className="champ">
                <label htmlFor="nuits">Nuits</label>
                <input
                  id="nuits"
                  type="number"
                  min={1}
                  max={60}
                  value={nuits}
                  onChange={(e) => {
                    setNuits(Number(e.target.value));
                    setMontantPerso(null);
                  }}
                />
              </div>
            )}
          </div>

          <div className="rangee">
            <div className="champ">
              <label htmlFor="montant">Montant (USD)</label>
              <input
                id="montant"
                type="number"
                step="0.01"
                min="0"
                value={montant}
                onChange={(e) => setMontantPerso(e.target.value)}
              />
            </div>
            <div className="champ">
              <label htmlFor="ref">Réf. Mobile Money</label>
              <input
                id="ref"
                placeholder="ex: MP240612.1234"
                value={refPaiement}
                onChange={(e) => setRefPaiement(e.target.value)}
              />
            </div>
          </div>

          {erreur && <p className="erreur-formulaire">{erreur}</p>}

          <div className="boutons">
            <button type="button" className="btn-secondaire" onClick={onFermer}>
              Fermer
            </button>
            <button type="submit" className="btn-principal" disabled={envoiEnCours}>
              {envoiEnCours ? "Enregistrement…" : "Réserver"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
