import { useState } from "react";
import type { ChambreDTO, ReservationDTO, StatutReservation } from "@aryv/shared";
import { formaterMontant } from "@aryv/shared";
import { api } from "./api";
import { ACTIONS, STATUT_RESERVATION, TYPE_SEJOUR } from "./etiquettes";

const FMT = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

interface Props {
  reservation: ReservationDTO;
  chambre: ChambreDTO | undefined;
  onFermer: () => void;
  onChange: () => void;
}

export function PanneauDetail({ reservation, chambre, onFermer, onChange }: Props) {
  const [erreur, setErreur] = useState<string | null>(null);
  const [actionEnCours, setActionEnCours] = useState(false);

  async function appliquer(statut: StatutReservation) {
    setErreur(null);
    setActionEnCours(true);
    try {
      await api.changerStatutReservation(reservation.id, statut);
      onChange();
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Erreur inattendue");
      setActionEnCours(false);
    }
  }

  return (
    <div className="voile" onClick={onFermer}>
      <div className="modale detail" onClick={(e) => e.stopPropagation()}>
        <h2>
          Chambre {chambre?.numero ?? reservation.chambreId}{" "}
          <span className={`badge ${reservation.statut}`}>
            {STATUT_RESERVATION[reservation.statut]}
          </span>
        </h2>

        <dl>
          <dt>Client</dt>
          <dd>{reservation.client.nom ?? "—"}</dd>
          <dt>Téléphone</dt>
          <dd>{reservation.client.telephone}</dd>
          <dt>Séjour</dt>
          <dd>{TYPE_SEJOUR[reservation.typeSejour]}</dd>
          <dt>Arrivée</dt>
          <dd>{FMT.format(new Date(reservation.arrivee))}</dd>
          <dt>Départ</dt>
          <dd>{FMT.format(new Date(reservation.depart))}</dd>
          <dt>Montant</dt>
          <dd>{formaterMontant(reservation.montant)}</dd>
          <dt>Réf. paiement</dt>
          <dd>{reservation.refPaiement ?? "—"}</dd>
        </dl>

        {erreur && <p className="erreur-formulaire">{erreur}</p>}

        <div className="boutons">
          <button className="btn-secondaire" onClick={onFermer}>
            Fermer
          </button>
          {ACTIONS[reservation.statut].map((action) => (
            <button
              key={action.statut}
              className={action.classe}
              disabled={actionEnCours}
              onClick={() => appliquer(action.statut)}
            >
              {action.libelle}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
