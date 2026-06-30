import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { Rapports } from "./Rapports";

const listerRapport = vi.fn();
vi.mock("./api", () => ({
  api: {
    listerRapport: (...args: unknown[]) => listerRapport(...args),
  },
}));

const rapportVide = {
  totalEncaisse: "0.00",
  totalAttendu: "0.00",
  parEtage: [],
  lignes: [],
};

const rapportAvecLignes = {
  totalEncaisse: "45.00",
  totalAttendu: "90.00",
  parEtage: [
    { etage: 1, montant: "45.00", nb: 1 },
    { etage: 2, montant: "45.00", nb: 1 },
  ],
  lignes: [
    {
      id: 1,
      chambre: { numero: "101", etage: 1 },
      client: { telephone: "+243991234567", nom: "Marie Dupont" },
      typeSejour: "nuitee" as const,
      statut: "terminee" as const,
      arrivee: "2026-06-28T14:00:00.000Z",
      depart: "2026-06-29T11:00:00.000Z",
      montant: "45.00",
      refPaiement: "MP-123456",
    },
    {
      id: 2,
      chambre: { numero: "201", etage: 2 },
      client: { telephone: "+243997654321", nom: null },
      typeSejour: "repos" as const,
      statut: "en_cours" as const,
      arrivee: "2026-06-30T09:00:00.000Z",
      depart: "2026-06-30T17:00:00.000Z",
      montant: "45.00",
      refPaiement: null,
    },
  ],
};

describe("Rapports", () => {
  it("affiche les cartes de synthèse et le tableau de détail", async () => {
    listerRapport.mockResolvedValue(rapportAvecLignes);

    render(<Rapports />);

    await waitFor(() => expect(screen.getByText("Marie Dupont")).toBeTruthy());
    expect(screen.getByText("Étage 1")).toBeTruthy();
    expect(screen.getByText("Étage 2")).toBeTruthy();
    expect(screen.getByText("Nuitée")).toBeTruthy();
    expect(screen.getByText("MP-123456")).toBeTruthy();
  });

  it("affiche un message quand la période est vide", async () => {
    listerRapport.mockResolvedValue(rapportVide);

    render(<Rapports />);

    await waitFor(() =>
      expect(screen.getByText("Aucun séjour sur cette période.")).toBeTruthy(),
    );
  });

  it("affiche le décompte de séjours dans la carte de synthèse", async () => {
    listerRapport.mockResolvedValue(rapportAvecLignes);

    render(<Rapports />);

    // La carte affiche "2" (lignes.length) et "Séjours" dans deux spans distincts.
    // getAllByText évite l'ambiguïté avec l'en-tête "Séjours" du tableau par étage.
    await waitFor(() => expect(screen.getByText("2")).toBeTruthy());
    expect(screen.getAllByText(/Séjours/).length).toBeGreaterThan(0);
  });
});
