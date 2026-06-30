import { useState } from "react";
import { connecter } from "./auth";

interface Props {
  onConnecte: () => void;
}

export function Login({ onConnecte }: Props) {
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnvoiEnCours(true);
    try {
      await connecter(email.trim(), motDePasse);
      onConnecte();
    } catch (err) {
      setErreur(
        err instanceof Error
          ? "Email ou mot de passe incorrect."
          : "Erreur inattendue.",
      );
    } finally {
      setEnvoiEnCours(false);
    }
  }

  return (
    <div className="ecran-connexion">
      <form className="formulaire-connexion" onSubmit={soumettre}>
        <h1>PMS ARYV</h1>
        <p className="sous-titre">ARYV Tower · Goma</p>

        <div className="champ">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
            required
          />
        </div>
        <div className="champ">
          <label htmlFor="mot-de-passe">Mot de passe</label>
          <input
            id="mot-de-passe"
            type="password"
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
            required
          />
        </div>

        {erreur && <p className="erreur-formulaire">{erreur}</p>}

        <button type="submit" className="btn-principal" disabled={envoiEnCours}>
          {envoiEnCours ? "Connexion…" : "Se connecter"}
        </button>
      </form>
    </div>
  );
}
