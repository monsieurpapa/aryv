import { useState } from "react";
import { api } from "./api";
import { PinPad } from "./PinPad";

export type ResultatPin = "ok" | "incorrect" | "verrouille" | "config_requise";

interface Props {
  titre: string;
  /**
   * Délègue la vérification du PIN à l'appelant, qui l'attache à la
   * mutation réelle dans LE MÊME appel API (D3 — fixé en eng review : un
   * /pin-confirm séparé de la mutation ne protège rien côté serveur).
   */
  onConfirme: (pin: string) => Promise<ResultatPin>;
  onAnnuler: () => void;
}

type Etape = "confirmer" | "configurer" | "verrouille";

/**
 * Modale PIN-switch (D3/D6/D12) : confirme l'identité de qui agit sur un
 * appareil partagé, sans exiger une déconnexion/reconnexion complète à
 * chaque action. Trois issues distinctes : code correct, première
 * utilisation sans PIN configuré, ou compte verrouillé après échecs
 * répétés (déverrouillage uniquement par reconnexion, D6).
 */
export function PinConfirm({ titre, onConfirme, onAnnuler }: Props) {
  const [etape, setEtape] = useState<Etape>("confirmer");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  // Incrémenté à chaque échec pour forcer le remontage de PinPad (vide les
  // 4 chiffres saisis) — plus simple que de synchroniser un état contrôlé.
  const [tentative, setTentative] = useState(0);

  async function confirmerCode(pin: string) {
    setErreur(null);
    setEnvoiEnCours(true);
    try {
      const resultat = await onConfirme(pin);
      if (resultat === "ok") return;
      if (resultat === "config_requise") {
        setEtape("configurer");
        setTentative((t) => t + 1);
        return;
      }
      if (resultat === "verrouille") {
        setEtape("verrouille");
        return;
      }
      setErreur("Code incorrect");
      setTentative((t) => t + 1);
    } finally {
      setEnvoiEnCours(false);
    }
  }

  async function configurerCode(pin: string) {
    setErreur(null);
    setEnvoiEnCours(true);
    try {
      await api.definirPin(pin);
      // Le PIN qu'on vient de définir sert directement à autoriser l'action
      // en attente — pas de second tour de saisie immédiat.
      const resultat = await onConfirme(pin);
      if (resultat !== "ok") {
        setErreur("Erreur inattendue");
        setTentative((t) => t + 1);
      }
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Erreur inattendue");
      setTentative((t) => t + 1);
    } finally {
      setEnvoiEnCours(false);
    }
  }

  return (
    <div className="voile" onClick={onAnnuler}>
      <div className="modale modale-pin" onClick={(e) => e.stopPropagation()}>
        <h2>{titre}</h2>

        {etape === "verrouille" && (
          <>
            <p className="erreur-formulaire">
              Compte verrouillé après plusieurs codes incorrects.
              Reconnectez-vous (email/mot de passe) pour le déverrouiller.
            </p>
            <div className="boutons">
              <button type="button" className="btn-secondaire" onClick={onAnnuler}>
                Fermer
              </button>
            </div>
          </>
        )}

        {etape === "confirmer" && (
          <div>
            <p className="contexte">Entrez votre code à 4 chiffres pour continuer.</p>
            <PinPad
              key={`confirmer-${tentative}`}
              onComplete={confirmerCode}
              disabled={envoiEnCours}
            />
            {erreur && <p className="erreur-formulaire">{erreur}</p>}
            <div className="boutons">
              <button type="button" className="btn-secondaire" onClick={onAnnuler}>
                Annuler
              </button>
            </div>
          </div>
        )}

        {etape === "configurer" && (
          <div>
            <p className="contexte">
              Première utilisation : définissez votre code à 4 chiffres.
            </p>
            <PinPad
              key={`configurer-${tentative}`}
              onComplete={configurerCode}
              disabled={envoiEnCours}
            />
            {erreur && <p className="erreur-formulaire">{erreur}</p>}
            <div className="boutons">
              <button type="button" className="btn-secondaire" onClick={onAnnuler}>
                Annuler
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
