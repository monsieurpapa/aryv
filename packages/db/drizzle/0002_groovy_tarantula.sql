CREATE TABLE "parametres_tarification" (
	"id" integer PRIMARY KEY NOT NULL,
	"majoration_weekend_pct" integer DEFAULT 0 NOT NULL,
	"maj_le" timestamp DEFAULT now() NOT NULL
);
