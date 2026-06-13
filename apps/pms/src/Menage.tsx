import { useEffect, useState } from "react";
import type { ChambreDTO, ReservationDTO } from "@aryv/shared";
import { cleJour, debutDuJour } from "./dates";
import { STATUT_CHAMBRE } from "./etiquettes";

interface Props {
  chambres: ChambreDTO[];
  reservations: ReservationDTO[];
  onMarquerPropre: (chambre: ChambreDTO) => void;
}

/**
 * Tableau de ménage — vue plein écran pensée pour un téléphone Android :
 * grosses cartes par étage, bouton « Propre » à deux appuis (anti-fausse manip),
 * et signal « Départ aujourd'hui » sur les chambres occupées qui se libèrent.
 */
export function Menage({ chambres, reservations, onMarquerPropre }: Props) {
  const aujourdhui = cleJour(new Date());

  // chambreId → la chambre se libère aujourd'hui (check-out attendu)
  const departsDuJour = new Set<number>();
  for (const r of reservations) {
    if (r.statut !== "en_cours") continue;
    if (cleJour(debutDuJour(new Date(r.depart))) === aujourdhui) {
      departsDuJour.add(r.chambreId);
    }
  }

  const aNettoyer = chambres.filter((c) => c.statut === "a_nettoyer");
  const etages = [...new Set(chambres.map((c) => c.etage))].sort();

  return (
    <div className="menage">
      <div
        className={`menage-resume${aNettoyer.length === 0 ? " tout-propre" : ""}`}
      >
        {aNettoyer.length === 0
          ? "Tout est propre ✨"
          : `${aNettoyer.length} chambre${aNettoyer.length > 1 ? "s" : ""} à nettoyer`}
      </div>

      {etages.map((etage) => (
        <section key={etage} className="menage-etage">
          <h2>Étage {etage}</h2>
          <div className="menage-cartes">
            {chambres
              .filter((c) => c.etage === etage)
              .map((chambre) => (
                <CarteChambre
                  key={chambre.id}
                  chambre={chambre}
                  departAujourdhui={departsDuJour.has(chambre.id)}
                  onMarquerPropre={onMarquerPropre}
                />
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function CarteChambre({
  chambre,
  departAujourdhui,
  onMarquerPropre,
}: {
  chambre: ChambreDTO;
  departAujourdhui: boolean;
  onMarquerPropre: Props["onMarquerPropre"];
}) {
  // Premier appui : demande confirmation ; second appui : marque propre.
  // La confirmation expire toute seule pour éviter un état bloqué.
  const [confirmation, setConfirmation] = useState(false);

  useEffect(() => {
    if (!confirmation) return;
    const minuterie = setTimeout(() => setConfirmation(false), 4000);
    return () => clearTimeout(minuterie);
  }, [confirmation]);

  return (
    <div className={`carte-chambre ${chambre.statut}`}>
      <div className="carte-tete">
        <span className="numero">{chambre.numero}</span>
        <span className="type">
          {chambre.type === "grande" ? "Grande" : "Petite"}
        </span>
      </div>
      <span className={`badge-statut ${chambre.statut}`}>
        {STATUT_CHAMBRE[chambre.statut]}
      </span>
      {departAujourdhui && chambre.statut === "occupee" && (
        <span className="badge-depart">Départ aujourd&apos;hui</span>
      )}
      {chambre.statut === "a_nettoyer" && (
        <button
          className={`btn-propre-grand${confirmation ? " confirmer" : ""}`}
          onClick={() => {
            if (confirmation) {
              setConfirmation(false);
              onMarquerPropre(chambre);
            } else {
              setConfirmation(true);
            }
          }}
        >
          {confirmation ? "Confirmer ?" : "Propre ✓"}
        </button>
      )}
    </div>
  );
}
