import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { JournalAudit } from "./JournalAudit";

const listerAuditLog = vi.fn();
const exporterAuditLogCsv = vi.fn();
vi.mock("./api", () => ({
  api: {
    listerAuditLog: (...args: unknown[]) => listerAuditLog(...args),
    exporterAuditLogCsv: (...args: unknown[]) => exporterAuditLogCsv(...args),
  },
}));

describe("JournalAudit", () => {
  it("affiche les entrées renvoyées par l'API", async () => {
    listerAuditLog.mockResolvedValue([
      {
        id: 1,
        action: "chambre.statut",
        entiteType: "chambre",
        entiteId: 304,
        details: { statut: "libre" },
        horodatage: "2026-06-24T12:30:00.000Z",
        utilisateur: { nom: "Aline", role: "menage" },
      },
    ]);

    render(<JournalAudit />);

    await waitFor(() => expect(screen.getByText("Aline")).toBeTruthy());
    expect(screen.getByText("Statut chambre modifié")).toBeTruthy();
  });

  it("affiche un message quand la période ne contient aucune entrée", async () => {
    listerAuditLog.mockResolvedValue([]);

    render(<JournalAudit />);

    await waitFor(() =>
      expect(screen.getByText("Aucune entrée sur cette période.")).toBeTruthy(),
    );
  });
});
