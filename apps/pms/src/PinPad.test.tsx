import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PinPad } from "./PinPad";

function appuyer(touche: string) {
  fireEvent.click(screen.getByText(touche, { selector: "button" }));
}

describe("PinPad", () => {
  it("appelle onComplete avec les 4 chiffres saisis, et seulement au 4e", () => {
    const onComplete = vi.fn();
    render(<PinPad onComplete={onComplete} />);

    appuyer("1");
    appuyer("2");
    appuyer("3");
    expect(onComplete).not.toHaveBeenCalled();

    appuyer("4");
    expect(onComplete).toHaveBeenCalledOnce();
    expect(onComplete).toHaveBeenCalledWith("1234");
  });

  it("ignore les appuis au-delà du 4e chiffre", () => {
    const onComplete = vi.fn();
    render(<PinPad onComplete={onComplete} />);

    appuyer("1");
    appuyer("2");
    appuyer("3");
    appuyer("4");
    appuyer("5"); // ignoré : déjà à 4 chiffres

    expect(onComplete).toHaveBeenCalledOnce();
    expect(onComplete).toHaveBeenCalledWith("1234");
  });

  it("efface le dernier chiffre saisi", () => {
    const onComplete = vi.fn();
    render(<PinPad onComplete={onComplete} />);

    appuyer("1");
    appuyer("2");
    appuyer("3");
    fireEvent.click(screen.getByLabelText("Effacer le dernier chiffre"));
    appuyer("9");
    appuyer("4");

    expect(onComplete).toHaveBeenCalledWith("1294");
  });

  it("n'accepte aucune saisie quand disabled", () => {
    const onComplete = vi.fn();
    render(<PinPad onComplete={onComplete} disabled />);

    appuyer("1");
    appuyer("2");
    appuyer("3");
    appuyer("4");

    expect(onComplete).not.toHaveBeenCalled();
  });
});
