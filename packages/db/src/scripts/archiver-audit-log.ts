import { storage } from "../storage.js";

// Job mensuel (D15) : déplace les lignes du journal d'audit antérieures à
// 90 jours vers audit_log_archive. Pensé pour un cron de plateforme
// (Railway/Render "Scheduled Job", ou GitHub Actions schedule) — voir
// docs/CUTOVER-AUTH.md pour la configuration. Pas de boucle/serveur ici :
// le script s'exécute une fois et se termine.
const RETENTION_JOURS = 90;
const JOUR_MS = 24 * 60 * 60 * 1000;

async function main() {
  const avant = new Date(Date.now() - RETENTION_JOURS * JOUR_MS);
  const nbArchivees = await storage.archiverAuditLog(avant);
  console.log(
    `audit_log : ${nbArchivees} ligne(s) antérieure(s) au ${avant.toISOString()} archivée(s).`,
  );
}

main().catch((err) => {
  console.error("Échec de l'archivage du journal d'audit :", err);
  process.exitCode = 1;
});
