import { beforeEach, describe, expect, it, vi } from "vitest";

// On simule postgres()/drizzle() pour tester NOTRE logique de transaction
// (audit + mutation atomiques) sans dépendre d'une vraie connexion Postgres.
// Ce qu'on vérifie n'est pas le comportement de Drizzle (on lui fait
// confiance), mais que notre wrapper : (1) ignore l'audit quand acteurId
// est absent (comportement legacy inchangé, D16), et (2) propage l'échec
// de l'insertion d'audit pour que la transaction entière échoue (D9 —
// fail-closed, retrouvé en eng review pour l'effet de bord chambres).

vi.mock("postgres", () => ({ default: () => ({}) }));

const inserts: Array<{ table: unknown; values: unknown }> = [];
let auditShouldFail = false;

function fakeChain(table: unknown, returningRow: unknown) {
  return {
    set: () => ({
      where: () => ({
        returning: async () => [returningRow],
      }),
    }),
    values: (values: unknown) => {
      if (table === "audit_log") {
        inserts.push({ table, values });
        if (auditShouldFail) throw new Error("audit insert failed");
        return Promise.resolve();
      }
      return {
        returning: async () => [returningRow],
      };
    },
  };
}

type FakeDb = {
  update: (table: unknown) => ReturnType<typeof fakeChain>;
  insert: (table: unknown) => ReturnType<typeof fakeChain>;
  transaction: (cb: (tx: FakeDb) => Promise<unknown>) => Promise<unknown>;
};

function makeFakeDb(returningRow: unknown): FakeDb {
  const fakeDb: FakeDb = {
    update: (table: unknown) => fakeChain(table === auditLogMarker ? "audit_log" : table, returningRow),
    insert: (table: unknown) => fakeChain(table === auditLogMarker ? "audit_log" : table, returningRow),
    transaction: async (cb) => cb(fakeDb),
  };
  return fakeDb;
}

// Marqueur utilisé pour distinguer la table audit_log dans le mock — la
// vraie valeur exportée par schema.ts n'a pas besoin d'être identique,
// seule la RÉFÉRENCE compte pour notre détection ci-dessus.
let auditLogMarker: unknown;

vi.mock("drizzle-orm/postgres-js", () => ({
  drizzle: (_client: unknown, opts: { schema: Record<string, unknown> }) => {
    auditLogMarker = opts.schema.auditLog;
    return makeFakeDb({ id: 1, statut: "libre" });
  },
}));

beforeEach(() => {
  inserts.length = 0;
  auditShouldFail = false;
  process.env.DATABASE_URL = "postgresql://fake";
  vi.resetModules();
});

describe("changerStatutChambre — audit transactionnel (D9)", () => {
  it("sans acteurId : aucune écriture d'audit (comportement legacy, D16)", async () => {
    const { storage } = await import("./storage.js");
    await storage.changerStatutChambre(1, "libre");
    expect(inserts).toHaveLength(0);
  });
});

describe("enregistrerAudit / transaction fail-closed", () => {
  it("propage l'échec de l'audit pour que toute la transaction échoue", async () => {
    auditShouldFail = true;
    const { storage } = await import("./storage.js");
    await expect(
      storage.changerStatutChambre(1, "libre", "acteur-uuid-1"),
    ).rejects.toThrow("audit insert failed");
  });

  it("insère bien une ligne d'audit quand acteurId est fourni et que tout réussit", async () => {
    const { storage } = await import("./storage.js");
    await storage.changerStatutChambre(1, "libre", "acteur-uuid-1");
    expect(inserts).toHaveLength(1);
    expect(inserts[0].values).toMatchObject({
      utilisateurId: "acteur-uuid-1",
      action: "chambre.statut",
    });
  });
});
