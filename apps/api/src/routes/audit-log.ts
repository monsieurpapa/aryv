import { Router } from "express";
import { storage } from "@aryv/db";
import type { AuditLogDTO } from "@aryv/shared";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const auditLogRouter = Router();

const JOUR_MS = 24 * 60 * 60 * 1000;

function plage(req: import("express").Request) {
  const debut = req.query.debut
    ? new Date(String(req.query.debut))
    : new Date(new Date().toDateString()); // minuit aujourd'hui (D14 — défaut "aujourd'hui")
  const fin = req.query.fin ? new Date(String(req.query.fin)) : new Date(debut.getTime() + JOUR_MS);
  const page = Number(req.query.page ?? 1) || 1;
  return { debut, fin, page };
}

function versDTO(lignes: Awaited<ReturnType<typeof storage.listerAuditLog>>): AuditLogDTO[] {
  return lignes.map(({ audit, utilisateur }) => ({
    id: audit.id,
    action: audit.action,
    entiteType: audit.entiteType,
    entiteId: audit.entiteId,
    details: audit.details as Record<string, unknown> | null,
    horodatage: audit.horodatage.toISOString(),
    utilisateur,
  }));
}

// Route nouvelle (D16) : toujours protégée par requireAuth/requireRole, jamais par legacyAuth.
auditLogRouter.get("/", requireAuth, requireRole("gerant"), async (req, res) => {
  const { debut, fin, page } = plage(req);
  const lignes = await storage.listerAuditLog(debut, fin, page);
  res.json(versDTO(lignes));
});

auditLogRouter.get("/export", requireAuth, requireRole("gerant"), async (req, res) => {
  const { debut, fin } = plage(req);
  const lignes = await storage.listerAuditLog(debut, fin, 1);
  const dto = versDTO(lignes);

  const entetes = ["horodatage", "utilisateur", "role", "action", "entite_type", "entite_id"];
  const echapper = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lignesCsv = dto.map((l) =>
    [
      l.horodatage,
      l.utilisateur.nom,
      l.utilisateur.role,
      l.action,
      l.entiteType,
      l.entiteId ?? "",
    ]
      .map((v) => echapper(String(v)))
      .join(","),
  );
  const csv = [entetes.join(","), ...lignesCsv].join("\n");

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="journal-audit.csv"');
  res.send(csv);
});
