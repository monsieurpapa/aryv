import { beforeEach, describe, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";

// Vérifie que changerStatutChambre(..., pin) refuse la mutation quand le PIN
// est invalide, et l'applique (avec audit) quand il est correct — fixé en
// eng review 2026-06-25 : avant ce changement, le PIN était vérifié par un
// appel HTTP séparé, totalement déconnecté de la mutation qu'il était censé
// autoriser (voir le commentaire de storage.changerStatutChambre).

vi.mock("postgres", () => ({ default: () => ({}) }));

let utilisateur: {
  id: string;
  pinHash: string | null;
  echecsPinConsecutifs: number;
  verrouilleJusqua: Date | null;
};
const auditInserts: unknown[] = [];
let auditLogMarker: unknown;
let utilisateursMarker: unknown;

type FakeDb = {
  query: { utilisateurs: { findFirst: () => Promise<typeof utilisateur> } };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  update: (table: unknown) => { set: (valeurs: any) => any };
  insert: (table: unknown) => { values: (values: unknown) => Promise<void> };
  transaction: (cb: (tx: FakeDb) => Promise<unknown>) => Promise<unknown>;
};

function makeFakeDb(): FakeDb {
  const fakeDb: FakeDb = {
    query: {
      utilisateurs: { findFirst: async () => ({ ...utilisateur }) },
    },
    update: (table: unknown) => {
      if (table === utilisateursMarker) {
        return {
          set: (valeurs: Partial<typeof utilisateur>) => ({
            where: async () => {
              Object.assign(utilisateur, valeurs);
            },
          }),
        };
      }
      // chambres : on ignore l'id ciblé, un seul "enregistrement" simulé suffit.
      return {
        set: ({ statut }: { statut: string }) => ({
          where: () => ({
            returning: async () => [{ id: 1, statut }],
          }),
        }),
      };
    },
    insert: (table: unknown) => ({
      values: async (values: unknown) => {
        if (table === auditLogMarker) auditInserts.push(values);
      },
    }),
    transaction: async (cb) => cb(fakeDb),
  };
  return fakeDb;
}

vi.mock("drizzle-orm/postgres-js", () => ({
  drizzle: (_client: unknown, opts: { schema: Record<string, unknown> }) => {
    auditLogMarker = opts.schema.auditLog;
    utilisateursMarker = opts.schema.utilisateurs;
    return makeFakeDb();
  },
}));

beforeEach(async () => {
  process.env.DATABASE_URL = "postgresql://fake";
  utilisateur = {
    id: "acteur-1",
    pinHash: await bcrypt.hash("1234", 4), // coût réduit — vitesse des tests, sans affecter compare()
    echecsPinConsecutifs: 0,
    verrouilleJusqua: null,
  };
  auditInserts.length = 0;
  vi.resetModules();
});

describe("changerStatutChambre(..., pin) — vérification dans le même appel (D3)", () => {
  it("applique la mutation et l'audite quand le PIN est correct", async () => {
    const { storage } = await import("./storage.js");

    const chambre = await storage.changerStatutChambre(1, "libre", "acteur-1", "1234");

    expect(chambre).toMatchObject({ statut: "libre" });
    expect(auditInserts).toHaveLength(1);
  });

  it("lève PinInvalide et n'applique PAS la mutation quand le PIN est faux", async () => {
    const { storage, PinInvalide } = await import("./storage.js");

    await expect(
      storage.changerStatutChambre(1, "libre", "acteur-1", "0000"),
    ).rejects.toThrow(PinInvalide);
    expect(auditInserts).toHaveLength(0);
  });

  it("lève PinInvalide(verrouille) après 3 échecs consécutifs", async () => {
    const { storage } = await import("./storage.js");

    await storage.changerStatutChambre(1, "libre", "acteur-1", "0000").catch(() => {});
    await storage.changerStatutChambre(1, "libre", "acteur-1", "0000").catch(() => {});

    await expect(
      storage.changerStatutChambre(1, "libre", "acteur-1", "0000"),
    ).rejects.toMatchObject({ resultat: "verrouille" });
  });

  it("sans pin fourni : comportement inchangé, mutation appliquée sans vérification (D16, legacy)", async () => {
    const { storage } = await import("./storage.js");

    const chambre = await storage.changerStatutChambre(1, "libre", "acteur-1");

    expect(chambre).toMatchObject({ statut: "libre" });
    expect(auditInserts).toHaveLength(1);
  });
});
