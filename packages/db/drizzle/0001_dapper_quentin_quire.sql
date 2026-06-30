CREATE TABLE "audit_log_archive" (
	"id" serial PRIMARY KEY NOT NULL,
	"audit_log_id" integer NOT NULL,
	"utilisateur_id" text NOT NULL,
	"action" text NOT NULL,
	"entite_type" text NOT NULL,
	"entite_id" integer,
	"details" jsonb,
	"horodatage" timestamp NOT NULL,
	"archive_le" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_log_archive" ADD CONSTRAINT "audit_log_archive_utilisateur_id_utilisateurs_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateurs"("id") ON DELETE no action ON UPDATE no action;