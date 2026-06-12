import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  numeric,
  pgEnum,
} from "drizzle-orm/pg-core";

// Statuts du cycle de vie d'une chambre : libre → reservee → occupee → a_nettoyer → libre
export const statutChambre = pgEnum("statut_chambre", [
  "libre",
  "reservee",
  "occupee",
  "a_nettoyer",
]);

export const typeChambre = pgEnum("type_chambre", ["grande", "petite"]);

// nuitee = nuit complète · repos = journée (day-use) · multi = plusieurs nuits
export const typeSejour = pgEnum("type_sejour", ["nuitee", "repos", "multi"]);

export const statutReservation = pgEnum("statut_reservation", [
  "en_attente",
  "confirmee",
  "en_cours",
  "terminee",
  "annulee",
]);

export const roleUtilisateur = pgEnum("role_utilisateur", [
  "gerant",
  "reception",
  "menage",
]);

export const chambres = pgTable("chambres", {
  id: serial("id").primaryKey(),
  numero: text("numero").notNull().unique(), // ex: "101", "304"
  etage: integer("etage").notNull(), // 1 à 4
  type: typeChambre("type").notNull(),
  statut: statutChambre("statut").notNull().default("libre"),
  tarifNuitee: numeric("tarif_nuitee", { precision: 10, scale: 2 }).notNull(),
  tarifRepos: numeric("tarif_repos", { precision: 10, scale: 2 }).notNull(),
  creeLe: timestamp("cree_le").notNull().defaultNow(),
});

// L'identité client est le numéro de téléphone — une identité pour tous les étages.
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  telephone: text("telephone").notNull().unique(),
  nom: text("nom"),
  creeLe: timestamp("cree_le").notNull().defaultNow(),
});

export const reservations = pgTable("reservations", {
  id: serial("id").primaryKey(),
  chambreId: integer("chambre_id")
    .notNull()
    .references(() => chambres.id),
  clientId: integer("client_id")
    .notNull()
    .references(() => clients.id),
  typeSejour: typeSejour("type_sejour").notNull(),
  statut: statutReservation("statut").notNull().default("en_attente"),
  arrivee: timestamp("arrivee").notNull(),
  depart: timestamp("depart").notNull(),
  montant: numeric("montant", { precision: 10, scale: 2 }).notNull(),
  // v1 : référence Mobile Money saisie manuellement (M-Pesa / Airtel / Orange)
  refPaiement: text("ref_paiement"),
  creeLe: timestamp("cree_le").notNull().defaultNow(),
});

// Seam phase 2 : codes PIN TTLock émis par réservation (pas d'intégration API en v1).
export const codesPin = pgTable("codes_pin", {
  id: serial("id").primaryKey(),
  reservationId: integer("reservation_id")
    .notNull()
    .references(() => reservations.id),
  code: text("code").notNull(),
  expireLe: timestamp("expire_le").notNull(),
  creeLe: timestamp("cree_le").notNull().defaultNow(),
});

// Profils du personnel — l'id correspond à l'UUID Supabase Auth.
export const utilisateurs = pgTable("utilisateurs", {
  id: text("id").primaryKey(), // UUID Supabase Auth
  nom: text("nom").notNull(),
  role: roleUtilisateur("role").notNull(),
  creeLe: timestamp("cree_le").notNull().defaultNow(),
});

export type Chambre = typeof chambres.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type Reservation = typeof reservations.$inferSelect;
export type NouvelleReservation = typeof reservations.$inferInsert;
export type Utilisateur = typeof utilisateurs.$inferSelect;
