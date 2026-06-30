import { beforeEach, describe, expect, it, vi } from "vitest";

// Magasin en mémoire d'une seule ligne utilisateurs, mutée par les appels
// update()/set()/where() du faux client Drizzle ci-dessous — suffisant
// pour tester NOTRE logique de verrouillage/hashage (confirmerPin,
// definirPin), sans dépendre d'une vraie connexion Postgres.
let utilisateur: {
  id: string;
  nom: string;
  role: string;
  pinHash: string | null;
  echecsPinConsecutifs: number;
  verrouilleJusqua: Date | null;
};

vi.mock("postgres", () => ({ default: () => ({}) }));

vi.mock("drizzle-orm/postgres-js", () => ({
  drizzle: () => ({
    query: {
      utilisateurs: {
        findFirst: async () => ({ ...utilisateur }),
      },
    },
    update: () => ({
      set: (valeurs: Partial<typeof utilisateur>) => ({
        where: async () => {
          Object.assign(utilisateur, valeurs);
        },
      }),
    }),
  }),
}));

beforeEach(() => {
  process.env.DATABASE_URL = "postgresql://fake";
  utilisateur = {
    id: "u1",
    nom: "Aline",
    role: "menage",
    pinHash: null,
    echecsPinConsecutifs: 0,
    verrouilleJusqua: null,
  };
  vi.resetModules();
});

describe("confirmerPin (D6/D12)", () => {
  it("renvoie config_requise quand aucun PIN n'a jamais été défini", async () => {
    const { storage } = await import("./storage.js");
    expect(await storage.confirmerPin("u1", "1234")).toBe("config_requise");
  });

  it("définirPin puis confirmerPin avec le bon code renvoie ok", async () => {
    const { storage } = await import("./storage.js");
    await storage.definirPin("u1", "1234");
    expect(await storage.confirmerPin("u1", "1234")).toBe("ok");
  });

  it("code incorrect renvoie incorrect et incrémente le compteur d'échecs", async () => {
    const { storage } = await import("./storage.js");
    await storage.definirPin("u1", "1234");
    expect(await storage.confirmerPin("u1", "0000")).toBe("incorrect");
    expect(utilisateur.echecsPinConsecutifs).toBe(1);
  });

  it("verrouille après 3 échecs consécutifs", async () => {
    const { storage } = await import("./storage.js");
    await storage.definirPin("u1", "1234");
    await storage.confirmerPin("u1", "0000");
    await storage.confirmerPin("u1", "0000");
    const resultat = await storage.confirmerPin("u1", "0000");
    expect(resultat).toBe("verrouille");
    expect(utilisateur.verrouilleJusqua).not.toBeNull();
  });

  it("un compte verrouillé refuse même le bon code", async () => {
    const { storage } = await import("./storage.js");
    await storage.definirPin("u1", "1234");
    utilisateur.verrouilleJusqua = new Date(Date.now() + 60_000);
    expect(await storage.confirmerPin("u1", "1234")).toBe("verrouille");
  });

  it("reinitialiserVerrouillagePin lève le verrouillage (reset au login, D6)", async () => {
    const { storage } = await import("./storage.js");
    utilisateur.echecsPinConsecutifs = 3;
    utilisateur.verrouilleJusqua = new Date(Date.now() + 60_000);
    await storage.reinitialiserVerrouillagePin("u1");
    expect(utilisateur.echecsPinConsecutifs).toBe(0);
    expect(utilisateur.verrouilleJusqua).toBeNull();
  });
});
