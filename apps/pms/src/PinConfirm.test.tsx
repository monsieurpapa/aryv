import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PinConfirm } from "./PinConfirm";

const definirPin = vi.fn();
vi.mock("./api", () => ({
  api: {
    definirPin: (...args: unknown[]) => definirPin(...args),
  },
}));

/** Simule la saisie au pavé numérique (PinPad) : 4 appuis, auto-validé au 4e. */
function taperPin(valeur: string) {
  for (const chiffre of valeur) {
    fireEvent.click(screen.getByText(chiffre, { selector: "button" }));
  }
}

describe("PinConfirm", () => {
  beforeEach(() => {
    definirPin.mockClear();
  });

  it("appelle onConfirme avec le code saisi", async () => {
    const onConfirme = vi.fn().mockResolvedValue("ok");
    render(<PinConfirm titre="Test" onConfirme={onConfirme} onAnnuler={vi.fn()} />);

    taperPin("1234");

    await waitFor(() => expect(onConfirme).toHaveBeenCalledWith("1234"));
  });

  it("affiche 'Code incorrect' quand onConfirme renvoie incorrect", async () => {
    const onConfirme = vi.fn().mockResolvedValue("incorrect");
    render(<PinConfirm titre="Test" onConfirme={onConfirme} onAnnuler={vi.fn()} />);

    taperPin("0000");

    await waitFor(() => expect(screen.getByText("Code incorrect")).toBeTruthy());
  });

  it("passe à la configuration (D12) : deux saisies identiques enregistrent le PIN", async () => {
    const onConfirme = vi.fn().mockResolvedValueOnce("config_requise").mockResolvedValueOnce("ok");
    definirPin.mockResolvedValue(undefined);
    render(<PinConfirm titre="Test" onConfirme={onConfirme} onAnnuler={vi.fn()} />);

    taperPin("1234");

    await waitFor(() =>
      expect(screen.getByText(/Première utilisation/)).toBeTruthy(),
    );

    taperPin("5678");

    await waitFor(() => expect(screen.getByText(/Confirmez/)).toBeTruthy());

    taperPin("5678");

    await waitFor(() => expect(definirPin).toHaveBeenCalledWith("5678"));
    await waitFor(() => expect(onConfirme).toHaveBeenLastCalledWith("5678"));
  });

  it("redemande le code quand les deux saisies ne correspondent pas (D12)", async () => {
    const onConfirme = vi.fn().mockResolvedValueOnce("config_requise");
    definirPin.mockResolvedValue(undefined);
    render(<PinConfirm titre="Test" onConfirme={onConfirme} onAnnuler={vi.fn()} />);

    taperPin("1234");

    await waitFor(() => expect(screen.getByText(/Première utilisation/)).toBeTruthy());

    taperPin("5678");

    await waitFor(() => expect(screen.getByText(/Confirmez/)).toBeTruthy());

    taperPin("9999");

    await waitFor(() =>
      expect(screen.getByText(/Les codes ne correspondent pas/)).toBeTruthy(),
    );
    // Revient à l'étape "configurer"
    expect(screen.getByText(/Première utilisation/)).toBeTruthy();
    expect(definirPin).not.toHaveBeenCalled();
  });

  it("affiche le message de verrouillage sans pavé numérique (D6)", async () => {
    const onConfirme = vi.fn().mockResolvedValue("verrouille");
    render(<PinConfirm titre="Test" onConfirme={onConfirme} onAnnuler={vi.fn()} />);

    taperPin("0000");

    await waitFor(() =>
      expect(screen.getByText(/Compte verrouillé/)).toBeTruthy(),
    );
    expect(screen.queryByText("1", { selector: "button" })).toBeNull();
  });
});
