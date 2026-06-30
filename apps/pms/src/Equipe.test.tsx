import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { Equipe } from "./Equipe";

const listerUtilisateurs = vi.fn();
const inviterUtilisateur = vi.fn();
vi.mock("./api", () => ({
  api: {
    listerUtilisateurs: (...args: unknown[]) => listerUtilisateurs(...args),
    inviterUtilisateur: (...args: unknown[]) => inviterUtilisateur(...args),
  },
}));

beforeEach(() => {
  listerUtilisateurs.mockReset();
  inviterUtilisateur.mockReset();
});

describe("Equipe", () => {
  it("affiche le trombinoscope des membres existants", async () => {
    listerUtilisateurs.mockResolvedValue([
      { id: "1", nom: "Aline", role: "menage", creeLe: "2026-01-01T00:00:00.000Z" },
    ]);

    render(<Equipe />);

    await waitFor(() => expect(screen.getByText("Aline")).toBeTruthy());
    expect(within(screen.getByRole("table")).getByText("Ménage")).toBeTruthy();
  });

  it("recharge le trombinoscope après une invitation réussie", async () => {
    listerUtilisateurs
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { id: "2", nom: "X", role: "reception", creeLe: "2026-06-24T00:00:00.000Z" },
      ]);
    inviterUtilisateur.mockResolvedValue({ id: "2", nom: "X", role: "reception" });

    render(<Equipe />);
    await waitFor(() => expect(listerUtilisateurs).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByLabelText("Nom"), { target: { value: "X" } });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "x@aryv.cd" },
    });
    fireEvent.click(screen.getByText("Inviter"));

    await waitFor(() => expect(listerUtilisateurs).toHaveBeenCalledTimes(2));
    expect(screen.getByText("X")).toBeTruthy();
  });

  it("affiche une erreur claire quand le trombinoscope ne charge pas, sans planter", async () => {
    listerUtilisateurs.mockRejectedValue(new Error("Erreur 500"));

    render(<Equipe />);

    await waitFor(() => expect(screen.getByText("Erreur 500")).toBeTruthy());
  });

  it("ne signale pas l'invitation comme échouée si seul le rechargement du trombinoscope échoue", async () => {
    listerUtilisateurs
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce(new Error("Erreur 500"));
    inviterUtilisateur.mockResolvedValue({ id: "2", nom: "X", role: "reception" });

    render(<Equipe />);
    await waitFor(() => expect(listerUtilisateurs).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByLabelText("Nom"), { target: { value: "X" } });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "x@aryv.cd" },
    });
    fireEvent.click(screen.getByText("Inviter"));

    await waitFor(() =>
      expect(screen.getByText("Invitation envoyée à x@aryv.cd.")).toBeTruthy(),
    );
    expect(screen.getByText("Erreur 500")).toBeTruthy();
  });
});
