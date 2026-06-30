import { useCallback, useEffect, useState } from "react";
import type { ChambreDTO, ReservationDTO } from "@aryv/shared";
import { api, definirGestionnaire401 } from "./api";
import { ajouterJours, debutDuJour } from "./dates";
import { Calendrier } from "./Calendrier";
import { Menage } from "./Menage";
import { ModalReservation } from "./ModalReservation";
import { PanneauDetail } from "./PanneauDetail";
import { STATUT_CHAMBRE } from "./etiquettes";
import { Login } from "./Login";
import { PinConfirm, type ResultatPin } from "./PinConfirm";
import { Equipe } from "./Equipe";
import { JournalAudit } from "./JournalAudit";
import { Rapports } from "./Rapports";
import { deconnecter, supabase } from "./auth";

const NB_JOURS = 14;

type Vue = "calendrier" | "menage" | "equipe" | "journal" | "rapports";

const FMT_HEURE = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit",
});

type Selection =
  | { type: "creation"; chambre: ChambreDTO; jour: string }
  | { type: "detail"; reservation: ReservationDTO }
  | { type: "pin"; chambre: ChambreDTO }
  | null;

export function App() {
  const [connecte, setConnecte] = useState<boolean | null>(null); // null = vérification en cours
  const [role, setRole] = useState<string | null>(null);
  const [nom, setNom] = useState<string | null>(null);
  const [vue, setVue] = useState<Vue>("calendrier");
  const [fenetreDebut, setFenetreDebut] = useState(() =>
    debutDuJour(ajouterJours(new Date(), -1)),
  );
  const [chambres, setChambres] = useState<ChambreDTO[]>([]);
  const [reservations, setReservations] = useState<ReservationDTO[]>([]);
  const [selection, setSelection] = useState<Selection>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(true);
  // T9 : badge "qui est PIN-confirmé" (persiste jusqu'à la prochaine
  // confirmation) + toast d'attribution immédiate. État local uniquement —
  // pas diffusé, visible seulement à qui est devant cet appareil.
  const [dernierePinConfirmee, setDernierePinConfirmee] = useState<{
    nom: string;
    horodatage: Date;
  } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    definirGestionnaire401(() => setConnecte(false));
    supabase.auth.getSession().then(({ data }) => setConnecte(!!data.session));
    const { data: abonnement } = supabase.auth.onAuthStateChange((_event, session) => {
      setConnecte(!!session);
      // Lève le verrouillage PIN à chaque connexion réussie (D6) et
      // récupère le rôle (pour l'onglet Équipe, gérant uniquement) et le
      // nom (pour le toast/badge de confirmation, T9).
      if (session) {
        void api
          .obtenirMoi()
          .then((moi) => {
            setRole(moi.role);
            setNom(moi.nom);
          })
          .catch(() => {});
      } else {
        setRole(null);
        setNom(null);
      }
    });
    return () => abonnement.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const minuterie = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(minuterie);
  }, [toast]);

  const charger = useCallback(async () => {
    setErreur(null);
    try {
      const fin = ajouterJours(fenetreDebut, NB_JOURS);
      const [listeChambres, listeReservations] = await Promise.all([
        api.listerChambres(),
        api.listerReservations(fenetreDebut.toISOString(), fin.toISOString()),
      ]);
      setChambres(listeChambres);
      setReservations(listeReservations);
    } catch (err) {
      setErreur(
        err instanceof Error
          ? `Impossible de charger le calendrier : ${err.message}`
          : "Impossible de charger le calendrier.",
      );
    } finally {
      setChargement(false);
    }
  }, [fenetreDebut]);

  useEffect(() => {
    if (connecte) void charger();
  }, [connecte, charger]);

  // Demande une confirmation PIN (D3/D6/D12) avant la mutation réelle —
  // identifie QUI agit sur un appareil partagé, sans logout/login complet.
  function marquerPropre(chambre: ChambreDTO) {
    setSelection({ type: "pin", chambre });
  }

  // Le PIN est vérifié par le serveur DANS ce même appel (storage.
  // changerStatutChambre) — pas via une confirmation séparée — donc un PIN
  // incorrect/verrouillé/non configuré revient ici comme un ResultatPin
  // que PinConfirm interprète pour rester ouverte et réafficher le pavé.
  async function marquerPropreConfirme(
    chambre: ChambreDTO,
    pin: string,
  ): Promise<ResultatPin> {
    try {
      await api.changerStatutChambre(chambre.id, "libre", pin);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "incorrect" || msg === "verrouille" || msg === "config_requise") {
        return msg;
      }
      setSelection(null);
      setErreur(err instanceof Error ? err.message : "Erreur inattendue");
      return "ok"; // erreur déjà affichée ; ne pas garder la modale PIN ouverte sur une erreur sans rapport au PIN
    }
    setSelection(null);
    await charger();
    // T9 : attribution immédiate (qui a confirmé son PIN pour cette
    // action) — surfacée localement avant que l'erreur n'apparaisse au
    // bilan mensuel.
    const horodatage = new Date();
    if (nom) {
      setDernierePinConfirmee({ nom, horodatage });
      setToast(
        `Chambre ${chambre.numero} marquée propre par ${nom}, ${FMT_HEURE.format(horodatage)}`,
      );
    }
    return "ok";
  }

  function fermerEtRecharger() {
    setSelection(null);
    void charger();
  }

  if (connecte === null) {
    return <div className="chargement">Chargement…</div>;
  }
  if (!connecte) {
    return <Login onConnecte={() => setConnecte(true)} />;
  }

  return (
    <>
      <header className="entete">
        <div>
          <h1>
            PMS ARYV —{" "}
            {
              {
                calendrier: "Calendrier des chambres",
                menage: "Ménage",
                equipe: "Équipe",
                journal: "Journal d'audit",
                rapports: "Rapports & Caisse",
              }[vue]
            }
          </h1>
          <span className="sous-titre">ARYV Tower · Goma</span>
          {dernierePinConfirmee && (
            <span className="badge-pin-confirme">
              PIN confirmé : {dernierePinConfirmee.nom} ·{" "}
              {FMT_HEURE.format(dernierePinConfirmee.horodatage)}
            </span>
          )}
        </div>
        <nav className="nav-vues">
          <button
            className={vue === "calendrier" ? "actif" : ""}
            onClick={() => setVue("calendrier")}
          >
            Calendrier
          </button>
          <button
            className={vue === "menage" ? "actif" : ""}
            onClick={() => setVue("menage")}
          >
            Ménage
          </button>
          {role === "gerant" && (
            <button
              className={vue === "equipe" ? "actif" : ""}
              onClick={() => setVue("equipe")}
            >
              Équipe
            </button>
          )}
          {role === "gerant" && (
            <button
              className={vue === "journal" ? "actif" : ""}
              onClick={() => setVue("journal")}
            >
              Journal
            </button>
          )}
          {role === "gerant" && (
            <button
              className={vue === "rapports" ? "actif" : ""}
              onClick={() => setVue("rapports")}
            >
              Rapports
            </button>
          )}
          <button className="btn-secondaire" onClick={() => deconnecter()}>
            Se déconnecter
          </button>
        </nav>
        {vue === "calendrier" && (
          <nav className="nav-dates">
            <button onClick={() => setFenetreDebut((d) => ajouterJours(d, -7))}>
              ◀ Semaine
            </button>
            <button
              onClick={() => setFenetreDebut(debutDuJour(ajouterJours(new Date(), -1)))}
            >
              Aujourd&apos;hui
            </button>
            <button onClick={() => setFenetreDebut((d) => ajouterJours(d, 7))}>
              Semaine ▶
            </button>
          </nav>
        )}
      </header>

      {vue === "calendrier" && (
        <div className="legende">
          {(Object.keys(STATUT_CHAMBRE) as (keyof typeof STATUT_CHAMBRE)[]).map(
            (statut) => (
              <span key={statut}>
                <span className={`pastille ${statut}`} />
                {STATUT_CHAMBRE[statut]}
              </span>
            ),
          )}
          <span>· Cliquer sur une case vide pour réserver</span>
        </div>
      )}

      {erreur && <div className="bandeau-erreur">{erreur}</div>}

      {chargement ? (
        <div className="chargement">Chargement…</div>
      ) : vue === "calendrier" ? (
        <Calendrier
          chambres={chambres}
          reservations={reservations}
          fenetreDebut={fenetreDebut}
          nbJours={NB_JOURS}
          onCreer={(chambre, jour) =>
            setSelection({ type: "creation", chambre, jour })
          }
          onOuvrir={(reservation) => setSelection({ type: "detail", reservation })}
          onMarquerPropre={marquerPropre}
        />
      ) : vue === "menage" ? (
        <Menage
          chambres={chambres}
          reservations={reservations}
          onMarquerPropre={marquerPropre}
        />
      ) : vue === "journal" ? (
        <JournalAudit />
      ) : vue === "rapports" ? (
        <Rapports />
      ) : (
        <Equipe />
      )}

      {toast && <div className="toast">{toast}</div>}

      {selection?.type === "creation" && (
        <ModalReservation
          chambre={selection.chambre}
          jour={selection.jour}
          onFermer={() => setSelection(null)}
          onCree={fermerEtRecharger}
        />
      )}
      {selection?.type === "detail" && (
        <PanneauDetail
          reservation={selection.reservation}
          chambre={chambres.find((c) => c.id === selection.reservation.chambreId)}
          onFermer={() => setSelection(null)}
          onChange={fermerEtRecharger}
        />
      )}
      {selection?.type === "pin" && (
        <PinConfirm
          titre={`Marquer chambre ${selection.chambre.numero} propre`}
          onAnnuler={() => setSelection(null)}
          onConfirme={(pin) => marquerPropreConfirme(selection.chambre, pin)}
        />
      )}
    </>
  );
}
