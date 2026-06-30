import { useState } from "react";

interface Props {
  onComplete: (pin: string) => void;
  disabled?: boolean;
}

const TOUCHES = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

/**
 * Pavé numérique tactile (D3) : remplace un champ texte par 4 cases de
 * progression + un clavier à l'écran (touches ≥ 44px) — pensé pour un appui
 * au pouce sur le téléphone Android partagé du ménage, pas pour attendre le
 * clavier OS au-dessus d'un petit champ texte. Auto-valide au 4e chiffre.
 */
export function PinPad({ onComplete, disabled }: Props) {
  const [pin, setPin] = useState("");

  function appuyer(chiffre: string) {
    if (disabled || pin.length >= 4) return;
    const suivant = pin + chiffre;
    setPin(suivant);
    if (suivant.length === 4) onComplete(suivant);
  }

  function effacer() {
    if (disabled) return;
    setPin((p) => p.slice(0, -1));
  }

  return (
    <div className="pin-pad">
      <div className="pin-progres" role="status" aria-live="polite">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`pin-case${i < pin.length ? " rempli" : ""}`} />
        ))}
        <span className="pin-progres-sr">{pin.length} sur 4 chiffres saisis</span>
      </div>
      <div className="pin-touches">
        {TOUCHES.map((chiffre) => (
          <button
            key={chiffre}
            type="button"
            className="touche-pin"
            onClick={() => appuyer(chiffre)}
            disabled={disabled}
          >
            {chiffre}
          </button>
        ))}
        <span />
        <button
          type="button"
          className="touche-pin"
          onClick={() => appuyer("0")}
          disabled={disabled}
        >
          0
        </button>
        <button
          type="button"
          className="touche-pin touche-effacer"
          onClick={effacer}
          disabled={disabled}
          aria-label="Effacer le dernier chiffre"
        >
          ⌫
        </button>
      </div>
    </div>
  );
}
