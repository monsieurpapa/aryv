CREATE TYPE "public"."role_utilisateur" AS ENUM('gerant', 'reception', 'menage');--> statement-breakpoint
CREATE TYPE "public"."statut_chambre" AS ENUM('libre', 'reservee', 'occupee', 'a_nettoyer');--> statement-breakpoint
CREATE TYPE "public"."statut_reservation" AS ENUM('en_attente', 'confirmee', 'en_cours', 'terminee', 'annulee');--> statement-breakpoint
CREATE TYPE "public"."type_chambre" AS ENUM('grande', 'petite');--> statement-breakpoint
CREATE TYPE "public"."type_sejour" AS ENUM('nuitee', 'repos', 'multi');--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"utilisateur_id" text NOT NULL,
	"action" text NOT NULL,
	"entite_type" text NOT NULL,
	"entite_id" integer,
	"details" jsonb,
	"horodatage" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chambres" (
	"id" serial PRIMARY KEY NOT NULL,
	"numero" text NOT NULL,
	"etage" integer NOT NULL,
	"type" "type_chambre" NOT NULL,
	"statut" "statut_chambre" DEFAULT 'libre' NOT NULL,
	"tarif_nuitee" numeric(10, 2) NOT NULL,
	"tarif_repos" numeric(10, 2) NOT NULL,
	"cree_le" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "chambres_numero_unique" UNIQUE("numero")
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" serial PRIMARY KEY NOT NULL,
	"telephone" text NOT NULL,
	"nom" text,
	"cree_le" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "clients_telephone_unique" UNIQUE("telephone")
);
--> statement-breakpoint
CREATE TABLE "codes_pin" (
	"id" serial PRIMARY KEY NOT NULL,
	"reservation_id" integer NOT NULL,
	"code" text NOT NULL,
	"expire_le" timestamp NOT NULL,
	"cree_le" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reservations" (
	"id" serial PRIMARY KEY NOT NULL,
	"chambre_id" integer NOT NULL,
	"client_id" integer NOT NULL,
	"type_sejour" "type_sejour" NOT NULL,
	"statut" "statut_reservation" DEFAULT 'en_attente' NOT NULL,
	"arrivee" timestamp NOT NULL,
	"depart" timestamp NOT NULL,
	"montant" numeric(10, 2) NOT NULL,
	"ref_paiement" text,
	"cree_le" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "utilisateurs" (
	"id" text PRIMARY KEY NOT NULL,
	"nom" text NOT NULL,
	"role" "role_utilisateur" NOT NULL,
	"pin_hash" text,
	"echecs_pin_consecutifs" integer DEFAULT 0 NOT NULL,
	"verrouille_jusqua" timestamp,
	"cree_le" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_utilisateur_id_utilisateurs_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateurs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "codes_pin" ADD CONSTRAINT "codes_pin_reservation_id_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_chambre_id_chambres_id_fk" FOREIGN KEY ("chambre_id") REFERENCES "public"."chambres"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;