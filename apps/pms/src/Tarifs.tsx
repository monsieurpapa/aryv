import { useCallback, useEffect, useState } from "react";
import type { ChambreDTO } from "@aryv/shared";
import { api } from "./api";

type TypeChambre = "grande" | "petite";
const TYPES: { type: TypeChambre; libelle: string }[] = [
  { type: "grande", libelle: "Grandes chambres" },
  { type: "petite", libelle: "Petites chambres" },
];

interface LigneTarif {
  tarifNuitee: string;
  tarifRepos: string;
  nb: number;
}

/**
 * Tarification flexible (gérant uniquement, module section A du budget) :
 * tarifs de base par type de chambre (appliqués à TOUTES les chambres du
 * type) + majoration week-end en %. La majoration s'applique aux nuits de
 * vendredi et samedi, et aux repos (journée) du samedi et dimanche — même
 * règle que calculerMontantSejour, exécutée côté serveur à la réservation.
 */
export function Tarifs() {
  const [lignes, setLignes] = useState<Record<TypeChambre, LigneTarif> | null>(null);
  const [majoration, setMajoration] = useState("0");
  const [chargement, setChargement] = useState(true);
  const [erreurChargement, setErreurChargement] = useState<string | null>(null);
  const [message, setMessage] = useState<{ texte: string; erreur: boolean } | null>(
    null,
  );
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  const charger = useCallback(async () => {
    try {
      const [chambres, parametres] = await Promise.all([
        api.listerChambres(),
        api.obtenirTarifs(),
      ]);
      const parType = { grande: premiere(chambres, "grande"), petite: premiere(chambres, "petite") };
      setLignes(parType);
      setMajoration(String(parametres.majorationWeekendPct));
      setErreurChargement(null);
    } catch (err) {
      setErreurChargement(
        err instanceof Error ? err.message : "Impossible de charger les tarifs.",
      );
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  function majLigne(type: TypeChambre, champ: "tarifNuitee" | "tarifRepos", valeur: string) {
    setLignes((l) => (l ? { ...l, [type]: { ...l[type], [champ]: valeur } } : l));
  }

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    if (!lignes) return;
    setMessage(null);

    const tarifs = TYPES.map(({ type }) => ({
      type,
      tarifNuitee: Number(lignes[type].tarifNuitee),
      tarifRepos: Number(lignes[type].tarifRepos),
    }));
    const pct = Number(majoration);
    if (tarifs.some((t) => !(t.tarifNuitee > 0) || !(t.tarifRepos > 0))) {
      setMessage({ texte: "Chaque tarif doit être un montant positif.", erreur: true });
      return;
    }
    if (!Number.isInteger(pct) || pct < 0 || pct > 100) {
      setMessage({
        texte: "La majoration week-end doit être un entier entre 0 et 100.",
        erreur: true,
      });
      return;
    }

    setEnvoiEnCours(true);
    try {
      await api.modifierTarifs({ majorationWeekendPct: pct, tarifs });
      setMessage({ texte: "Tarifs enregistrés.", erreur: false });
      await charger();
    } catch (err) {
      setMessage({
        texte: err instanceof Error ? err.message : "Erreur inattendue",
        erreur: true,
      });
    } finally {
      setEnvoiEnCours(false);
    }
  }

  if (chargement) return <div className="chargement">Chargement…</div>;

  return (
    <div className="equipe">
      {erreurChargement && <div className="bandeau-erreur">{erreurChargement}</div>}
      {lignes && (
        <form onSubmit={soumettre} className="formulaire-equipe">
          {TYPES.map(({ type, libelle }) => (
            <div key={type}>
              <h2>
                {libelle}{" "}
                <small>
                  ({lignes[type].nb} chambre{lignes[type].nb > 1 ? "s" : ""})
                </small>
              </h2>
              <div className="rangee">
                <div className="champ">
                  <label htmlFor={`nuitee-${type}`}>Nuitée (USD)</label>
                  <input
                    id={`nuitee-${type}`}
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={lignes[type].tarifNuitee}
                    onChange={(e) => majLigne(type, "tarifNuitee", e.target.value)}
                    required
                  />
                </div>
                <div className="champ">
                  <label htmlFor={`repos-${type}`}>Repos — journée (USD)</label>
                  <input
                    id={`repos-${type}`}
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={lignes[type].tarifRepos}
                    onChange={(e) => majLigne(type, "tarifRepos", e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>
          ))}

          <h2>Majoration week-end</h2>
          <div className="champ">
            <label htmlFor="majoration">Majoration (%)</label>
            <input
              id="majoration"
              type="number"
              step="1"
              min="0"
              max="100"
              value={majoration}
              onChange={(e) => setMajoration(e.target.value)}
              required
            />
            <small>
              Appliquée aux nuits de vendredi et samedi, et aux repos du samedi et
              dimanche. 0 = pas de majoration.
            </small>
          </div>

          {message && (
            <p className={message.erreur ? "erreur-formulaire" : "succes-formulaire"}>
              {message.texte}
            </p>
          )}
          <button type="submit" className="btn-principal" disabled={envoiEnCours}>
            {envoiEnCours ? "Enregistrement…" : "Enregistrer les tarifs"}
          </button>
        </form>
      )}
    </div>
  );
}

// Les tarifs sont uniformes par type (le PATCH les applique à tout le type) ;
// la première chambre du type suffit donc comme valeur courante.
function premiere(chambres: ChambreDTO[], type: TypeChambre): LigneTarif {
  const duType = chambres.filter((c) => c.type === type);
  return {
    tarifNuitee: duType[0]?.tarifNuitee ?? "",
    tarifRepos: duType[0]?.tarifRepos ?? "",
    nb: duType.length,
  };
}
