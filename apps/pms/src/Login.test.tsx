import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Login } from "./Login";

const connecter = vi.fn();
vi.mock("./auth", () => ({ connecter: (...args: unknown[]) => connecter(...args) }));

describe("Login", () => {
  it("appelle onConnecte après une connexion réussie", async () => {
    connecter.mockResolvedValue(undefined);
    const onConnecte = vi.fn();
    render(<Login onConnecte={onConnecte} />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "gerant@aryv.cd" },
    });
    fireEvent.change(screen.getByLabelText("Mot de passe"), {
      target: { value: "secret" },
    });
    fireEvent.click(screen.getByText("Se connecter"));

    await waitFor(() => expect(onConnecte).toHaveBeenCalledOnce());
  });

  it("affiche un message d'erreur clair sur mot de passe incorrect", async () => {
    connecter.mockRejectedValue(new Error("Invalid login credentials"));
    const onConnecte = vi.fn();
    render(<Login onConnecte={onConnecte} />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "gerant@aryv.cd" },
    });
    fireEvent.change(screen.getByLabelText("Mot de passe"), {
      target: { value: "mauvais" },
    });
    fireEvent.click(screen.getByText("Se connecter"));

    await waitFor(() =>
      expect(screen.getByText("Email ou mot de passe incorrect.")).toBeTruthy(),
    );
    expect(onConnecte).not.toHaveBeenCalled();
  });
});
