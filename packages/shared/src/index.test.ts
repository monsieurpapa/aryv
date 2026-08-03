import { describe, expect, it } from "vitest";
import { construireLienWhatsApp } from "./index.js";

describe("construireLienWhatsApp", () => {
  it("construit un lien wa.me avec le numéro nettoyé et le message encodé", () => {
    const lien = construireLienWhatsApp("+243 991 234 567", "Bonjour, je voudrais réserver.");
    expect(lien).toBe(
      "https://wa.me/243991234567?text=Bonjour%2C%20je%20voudrais%20r%C3%A9server.",
    );
  });

  it("retire tous les caractères non numériques du téléphone", () => {
    const lien = construireLienWhatsApp("(+243) 99-123-4567", "Test");
    expect(lien).toBe("https://wa.me/243991234567?text=Test");
  });
});
