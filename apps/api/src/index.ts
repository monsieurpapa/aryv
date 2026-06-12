import express from "express";
import cors from "cors";
import { chambresRouter } from "./routes/chambres.js";
import { reservationsRouter } from "./routes/reservations.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/sante", (_req, res) => {
  res.json({ statut: "ok", service: "aryv-api" });
});

app.use("/api/chambres", chambresRouter);
app.use("/api/reservations", reservationsRouter);

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => {
  console.log(`API ARYV démarrée sur le port ${port}`);
});
