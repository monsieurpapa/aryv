import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { ChambreDTO } from "@aryv/shared";
import { App } from "./App";

const rechercherChambres = vi.fn();
const creerReservation = vi.fn();
const obtenirTarifs = vi.fn();
const obtenirConfig = vi.fn();
vi.mock("./api", () => ({
  rechercherChambres: (...args: unknown[]) => rechercherChambres(...args),
  creerReservation: (...args: unknown[]) => creerReservation(...args),
  obtenirTarifs: (...args: unknown[]) => obtenirTarifs(...args),
  obtenirConfig: (...args: unknown[]) => obtenirConfig(...args),
}));

const chambre: ChambreDTO = {
  id: 1,
  numero: "101",
  etage: 1,
  type: "grande",
  statut: "libre",
  tarifNuitee: "50.00",
  tarifRepos: "25.00",
};

beforeEach(() => {
  rechercherChambres.mockReset();
  creerReservation.mockReset();
  obtenirTarifs.mockReset().mockResolvedValue({ majorationWeekendPct: 0 });
  obtenirConfig.mockReset().mockResolvedValue({ whatsappPhone: "+243991234567" });
});

function remplirDates(debut: string, fin: string) {
  fireEvent.change(screen.getByLabelText("Arrivée"), { target: { value: debut } });
  fireEvent.change(screen.getByLabelText("Départ"), { target: { value: fin } });
}

async function avancerVersSelection() {
  render(<App />);
  remplirDates("2026-08-10", "2026-08-12");
  fireEvent.click(screen.getByText("Voir les chambres disponibles"));
  await waitFor(() =>
    expect(screen.getByRole("heading", { level: 2, name: /disponible/ })).toBeTruthy(),
  );
}

describe("EtapeIndicateur", () => {
  it("marque l'étape courante avec aria-current=step et les étapes précédentes comme complétées", async () => {
    rechercherChambres.mockResolvedValue([chambre]);
    await avancerVersSelection();

    const etapes = screen.getAllByRole("listitem");
    const recherche = etapes.find((li) => li.textContent?.includes("Recherche"))!;
    const selection = etapes.find((li) => li.textContent?.includes("Chambre"))!;
    const paiement = etapes.find((li) => li.textContent?.includes("Paiement"))!;

    expect(recherche.className).toContain("etape-complete");
    expect(recherche.getAttribute("aria-current")).toBeNull();

    expect(selection.className).toContain("etape-actif");
    expect(selection.getAttribute("aria-current")).toBe("step");

    expect(paiement.className).toContain("etape-a-venir");
    expect(paiement.getAttribute("aria-current")).toBeNull();
  });
});

describe("Gestion du focus lors du changement d'étape", () => {
  it("ne vole pas le focus au premier rendu", async () => {
    render(<App />);
    await waitFor(() => expect(obtenirConfig).toHaveBeenCalled());
    const contenu = document.querySelector(".etape-contenu");
    expect(document.activeElement).not.toBe(contenu);
  });

  it("déplace le focus sur le contenu de l'étape lors d'une transition", async () => {
    rechercherChambres.mockResolvedValue([chambre]);
    await avancerVersSelection();

    await waitFor(() => {
      expect(document.activeElement).toBe(document.querySelector(".etape-contenu"));
    });
  });
});

describe("chercher() — validation", () => {
  it("exige une date d'arrivée", async () => {
    render(<App />);
    fireEvent.click(screen.getByText("Voir les chambres disponibles"));

    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toBe("Sélectionnez une date d'arrivée"),
    );
    expect(rechercherChambres).not.toHaveBeenCalled();
  });

  it("exige une date de départ pour une nuitée", async () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText("Arrivée"), { target: { value: "2026-08-10" } });
    fireEvent.click(screen.getByText("Voir les chambres disponibles"));

    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toBe("Sélectionnez une date de départ"),
    );
    expect(rechercherChambres).not.toHaveBeenCalled();
  });

  it("rejette un départ antérieur ou égal à l'arrivée", async () => {
    render(<App />);
    remplirDates("2026-08-10", "2026-08-10");
    fireEvent.click(screen.getByText("Voir les chambres disponibles"));

    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toBe(
        "La date de départ doit être après l'arrivée",
      ),
    );
    expect(rechercherChambres).not.toHaveBeenCalled();
  });
});

describe("Lien WhatsApp (EtapeRecherche)", () => {
  it("n'affiche pas le lien tant que le numéro WhatsApp n'est pas chargé", () => {
    obtenirConfig.mockResolvedValue({ whatsappPhone: null });
    render(<App />);
    expect(screen.queryByText("Réserver via WhatsApp")).toBeNull();
  });

  it("affiche un message générique avant toute saisie de dates", async () => {
    render(<App />);
    const lien = await screen.findByText("Réserver via WhatsApp");
    expect(lien.getAttribute("href")).toBe(
      "https://wa.me/243991234567?text=" +
        encodeURIComponent("Bonjour, je voudrais réserver une chambre à ARYV Tower."),
    );
  });

  it("reprend les dates saisies dans le message pré-rempli", async () => {
    render(<App />);
    remplirDates("2026-08-10", "2026-08-12");

    const lien = await screen.findByText("Réserver via WhatsApp");
    await waitFor(() =>
      expect(lien.getAttribute("href")).toBe(
        "https://wa.me/243991234567?text=" +
          encodeURIComponent(
            "Bonjour, je voudrais réserver une chambre à ARYV Tower du 2026-08-10 au 2026-08-12 (nuitée).",
          ),
      ),
    );
  });
});

describe("EtapeSelection — état vide", () => {
  it("affiche un message quand aucune chambre n'est disponible", async () => {
    rechercherChambres.mockResolvedValue([]);
    render(<App />);
    remplirDates("2026-08-10", "2026-08-12");
    fireEvent.click(screen.getByText("Voir les chambres disponibles"));

    await waitFor(() =>
      expect(screen.getByText("Aucune chambre disponible")).toBeTruthy(),
    );
    expect(screen.getByText("← Modifier les dates")).toBeTruthy();
  });
});
