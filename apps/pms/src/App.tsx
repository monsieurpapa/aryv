import { useCallback, useEffect, useState } from "react";
import type { ChambreDTO, ReservationDTO } from "@aryv/shared";
import { api } from "./api";
import { ajouterJours, debutDuJour } from "./dates";
import { Calendrier } from "./Calendrier";
import { Menage } from "./Menage";
import { ModalReservation } from "./ModalReservation";
import { PanneauDetail } from "./PanneauDetail";
import { STATUT_CHAMBRE } from "./etiquettes";

const NB_JOURS = 14;

type Vue = "calendrier" | "menage";

type Selection =
  | { type: "creation"; chambre: ChambreDTO; jour: string }
  | { type: "detail"; reservation: ReservationDTO }
  | null;

export function App() {
  const [vue, setVue] = useState<Vue>("calendrier");
  const [fenetreDebut, setFenetreDebut] = useState(() =>
    debutDuJour(ajouterJours(new Date(), -1)),
  );
  const [chambres, setChambres] = useState<ChambreDTO[]>([]);
  const [reservations, setReservations] = useState<ReservationDTO[]>([]);
  const [selection, setSelection] = useState<Selection>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(true);

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
    void charger();
  }, [charger]);

  async function marquerPropre(chambre: ChambreDTO) {
    try {
      await api.changerStatutChambre(chambre.id, "libre");
      await charger();
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Erreur inattendue");
    }
  }

  function fermerEtRecharger() {
    setSelection(null);
    void charger();
  }

  return (
    <>
      <header className="entete">
        <div>
          <h1>
            PMS ARYV — {vue === "calendrier" ? "Calendrier des chambres" : "Ménage"}
          </h1>
          <span className="sous-titre">ARYV Tower · Goma</span>
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
      ) : (
        <Menage
          chambres={chambres}
          reservations={reservations}
          onMarquerPropre={marquerPropre}
        />
      )}

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
    </>
  );
}
