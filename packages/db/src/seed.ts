import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { chambres } from "./schema.js";

// 24 chambres : étages 1–4, 6 par étage — 2 grandes (x01, x02) et 4 petites.
// Tarifs USD : grande 50 $/nuitée, 25 $/repos · petite 30 $/nuitée, 15 $/repos.
async function seed() {
  const client = postgres(process.env.DATABASE_URL!, { prepare: false });
  const db = drizzle(client);

  const lignes = [];
  for (let etage = 1; etage <= 4; etage++) {
    for (let i = 1; i <= 6; i++) {
      const grande = i <= 2;
      lignes.push({
        numero: `${etage}0${i}`,
        etage,
        type: (grande ? "grande" : "petite") as "grande" | "petite",
        tarifNuitee: grande ? "50.00" : "30.00",
        tarifRepos: grande ? "25.00" : "15.00",
      });
    }
  }

  const inserees = await db
    .insert(chambres)
    .values(lignes)
    .onConflictDoNothing({ target: chambres.numero })
    .returning({ numero: chambres.numero });

  console.log(`${inserees.length} chambre(s) créée(s) sur ${lignes.length}.`);
  await client.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
