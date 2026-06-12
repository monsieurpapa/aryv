import type { ChambreDTO, ReservationDTO } from "@aryv/shared";
import { ajouterJours, cleJour, joursCouverts, libelleJour } from "./dates";
import { STATUT_CHAMBRE, TYPE_SEJOUR } from "./etiquettes";

interface Props {
  chambres: ChambreDTO[];
  reservations: ReservationDTO[];
  fenetreDebut: Date;
  nbJours: number;
  onCreer: (chambre: ChambreDTO, jour: string) => void;
  onOuvrir: (reservation: ReservationDTO) => void;
  onMarquerPropre: (chambre: ChambreDTO) => void;
}

export function Calendrier({
  chambres,
  reservations,
  fenetreDebut,
  nbJours,
  onCreer,
  onOuvrir,
  onMarquerPropre,
}: Props) {
  const jours = Array.from({ length: nbJours }, (_, i) =>
    ajouterJours(fenetreDebut, i),
  );
  const aujourdhui = cleJour(new Date());

  // chambreId → (jour YYYY-MM-DD → réservation)
  const occupation = new Map<number, Map<string, ReservationDTO>>();
  for (const r of reservations) {
    let parJour = occupation.get(r.chambreId);
    if (!parJour) {
      parJour = new Map();
      occupation.set(r.chambreId, parJour);
    }
    for (const jour of joursCouverts(r.arrivee, r.depart)) {
      parJour.set(jour, r);
    }
  }

  const etages = [...new Set(chambres.map((c) => c.etage))].sort();

  return (
    <div className="calendrier">
      <div
        className="grille"
        style={{ gridTemplateColumns: `150px repeat(${nbJours}, 1fr)` }}
      >
        <div className="cellule cellule-entete" />
        {jours.map((j) => {
          const { semaine, date } = libelleJour(j);
          return (
            <div
              key={cleJour(j)}
              className={`cellule cellule-entete${cleJour(j) === aujourdhui ? " aujourdhui" : ""}`}
            >
              {semaine}
              <br />
              <span className="num">{date}</span>
            </div>
          );
        })}

        {etages.map((etage) => (
          <Etage
            key={etage}
            etage={etage}
            chambres={chambres.filter((c) => c.etage === etage)}
            jours={jours}
            aujourdhui={aujourdhui}
            occupation={occupation}
            onCreer={onCreer}
            onOuvrir={onOuvrir}
            onMarquerPropre={onMarquerPropre}
          />
        ))}
      </div>
    </div>
  );
}

function Etage({
  etage,
  chambres,
  jours,
  aujourdhui,
  occupation,
  onCreer,
  onOuvrir,
  onMarquerPropre,
}: {
  etage: number;
  chambres: ChambreDTO[];
  jours: Date[];
  aujourdhui: string;
  occupation: Map<number, Map<string, ReservationDTO>>;
  onCreer: Props["onCreer"];
  onOuvrir: Props["onOuvrir"];
  onMarquerPropre: Props["onMarquerPropre"];
}) {
  return (
    <>
      <div className="ligne-etage">Étage {etage}</div>
      {chambres.map((chambre) => {
        const parJour = occupation.get(chambre.id);
        return (
          <RangeeChambre
            key={chambre.id}
            chambre={chambre}
            jours={jours}
            aujourdhui={aujourdhui}
            parJour={parJour}
            onCreer={onCreer}
            onOuvrir={onOuvrir}
            onMarquerPropre={onMarquerPropre}
          />
        );
      })}
    </>
  );
}

function RangeeChambre({
  chambre,
  jours,
  aujourdhui,
  parJour,
  onCreer,
  onOuvrir,
  onMarquerPropre,
}: {
  chambre: ChambreDTO;
  jours: Date[];
  aujourdhui: string;
  parJour: Map<string, ReservationDTO> | undefined;
  onCreer: Props["onCreer"];
  onOuvrir: Props["onOuvrir"];
  onMarquerPropre: Props["onMarquerPropre"];
}) {
  return (
    <>
      <div className="cellule cellule-chambre">
        <span
          className={`pastille ${chambre.statut}`}
          title={STATUT_CHAMBRE[chambre.statut]}
        />
        <span className="numero">{chambre.numero}</span>
        <span className="type">{chambre.type === "grande" ? "Grande" : "Petite"}</span>
        {chambre.statut === "a_nettoyer" && (
          <button
            className="btn-propre"
            onClick={() => onMarquerPropre(chambre)}
            title="Marquer la chambre comme propre"
          >
            Propre ✓
          </button>
        )}
      </div>
      {jours.map((j, i) => {
        const cle = cleJour(j);
        const reservation = parJour?.get(cle);
        if (!reservation) {
          return (
            <div
              key={cle}
              className={`cellule cellule-jour${cle === aujourdhui ? " aujourdhui" : ""}`}
              onClick={() => onCreer(chambre, cle)}
              title={`Réserver la ${chambre.numero} le ${cle}`}
            />
          );
        }
        const jourPrecedent = i > 0 ? cleJour(jours[i - 1]) : null;
        const continuation =
          jourPrecedent !== null && parJour?.get(jourPrecedent)?.id === reservation.id;
        return (
          <div
            key={cle}
            className={`cellule${cle === aujourdhui ? " aujourdhui" : ""}`}
          >
            <div
              className={`barre ${reservation.statut}${continuation ? " suite" : ""}`}
              onClick={() => onOuvrir(reservation)}
              title={`${reservation.client.nom ?? reservation.client.telephone} — ${TYPE_SEJOUR[reservation.typeSejour]}`}
            >
              {!continuation &&
                (reservation.typeSejour === "repos" ? "☀ " : "") +
                  (reservation.client.nom ?? reservation.client.telephone)}
            </div>
          </div>
        );
      })}
    </>
  );
}
