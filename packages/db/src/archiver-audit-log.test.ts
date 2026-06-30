import { beforeEach, describe, expect, it, vi } from "vitest";

// Même approche que storage.test.ts : on simule postgres()/drizzle() pour
// tester notre logique (déplacer + supprimer dans UNE transaction, D15)
// sans dépendre d'une vraie connexion Postgres.

vi.mock("postgres", () => ({ default: () => ({}) }));

interface LigneAudit {
  id: number;
  utilisateurId: string;
  action: string;
  entiteType: string;
  entiteId: number | null;
  details: unknown;
  horodatage: Date;
}

let lignesAuditLog: LigneAudit[] = [];
let archiveInsertedRows: { auditLogId: number }[] = [];
let archiveInsertShouldFail = false;
let dernierLotIds: number[] = [];
let auditLogMarker: unknown;
let auditLogArchiveMarker: unknown;

type FakeDb = {
  select: () => {
    from: (table: unknown) => { where: () => { limit: (n: number) => LigneAudit[] } };
  };
  insert: (table: unknown) => { values: (values: unknown) => Promise<void> };
  delete: (table: unknown) => { where: () => Promise<void> };
  transaction: (cb: (tx: FakeDb) => Promise<unknown>) => Promise<unknown>;
};

function makeFakeDb(): FakeDb {
  const fakeDb: FakeDb = {
    select: () => ({
      from: (table: unknown) => ({
        where: () => ({
          limit: (n: number) =>
            table === auditLogMarker ? lignesAuditLog.slice(0, n) : [],
        }),
      }),
    }),
    insert: (table: unknown) => ({
      values: async (values: unknown) => {
        if (table !== auditLogArchiveMarker) return;
        if (archiveInsertShouldFail) throw new Error("archive insert failed");
        const lignes = values as { auditLogId: number }[];
        dernierLotIds = lignes.map((l) => l.auditLogId);
        archiveInsertedRows.push(...lignes);
      },
    }),
    // Cible les IDs exacts du lot archivé (jamais toute la condition de
    // date) — vérifie qu'un deuxième lot ne supprime pas des lignes que le
    // PREMIER lot n'a pas encore archivées.
    delete: (table: unknown) => ({
      where: async () => {
        if (table === auditLogMarker) {
          lignesAuditLog = lignesAuditLog.filter((l) => !dernierLotIds.includes(l.id));
        }
      },
    }),
    transaction: async (cb) => cb(fakeDb),
  };
  return fakeDb;
}

vi.mock("drizzle-orm/postgres-js", () => ({
  drizzle: (_client: unknown, opts: { schema: Record<string, unknown> }) => {
    auditLogMarker = opts.schema.auditLog;
    auditLogArchiveMarker = opts.schema.auditLogArchive;
    return makeFakeDb();
  },
}));

beforeEach(() => {
  lignesAuditLog = [];
  archiveInsertedRows = [];
  archiveInsertShouldFail = false;
  dernierLotIds = [];
  process.env.DATABASE_URL = "postgresql://fake";
  vi.resetModules();
});

describe("archiverAuditLog (D15 — rétention 90 jours)", () => {
  it("déplace les lignes antérieures vers l'archive et les supprime de audit_log", async () => {
    lignesAuditLog = [
      {
        id: 1,
        utilisateurId: "acteur-1",
        action: "chambre.statut",
        entiteType: "chambre",
        entiteId: 1,
        details: null,
        horodatage: new Date("2025-01-01"),
      },
    ];
    const { storage } = await import("./storage.js");

    const nb = await storage.archiverAuditLog(new Date("2026-01-01"));

    expect(nb).toBe(1);
    expect(archiveInsertedRows).toHaveLength(1);
    expect(archiveInsertedRows[0]).toMatchObject({ auditLogId: 1, action: "chambre.statut" });
    expect(lignesAuditLog).toHaveLength(0);
  });

  it("ne touche à rien quand aucune ligne n'est antérieure à la date donnée", async () => {
    lignesAuditLog = [];
    const { storage } = await import("./storage.js");

    const nb = await storage.archiverAuditLog(new Date("2026-01-01"));

    expect(nb).toBe(0);
    expect(archiveInsertedRows).toHaveLength(0);
  });

  it("si l'insertion dans l'archive échoue, les lignes restent dans audit_log (pas de suppression orpheline)", async () => {
    archiveInsertShouldFail = true;
    lignesAuditLog = [
      {
        id: 2,
        utilisateurId: "acteur-1",
        action: "reservation.creer",
        entiteType: "reservation",
        entiteId: 9,
        details: null,
        horodatage: new Date("2025-01-01"),
      },
    ];
    const { storage } = await import("./storage.js");

    await expect(storage.archiverAuditLog(new Date("2026-01-01"))).rejects.toThrow(
      "archive insert failed",
    );
    expect(lignesAuditLog).toHaveLength(1);
  });

  it("archive un arriéré de 501 lignes en plusieurs lots (sous la limite de paramètres Postgres)", async () => {
    lignesAuditLog = Array.from({ length: 501 }, (_, i) => ({
      id: i + 1,
      utilisateurId: "acteur-1",
      action: "chambre.statut",
      entiteType: "chambre",
      entiteId: i + 1,
      details: null,
      horodatage: new Date("2025-01-01"),
    }));
    const { storage } = await import("./storage.js");

    const nb = await storage.archiverAuditLog(new Date("2026-01-01"));

    expect(nb).toBe(501);
    expect(archiveInsertedRows).toHaveLength(501);
    expect(lignesAuditLog).toHaveLength(0);
  });
});
