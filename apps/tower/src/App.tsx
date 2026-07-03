import { useState } from "react";
import type { ChambreDTO, TypeSejour } from "@aryv/shared";
import { formaterMontant, normaliserTelephone } from "@aryv/shared";
import { rechercherChambres, creerReservation } from "./api";
import "./styles.css";

type Etape = "recherche" | "selection" | "paiement" | "confirmation";

interface Recherche {
  debut: string; // YYYY-MM-DD
  fin: string;   // YYYY-MM-DD (vide pour repos)
  typeSejour: TypeSejour;
}

interface ConfirmationData {
  id: number;
  chambre: ChambreDTO;
  arriveeISO: string;
  departISO: string;
  montant: string;
  refPaiement: string;
}

// ─── Utilitaires ────────────────────────────────────────────────────────────

function toArriveeISO(date: string): string {
  return `${date}T14:00:00`;
}

function toDepartISO(date: string, typeSejour: TypeSejour): string {
  return typeSejour === "repos" ? `${date}T22:00:00` : `${date}T10:00:00`;
}

function calculerMontant(
  chambre: ChambreDTO,
  typeSejour: TypeSejour,
  debut: string,
  fin: string,
): number {
  if (typeSejour === "repos") return Number(chambre.tarifRepos);
  const ms =
    new Date(toDepartISO(fin || debut, typeSejour)).getTime() -
    new Date(toArriveeISO(debut)).getTime();
  const nuits = Math.max(1, Math.ceil(ms / (24 * 60 * 60 * 1000)));
  return Number(chambre.tarifNuitee) * nuits;
}

function formaterDateFr(isoString: string): string {
  return new Intl.DateTimeFormat("fr-CD", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(isoString));
}

// ─── Sous-composants ────────────────────────────────────────────────────────

function BadgeEtage({ etage }: { etage: number }) {
  return <span className="badge-etage">Étage {etage}</span>;
}

function BadgeType({ type }: { type: "grande" | "petite" }) {
  return <span className="badge-type">{type === "grande" ? "Grande" : "Petite"}</span>;
}

function EtapeRecherche({
  recherche,
  today,
  chargement,
  onChange,
  onSubmit,
}: {
  recherche: Recherche;
  today: string;
  chargement: boolean;
  onChange: (r: Recherche) => void;
  onSubmit: () => void;
}) {
  const estRepos = recherche.typeSejour === "repos";
  const minDepart = recherche.debut
    ? new Date(new Date(`${recherche.debut}T00:00:00`).getTime() + 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0]
    : today;

  return (
    <div className="tower-card">
      <h2 className="card-titre">Réserver une chambre</h2>
      <p className="card-sous-titre">24 chambres · Étages 1 à 4 · Goma, DRC</p>

      <div className="form-groupe">
        <label className="form-label">Type de séjour</label>
        <div className="radio-groupe">
          {(["nuitee", "repos", "multi"] as TypeSejour[]).map((t) => (
            <label
              key={t}
              className={`radio-option${recherche.typeSejour === t ? " actif" : ""}`}
            >
              <input
                type="radio"
                name="typeSejour"
                value={t}
                checked={recherche.typeSejour === t}
                onChange={() => onChange({ ...recherche, typeSejour: t, fin: "" })}
              />
              {t === "nuitee" ? "Nuitée" : t === "repos" ? "Repos (journée)" : "Multi-nuits"}
            </label>
          ))}
        </div>
      </div>

      <div className="form-row">
        <div className="form-groupe">
          <label className="form-label" htmlFor="debut">
            {estRepos ? "Date" : "Arrivée"}
          </label>
          <input
            id="debut"
            type="date"
            className="form-input"
            min={today}
            value={recherche.debut}
            onChange={(e) => onChange({ ...recherche, debut: e.target.value, fin: "" })}
          />
        </div>

        {!estRepos && (
          <div className="form-groupe">
            <label className="form-label" htmlFor="fin">
              Départ
            </label>
            <input
              id="fin"
              type="date"
              className="form-input"
              min={minDepart}
              value={recherche.fin}
              onChange={(e) => onChange({ ...recherche, fin: e.target.value })}
            />
          </div>
        )}
      </div>

      <button
        className="btn btn-primaire btn-plein"
        onClick={onSubmit}
        disabled={chargement}
      >
        {chargement ? "Recherche en cours…" : "Voir les chambres disponibles"}
      </button>
    </div>
  );
}

