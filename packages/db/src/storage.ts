import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import * as schema from "./schema.js";

const client = postgres(process.env.DATABASE_URL!, { prepare: false });
const db = drizzle(client, { schema });

// Couche d'accès aux données unique du monorepo.
// Les routes de l'API n'importent jamais Drizzle directement — tout passe par ici.
export const storage = {
  // --- Chambres ---
  async listerChambres() {
    return db.select().from(schema.chambres).orderBy(schema.chambres.numero);
  },

  async changerStatutChambre(
    id: number,
    statut: (typeof schema.statutChambre.enumValues)[number],
  ) {
    const [chambre] = await db
      .update(schema.chambres)
      .set({ statut })
      .where(eq(schema.chambres.id, id))
      .returning();
    return chambre;
  },

  // --- Clients (identité = numéro de téléphone) ---
  async trouverOuCreerClient(telephone: string, nom?: string) {
    const existant = await db.query.clients.findFirst({
      where: eq(schema.clients.telephone, telephone),
    });
    if (existant) return existant;
    const [nouveau] = await db
      .insert(schema.clients)
      .values({ telephone, nom })
      .returning();
    return nouveau;
  },

  // --- Réservations ---
  async creerReservation(donnees: schema.NouvelleReservation) {
    const [reservation] = await db
      .insert(schema.reservations)
      .values(donnees)
      .returning();
    return reservation;
  },

  async listerReservations() {
    return db.select().from(schema.reservations);
  },
};

export type Storage = typeof storage;
