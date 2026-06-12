# ARYV Logistics — ARYV Tower

Plateforme numérique de l'immeuble **ARYV Tower** (Goma, RDC — « Entrée Président » / « Rue de la Bière ») :
night club au sous-sol · restaurant au rez-de-chaussée · 24 chambres en court séjour (étages 1–4) · terrasse panoramique.

## Applications

- **PMS ARYV** (`apps/pms`) — logiciel de gestion hôtelière interne. Disponible (v1) : calendrier
  des chambres sur 14 jours par étage, réservations nuitée / journée (« repos ») / multi-nuits
  avec montant calculé automatiquement, confirmation / check-in / check-out / annulation, et
  marquage ménage. À venir : tableau de ménage dédié, caisse et rapports.
- **ARYV Tower** (`apps/tower`) — application publique de réservation : chambres, tables du
  restaurant, entrées du club, événements de la terrasse. Paiement Mobile Money, réservation WhatsApp.
- **API** (`apps/api`) — backend Express commun.

## Démarrage

```bash
pnpm install
cp .env.example .env   # remplir Supabase + DATABASE_URL
pnpm db:push
pnpm --filter @aryv/db seed   # créer les 24 chambres (idempotent)
pnpm dev
```

## Documentation

Le budget complet des outils numériques (FR/EN) et le document propriétaire (PDF) sont dans [`docs/`](docs/).