function EtapeSelection({
  chambres,
  recherche,
  onChoisir,
  onRetour,
}: {
  chambres: ChambreDTO[];
  recherche: Recherche;
  onChoisir: (c: ChambreDTO) => void;
  onRetour: () => void;
}) {
  if (chambres.length === 0) {
    return (
      <div className="tower-card">
        <h2 className="card-titre">Aucune chambre disponible</h2>
        <p className="card-sous-titre">
          Toutes les chambres sont occupées sur cette période. Essayez des dates
          différentes.
        </p>
        <button className="btn btn-secondaire" onClick={onRetour}>
          ← Modifier les dates
        </button>
      </div>
    );
  }

  const finAffichee = recherche.typeSejour === "repos" ? recherche.debut : recherche.fin;

  return (
    <div>
      <div className="selection-entete">
        <div>
          <h2 className="card-titre">
            {chambres.length} chambre{chambres.length > 1 ? "s" : ""} disponible
            {chambres.length > 1 ? "s" : ""}
          </h2>
          <p className="card-sous-titre">
            {recherche.typeSejour === "repos"
              ? `Le ${recherche.debut}`
              : `Du ${recherche.debut} au ${finAffichee}`}
            {" · "}
            {recherche.typeSejour === "nuitee"
              ? "Nuitée"
              : recherche.typeSejour === "repos"
              ? "Repos"
              : "Multi-nuits"}
          </p>
        </div>
        <button className="btn btn-secondaire" onClick={onRetour}>
          ← Modifier
        </button>
      </div>

      <div className="chambres-grille">
        {chambres.map((c) => {
          const finEff = recherche.typeSejour === "repos" ? recherche.debut : recherche.fin;
          const montant = calculerMontant(c, recherche.typeSejour, recherche.debut, finEff);
          return (
            <div key={c.id} className="chambre-card">
              <div className="chambre-card-entete">
                <span className="chambre-numero">Chambre {c.numero}</span>
                <div className="chambre-badges">
                  <BadgeEtage etage={c.etage} />
                  <BadgeType type={c.type} />
                </div>
              </div>
              <div className="chambre-tarif">
                {recherche.typeSejour === "repos" ? (
                  <span>
                    {formaterMontant(c.tarifRepos)} <small>la journée</small>
                  </span>
                ) : (
                  <span>
                    {formaterMontant(c.tarifNuitee)} <small>/ nuit</small>
                  </span>
                )}
              </div>
              <div className="chambre-total">
                Total estimé : <strong>{formaterMontant(montant)}</strong>
              </div>
              <button className="btn btn-primaire btn-plein" onClick={() => onChoisir(c)}>
                Réserver cette chambre
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EtapePaiement({
  chambre,
  recherche,
  telephone,
  nom,
  refPaiement,
  chargement,
  onTelephone,
  onNom,
  onRefPaiement,
  onSubmit,
  onRetour,
}: {
  chambre: ChambreDTO;
  recherche: Recherche;
  telephone: string;
  nom: string;
  refPaiement: string;
  chargement: boolean;
  onTelephone: (v: string) => void;
  onNom: (v: string) => void;
  onRefPaiement: (v: string) => void;
  onSubmit: () => void;
  onRetour: () => void;
}) {
  const finEff = recherche.typeSejour === "repos" ? recherche.debut : recherche.fin;
  const montant = calculerMontant(chambre, recherche.typeSejour, recherche.debut, finEff);
  const chiffres = telephone.replace(/\D/g, "");
  const telNormalise = chiffres.length >= 9 ? normaliserTelephone(telephone) : "";

  return (
    <div className="tower-card">
      <button className="btn-lien" onClick={onRetour}>
        ← Choisir une autre chambre
      </button>

      <div className="recap-sejour">
        <h2 className="card-titre">Chambre {chambre.numero}</h2>
        <div className="recap-details">
          <BadgeEtage etage={chambre.etage} />
          <BadgeType type={chambre.type} />
          <span>
            {recherche.typeSejour === "repos"
              ? `Repos · ${recherche.debut}`
              : `${recherche.debut} → ${finEff}`}
          </span>
        </div>
        <div className="recap-montant">
          <span>Montant à payer</span>
          <strong>{formaterMontant(montant)}</strong>
        </div>
      </div>

      <div className="mm-instructions">
        <h3>1. Effectuez le paiement Mobile Money</h3>
        <p>
          Envoyez <strong>{formaterMontant(montant)}</strong> via M-Pesa, Airtel Money ou
          Orange Money au numéro communiqué à la réception.
        </p>
        <p className="mm-note">Conservez la référence de transaction reçue par SMS.</p>
      </div>

      <p className="paiement-section-titre">2. Confirmez votre réservation</p>

      <div className="form-groupe">
        <label className="form-label" htmlFor="telephone">
          Numéro de téléphone *
        </label>
        <input
          id="telephone"
          type="tel"
          className="form-input"
          placeholder="Ex : 0999 123 456"
          value={telephone}
          onChange={(e) => onTelephone(e.target.value)}
          autoComplete="tel"
        />
        {telNormalise && (
          <span className="form-hint">Enregistré comme : {telNormalise}</span>
        )}
      </div>

      <div className="form-groupe">
        <label className="form-label" htmlFor="nom">
          Nom (optionnel)
        </label>
        <input
          id="nom"
          type="text"
          className="form-input"
          placeholder="Votre nom complet"
          value={nom}
          onChange={(e) => onNom(e.target.value)}
          autoComplete="name"
        />
      </div>

      <div className="form-groupe">
        <label className="form-label" htmlFor="refPaiement">
          Référence Mobile Money *
        </label>
        <input
          id="refPaiement"
          type="text"
          className="form-input"
          placeholder="Ex : MP240703123456"
          value={refPaiement}
          onChange={(e) => onRefPaiement(e.target.value)}
        />
        <span className="form-hint">
          Le code de confirmation reçu par SMS après votre paiement
        </span>
      </div>

      <button
        className="btn btn-primaire btn-plein"
        onClick={onSubmit}
        disabled={chargement}
      >
        {chargement ? "Confirmation en cours…" : "Confirmer la réservation"}
      </button>
    </div>
  );
}

function EtapeConfirmation({
  data,
  onRecommencer,
}: {
  data: ConfirmationData;
  onRecommencer: () => void;
}) {
  return (
    <div className="tower-card tower-card-confirmation">
      <div className="confirmation-icone">✓</div>
      <h2 className="card-titre">Réservation confirmée !</h2>
      <p className="card-sous-titre">Référence n° {data.id}</p>

      <dl className="confirmation-details">
        <dt>Chambre</dt>
        <dd>
          {data.chambre.numero} — Étage {data.chambre.etage}{" "}
          <BadgeType type={data.chambre.type} />
        </dd>
        <dt>Arrivée</dt>
        <dd>{formaterDateFr(data.arriveeISO)}</dd>
        <dt>Départ</dt>
        <dd>{formaterDateFr(data.departISO)}</dd>
        <dt>Montant</dt>
        <dd>{formaterMontant(data.montant)}</dd>
        <dt>Réf. paiement</dt>
        <dd>{data.refPaiement}</dd>
      </dl>

      <p className="confirmation-note">
        Notre équipe vérifiera votre paiement et vous contactera pour confirmer votre arrivée.
      </p>

      <button className="btn btn-secondaire btn-plein" onClick={onRecommencer}>
        Faire une nouvelle réservation
      </button>
    </div>
  );
}

// ─── Composant racine ────────────────────────────────────────────────────────

export function App() {
  const [etape, setEtape] = useState<Etape>("recherche");
  const [recherche, setRecherche] = useState<Recherche>({
    debut: "",
    fin: "",
    typeSejour: "nuitee",
  });
  const [chambres, setChambres] = useState<ChambreDTO[]>([]);
  const [chambreChoisie, setChambreChoisie] = useState<ChambreDTO | null>(null);
  const [telephone, setTelephone] = useState("");
  const [nom, setNom] = useState("");
  const [refPaiement, setRefPaiement] = useState("");
  const [confirmationData, setConfirmationData] = useState<ConfirmationData | null>(null);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const today = new Date().toISOString().split("T")[0];

  async function chercher() {
    if (!recherche.debut) {
      setErreur("Sélectionnez une date d'arrivée");
      return;
    }
    if (recherche.typeSejour !== "repos" && !recherche.fin) {
      setErreur("Sélectionnez une date de départ");
      return;
    }
    const finEff = recherche.typeSejour === "repos" ? recherche.debut : recherche.fin;
    const arriveeISO = toArriveeISO(recherche.debut);
    const departISO = toDepartISO(finEff, recherche.typeSejour);
    if (new Date(departISO) <= new Date(arriveeISO)) {
      setErreur("La date de départ doit être après l'arrivée");
      return;
    }
    setErreur(null);
    setChargement(true);
    try {
      const result = await rechercherChambres(arriveeISO, departISO);
      setChambres(result);
      setEtape("selection");
    } catch {
      setErreur("Erreur de connexion. Vérifiez votre réseau et réessayez.");
    } finally {
      setChargement(false);
    }
  }

  async function confirmer() {
    if (!chambreChoisie) return;
    if (!telephone) {
      setErreur("Le numéro de téléphone est requis");
      return;
    }
    if (!refPaiement) {
      setErreur("La référence de paiement Mobile Money est requise");
      return;
    }
    const finEff = recherche.typeSejour === "repos" ? recherche.debut : recherche.fin;
    const arriveeISO = toArriveeISO(recherche.debut);
    const departISO = toDepartISO(finEff, recherche.typeSejour);
    const montant = calculerMontant(chambreChoisie, recherche.typeSejour, recherche.debut, finEff);
    setErreur(null);
    setChargement(true);
    try {
      const reservation = await creerReservation({
        telephone: normaliserTelephone(telephone),
        nom: nom || undefined,
        chambreId: chambreChoisie.id,
        typeSejour: recherche.typeSejour,
        arrivee: arriveeISO,
        depart: departISO,
        montant: String(montant),
        refPaiement,
      });
      setConfirmationData({
        id: reservation.id,
        chambre: chambreChoisie,
        arriveeISO,
        departISO,
        montant: String(montant),
        refPaiement,
      });
      setEtape("confirmation");
    } catch (err: unknown) {
      const e = err as { type?: string; message?: string };
      if (e?.type === "conflit") {
        setErreur("Cette chambre vient d'être réservée. Veuillez en choisir une autre.");
        setEtape("selection");
      } else {
        setErreur(e?.message ?? "Erreur lors de la réservation. Veuillez réessayer.");
      }
    } finally {
      setChargement(false);
    }
  }

  function recommencer() {
    setEtape("recherche");
    setRecherche({ debut: "", fin: "", typeSejour: "nuitee" });
    setChambres([]);
    setChambreChoisie(null);
    setTelephone("");
    setNom("");
    setRefPaiement("");
    setConfirmationData(null);
    setErreur(null);
  }

  return (
    <div className="tower-app">
      <header className="tower-header">
        <div className="tower-header-inner">
          <h1 className="tower-logo">ARYV Tower</h1>
          <p className="tower-tagline">Goma · Entrée Président · Rue de la Bière</p>
        </div>
      </header>

      <main className="tower-main">
        {erreur && (
          <div className="tower-alerte" role="alert">
            {erreur}
          </div>
        )}

        {etape === "recherche" && (
          <EtapeRecherche
            recherche={recherche}
            today={today}
            chargement={chargement}
            onChange={setRecherche}
            onSubmit={chercher}
          />
        )}

        {etape === "selection" && (
          <EtapeSelection
            chambres={chambres}
            recherche={recherche}
            onChoisir={(c) => {
              setChambreChoisie(c);
              setEtape("paiement");
              setErreur(null);
            }}
            onRetour={() => {
              setEtape("recherche");
              setErreur(null);
            }}
          />
        )}

        {etape === "paiement" && chambreChoisie && (
          <EtapePaiement
            chambre={chambreChoisie}
            recherche={recherche}
            telephone={telephone}
            nom={nom}
            refPaiement={refPaiement}
            chargement={chargement}
            onTelephone={setTelephone}
            onNom={setNom}
            onRefPaiement={setRefPaiement}
            onSubmit={confirmer}
            onRetour={() => {
              setEtape("selection");
              setErreur(null);
            }}
          />
        )}

        {etape === "confirmation" && confirmationData && (
          <EtapeConfirmation data={confirmationData} onRecommencer={recommencer} />
        )}
      </main>

      <footer className="tower-footer">
        <p>ARYV Tower · Goma, DRC · Paiement via M-Pesa · Airtel Money · Orange Money</p>
      </footer>
    </div>
  );
}
