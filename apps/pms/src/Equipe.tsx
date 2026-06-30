import { useCallback, useEffect, useState } from "react";
import type { UtilisateurDTO } from "@aryv/shared";
import { api } from "./api";
import { ROLE_UTILISATEUR } from "./etiquettes";

const FMT_DATE = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });

/**
 * Trombinoscope + invitation de personnel (gérant uniquement, D13). Le
 * compte est créé via l'API serveur — la clé service-role de Supabase reste
 * côté apps/api et n'est jamais référencée ici. Le trombinoscope existe
 * pour que cet écran montre QUI a déjà un compte, pas seulement le
 * formulaire pour en ajouter (design review).
 */
export function Equipe() {
  const [membres, setMembres] = useState<UtilisateurDTO[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreurChargement, setErreurChargement] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [nom, setNom] = useState("");
  const [role, setRole] = useState("reception");
  const [message, setMessage] = useState<{ texte: string; erreur: boolean } | null>(
    null,
  );
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  // Gère sa propre erreur (jamais de rejet propagé) : un échec de
  // rechargement déclenché depuis soumettre() (après une invitation
  // réussie) ne doit jamais être confondu avec un échec de l'invitation
  // elle-même (code-quality review).
  const chargerMembres = useCallback(async () => {
    try {
      setMembres(await api.listerUtilisateurs());
      setErreurChargement(null);
    } catch (err) {
      setErreurChargement(
        err instanceof Error ? err.message : "Impossible de charger l'équipe.",
      );
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    void chargerMembres();
  }, [chargerMembres]);

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setEnvoiEnCours(true);
    try {
      await api.inviterUtilisateur({ email: email.trim(), nom: nom.trim(), role });
      setMessage({ texte: `Invitation envoyée à ${email}.`, erreur: false });
      setEmail("");
      setNom("");
      await chargerMembres();
    } catch (err) {
      setMessage({
        texte: err instanceof Error ? err.message : "Erreur inattendue",
        erreur: true,
      });
    } finally {
      setEnvoiEnCours(false);
    }
  }

  return (
    <div className="equipe">
      <h2>Membres de l&apos;équipe</h2>
      {erreurChargement && <div className="bandeau-erreur">{erreurChargement}</div>}
      {chargement ? (
        <div className="chargement">Chargement…</div>
      ) : (
        <table className="table-journal">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Rôle</th>
              <th>Depuis</th>
            </tr>
          </thead>
          <tbody>
            {membres.map((membre) => (
              <tr key={membre.id}>
                <td>{membre.nom}</td>
                <td>{ROLE_UTILISATEUR[membre.role] ?? membre.role}</td>
                <td>{FMT_DATE.format(new Date(membre.creeLe))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>Inviter un membre du personnel</h2>
      <form onSubmit={soumettre} className="formulaire-equipe">
        <div className="champ">
          <label htmlFor="nom-equipe">Nom</label>
          <input
            id="nom-equipe"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            required
          />
        </div>
        <div className="champ">
          <label htmlFor="email-equipe">Email</label>
          <input
            id="email-equipe"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="champ">
          <label htmlFor="role-equipe">Rôle</label>
          <select id="role-equipe" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="reception">Réception</option>
            <option value="menage">Ménage</option>
            <option value="gerant">Gérant</option>
          </select>
        </div>
        {message && (
          <p className={message.erreur ? "erreur-formulaire" : "succes-formulaire"}>
            {message.texte}
          </p>
        )}
        <button type="submit" className="btn-principal" disabled={envoiEnCours}>
          {envoiEnCours ? "Envoi…" : "Inviter"}
        </button>
      </form>
    </div>
  );
}
