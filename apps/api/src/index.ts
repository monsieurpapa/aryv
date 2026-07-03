import express from "express";
import cors from "cors";
import { chambresRouter } from "./routes/chambres.js";
import { reservationsRouter } from "./routes/reservations.js";
import { reservationsPubliquesRouter } from "./routes/reservations-publiques.js";
import { disponibilitesRouter } from "./routes/disponibilites.js";
import { utilisateursRouter } from "./routes/utilisateurs.js";
import { auditLogRouter } from "./routes/audit-log.js";
import { rapportsRouter } from "./routes/rapports.js";

const app = express();

// Liste blanche d'origines (remplace le joker précédent) ; CORS_ALLOWED_ORIGINS
// est une liste séparée par des virgules. Sans configuration, n'autorise que
// les origines de dev par défaut (PMS sur 5173).
const originsAutorisees = (
  process.env.CORS_ALLOWED_ORIGINS ?? "http://localhost:5173,http://localhost:5174"
)
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: originsAutorisees,
  }),
);
app.use(express.json());

app.get("/api/sante", (_req, res) => {
  res.json({ statut: "ok", service: "aryv-api" });
});

app.use("/api/chambres", chambresRouter);
app.use("/api/reservations", reservationsRouter);
app.use("/api/reservations/publique", reservationsPubliquesRouter);
app.use("/api/disponibilites", disponibilitesRouter);
app.use("/api/utilisateurs", utilisateursRouter);
app.use("/api/audit-log", auditLogRouter);
app.use("/api/rapports", rapportsRouter);

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => {
  console.log(`API ARYV démarrée sur le port ${port}`);
});
