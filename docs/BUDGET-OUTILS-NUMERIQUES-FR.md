# ARYV Tower — Budget des Outils Numériques

**Préparé :** juin 2026 · **Devise :** USD · **Immeuble :** Night club au sous-sol (« Rue de la Bière » / Entrée Président) · Restaurant au rez-de-chaussée · Étages 1 à 4 : chambres en court séjour · Terrasse panoramique au sommet

> **Comment lire ce document.** Chaque ligne est marquée :
>
> - **[VÉRIFIÉ]** — prix public confirmé en ligne en juin 2026 (sources en fin de document).
> - **[ESTIMATION]** — estimation technique ; le prix final exige un devis fournisseur (importation généralement via Kigali).
>
> **Hypothèse clé : 24 chambres (6 par étage × 4 étages).** Les prix par chambre et par porte sont indiqués partout afin que les totaux s'ajustent proportionnellement si le nombre réel diffère. Les lignes de matériel importé incluent une provision de coût rendu (fret Kigali→Goma, douanes) ; prévoir néanmoins une **contingence projet de 10 à 15 %** sur les sections B et C.

---

## A. PMS ARYV — notre propre logiciel de gestion hôtelière (étages 1–4)

Plutôt que de payer un abonnement à vie à un éditeur étranger (Sirvoy : 60–100 $/mois ; Cloudbeds : 200–350 $/mois), **nous développerons notre propre PMS en interne**, sur la pile technologique que nos équipes maîtrisent déjà (Express + React + Supabase). Le logiciel devient un **actif de l'entreprise**, et non une charge mensuelle.

### Ce que le PMS ARYV fera

| Module | Fonction pour le propriétaire |
|---|---|
| Calendrier des chambres | Vue en temps réel : libre / occupée / à nettoyer / réservée, sur téléphone ou tablette |
| Tarification flexible | Nuitée, **journée (« repos »)** et multi-nuits comme produits distincts ; tarifs majorés le week-end |
| Réservation WhatsApp + Mobile Money | Le client réserve sur WhatsApp, paie l'acompte par M-Pesa / Airtel Money / Orange Money, reçoit son code PIN automatiquement |
| Check-in autonome | Le code PIN de la serrure est généré et envoyé automatiquement, et expire au check-out |
| Tableau de ménage | Les femmes de chambre marquent les chambres « prêtes » depuis un simple téléphone Android |
| Caisse et rapports | Chaque franc encaissé est tracé : recettes par chambre, par étage, par jour — fini les fuites de revenus |
| Passerelle vers les autres étages | Commande du restaurant depuis la chambre, achat d'entrée au club, forfaits week-end |

### Stratégie pour Booking.com / Airbnb

La connexion directe à Booking.com exige une certification longue. Solution pragmatique : le PMS ARYV gère tout en interne, et un **channel manager tiers léger** (≈ 30–50 $/mois **[ESTIMATION]**) synchronise uniquement les disponibilités vers Booking.com et Airbnb — le segment ONG/ONU/affaires qui paie en dollars. Cette ligne peut être ajoutée en phase 2 sans rien changer au reste.

### Coût du PMS ARYV

| Poste | Coût |
|---|---|
| Développement (interne, équipe ARYV) | Investissement en temps — pas de sortie de trésorerie |
| Développement (si sous-traité, à titre indicatif) | 4 000–8 000 $ une fois **[ESTIMATION]** |
| Hébergement (Supabase + serveur) | ≈ 25–50 $/mois |
| Channel manager tiers (phase 2, optionnel) | ≈ 30–50 $/mois **[ESTIMATION]** |
| Tablette de réception | ≈ 250 $ une fois |

**Version 1 livrable en 6 à 8 semaines** : calendrier, tarifs, réservation WhatsApp, paiement Mobile Money, codes PIN automatiques, tableau de ménage. Les forfaits inter-étages et le channel manager suivent en phase 2.

**Avantage décisif :** au bout de 3 ans, un abonnement Sirvoy/Cloudbeds aurait coûté 2 200 à 12 600 $ — et l'argent serait perdu. Le PMS ARYV, lui, nous appartient, parle français, accepte le Mobile Money nativement, et pourra être revendu ou déployé dans d'autres établissements à Goma.

---

## B. Serrures intelligentes — matériel par porte (24 portes + portes de service)

Serrures hôtelières compatibles TTLock (code PIN + carte RFID + application, piles AA ≈ 12 mois, fonctionnement hors-ligne une fois le code émis). Les prix de gros sont uniquement sur devis auprès des fabricants (Yonann, Locstar, LockBotin, etc.) **[VÉRIFIÉ que le gros est sur devis ; les montants unitaires ci-dessous sont des ESTIMATIONS]** :

| Poste | Coût unitaire (rendu Goma) | Qté | Sous-total |
|---|---|---|---|
| Serrure à mortaise hôtelière TTLock (PIN+RFID+app) | 70–110 $ | 24 | 1 680–2 640 $ |
| Passerelle Wi-Fi TTLock (émission de codes à distance, 1/étage) | 30–45 $ | 4 | 120–180 $ |
| Cartes RFID clients/personnel | 0,50 $ | 100 | 50 $ |
| Installation (serrurier local, préparation des portes incluse) | 15–25 $/porte | 24 | 360–600 $ |
| Serrures de rechange + piles (1 an) | — | — | 250 $ |
| **Total serrures, 24 portes** | **≈ 100–150 $/porte tout compris** | | **≈ 2 500–3 700 $** |

Aucun abonnement : l'application TTLock / TTHotel est gratuite et s'intégrera au PMS ARYV via son API ouverte. **Commander d'abord 2 serrures d'essai (≈ 200 $)**, tester sur un étage, puis passer la commande groupée.

---

## C. Énergie — Starlink + dimensionnement solaire

### C.1 Internet (Starlink officiellement actif en RDC) [VÉRIFIÉ]

| Poste | Coût |
|---|---|
| Kit Starlink Standard (matériel) | **389 $ (1 130 000 FC)** l'unité |
| Abonnement mensuel Starlink | **50 $ (144 000 FC)** /kit/mois |
| Recommandé : 2 kits (répartition de charge, redondance) | 778 $ une fois + 100 $/mois |
| Ligne FAI locale de secours (optionnel) | ≈ 50–100 $/mois |
| Réseau de l'immeuble : routeur UniFi, 3 commutateurs, 14 points d'accès (sous-sol→toit), portail captif | 2 500–3 500 $ **[ESTIMATION]** |
| **Connectivité : ≈ 3 300–4 300 $ une fois · 100–200 $/mois** | |

### C.2 Solaire — d'abord le modèle de charge [ESTIMATION — visite technique requise]

Charges estimées en pointe (cuisson au gaz supposée au restaurant ; la climatisation/ventilation du club est le facteur variable) :

| Zone | Pointe en soirée | Remarques |
|---|---|---|
| 24 chambres (clim ≈ 60 % d'usage, TV, éclairage) | 15–20 kW | Charge stable la plus importante |
| Restaurant (chambres froides, clim, écrans) | 8–10 kW | Les frigos tournent 24h/24 → dimensionnent la batterie |
| Night club (sonorisation, éclairage, mur LED, ventilation) | 10–20 kW | Vendredis/samedis seulement |
| Terrasse + communs (pompes, caméras, Wi-Fi, couloirs) | 3–5 kW | |
| **Pointe de l'immeuble (nuit de week-end)** | **≈ 40–50 kW** | Semaine ≈ 25–30 kW |
| **Consommation journalière** | **≈ 250–350 kWh/jour** | |

**Architecture recommandée — hybride, pas 100 % solaire.** Le réseau (Virunga Energies/SNEL) reste le fournisseur principal ; le solaire + lithium couvre la journée et comble les coupures ; un groupe électrogène sécurise les nuits de club. Dimensionner le solaire pour faire tourner tout le club ne serait pas rentable — le dimensionner pour que *les chambres et les frigos ne s'éteignent jamais*, oui.

| Palier | Système | Garantie | Coût installé **[ESTIMATION]** |
|---|---|---|---|
| A — Minimum | 15 kWc PV + 30 kWh LiFePO₄ + onduleur hybride 20 kVA | Éclairage/TV/Wi-Fi des chambres, frigos, caméras, serrures pendant toute coupure ; sans clim | 30 000–42 000 $ |
| **B — Recommandé** | **30 kWc PV + 60 kWh LiFePO₄ + 3 onduleurs 15 kVA (Deye/Victron)** | Tout le palier A **plus** clim des chambres à régime réduit et service complet du restaurant pendant les coupures ; réduction sensible de la facture en journée | **55 000–75 000 $** |
| C — Complément club | + groupe diesel 60 kVA avec inverseur automatique | Pleine charge du club (son/LED/clim) lors des coupures de week-end | + 12 000–18 000 $ |

Base de calcul : les systèmes hybrides avec stockage reviennent à ≈ 1 400–1 700 $/kWc installé dans la région (référence Afrique du Sud, **[VÉRIFIÉ]**) ; la logistique RDC porte cela à ≈ 1 800–2 200 $/kWc **[ESTIMATION]**. Les batteries représentent 35 à 45 % du coût. Obtenir au moins deux devis d'installateurs (Goma compte des entreprises expérimentées ; l'écosystème Nuru et les EPC de Kigali desservent la ville). La visite technique doit confirmer ≈ 160 m² de surface non ombragée pour le palier B — si la terrasse est entièrement dédiée aux clients, les panneaux s'installent sur des pergolas surélevées (l'ombre devient un atout).

---

## D. Reste de la liste (plan étage par étage)

Tout en **[ESTIMATION]** sauf mention contraire.

| # | Poste | Une fois | Mensuel |
|---|---|---|---|
| D1 | Caisse — Loyverse : cœur **gratuit [VÉRIFIÉ]** ; Inventaire avancé 29 $/mois/point de vente ×2 (restaurant + bars du club) **[VÉRIFIÉ]** | — | 58 $ |
| D2 | Matériel de caisse : 3 tablettes Android, 2 imprimantes tickets, écran de cuisine | 1 000–1 400 $ | — |
| D3 | Paiement sans espèces au club : bracelets/cartes NFC (1 000 pcs à ≈ 1–2 $) + borne de rechargement ; plateforme sur devis | 1 500–2 500 $ | 0–100 $ |
| D4 | Sonorisation du club (2 têtes + 2 caissons + amplis/DSP, gamme RCF/JBL) | 8 000–15 000 $ | — |
| D5 | Éclairage du club : contrôleur DMX + lyres + synchronisation au rythme (SoundSwitch) | 3 500–6 000 $ | — |
| D6 | Mur LED derrière le DJ, ≈ 10 m² intérieur P3.9 | 6 000–10 000 $ | — |
| D7 | Photomaton 360° + habillage de marque | 1 000–2 500 $ | — |
| D8 | Compteur de personnes à l'entrée | 300–800 $ | — |
| D9 | Menus numériques du restaurant (3 écrans professionnels 55" + lecteur) | 1 200–1 800 $ | — |
| D10 | Plateforme WhatsApp Business (catalogue, réponses automatiques) | — | 0–50 $ |
| D11 | TV connectées 43" ×24 chambres | 4 300–5 500 $ | abonnements ≈ 40 $ |
| D12 | Vidéosurveillance : 20–24 caméras + enregistreur, tout l'immeuble, installé | 3 500–5 500 $ | — |
| D13 | Terrasse : vidéoprojecteur extérieur + écran + audio par zones | 2 500–4 000 $ | — |
| D14 | Application web unifiée « ARYV Tower » (réservations chambres + tables + club, développée en interne avec le PMS ARYV) | développement interne | ≈ 25 $ hébergement |

---

## E. Budget consolidé

### Investissement initial (scénario 24 chambres)

| Bloc | Bas | Haut |
|---|---|---|
| Énergie palier B (solaire + batteries) | 55 000 $ | 75 000 $ |
| Ensemble club (D3–D8) | 20 300 $ | 36 800 $ |
| Connectivité + réseau (C.1) | 3 300 $ | 4 300 $ |
| Serrures intelligentes, 24 portes (B) | 2 500 $ | 3 700 $ |
| Chambres : TV + tablette de réception | 4 550 $ | 5 750 $ |
| Restaurant : caisse + menus numériques (D2, D9) | 2 200 $ | 3 200 $ |
| Vidéosurveillance (D12) | 3 500 $ | 5 500 $ |
| Terrasse (D13) | 2 500 $ | 4 000 $ |
| **Sous-total** | **93 850 $** | **138 250 $** |
| Contingence 12 % | 11 260 $ | 16 590 $ |
| **TOTAL une fois** | **≈ 105 000 $** | **≈ 155 000 $** |
| Optionnel : groupe électrogène club (palier C) | +12 000 $ | +18 000 $ |
| Optionnel : PMS ARYV sous-traité (sinon interne) | +4 000 $ | +8 000 $ |

### Charges mensuelles

| Poste | Mensuel |
|---|---|
| Starlink ×2 | 100 $ |
| PMS ARYV (hébergement, au lieu de 60–350 $ d'abonnement) | 25–50 $ |
| Channel manager (phase 2, optionnel) | 30–50 $ |
| Modules Loyverse ×2 points de vente | 58 $ |
| WhatsApp / streaming / hébergement divers | 90–115 $ |
| **TOTAL** | **≈ 300–375 $/mois (≈ 3 600–4 500 $/an)** |

### Déploiement par phases (suit la trésorerie)

| Phase | Contenu | Budget |
|---|---|---|
| 1 — Infrastructure | Starlink + réseau, énergie palier A→B, PMS ARYV v1, caisse, WhatsApp | 65 000–85 000 $ |
| 2 — Expérience client | Serrures (pilote 1 étage puis tout), TV chambres, caméras, menus numériques, channel manager | 12 000–17 000 $ |
| 3 — Effet « wow » | Ensemble club, équipement terrasse, bracelets NFC, application ARYV Tower complète | 28 000–53 000 $ |

---

## F. Avant tout décaissement — liste de vérification

1. **Nombre de chambres** : remplacer l'hypothèse de 24 chambres par le décompte réel des portes ; les sections A, B et D11 s'ajustent à l'unité.
2. **Cahier des charges PMS ARYV** : valider la liste des modules de la section A avec la gérance avant la première ligne de code.
3. **Serrures d'essai** : commander 2 unités, tester PIN/RFID/autonomie sur site pendant 2 semaines avant la commande groupée.
4. **Visite technique solaire** : deux devis écrits minimum ; confirmer la marge structurelle de la terrasse et la surface de panneaux.
5. **Channel manager** : choisir le prestataire seulement en phase 2, une fois le PMS ARYV en production.
6. **Douanes/TVA** : confirmer les droits d'importation actuels sur l'électronique avec votre transitaire à Goma — non inclus ci-dessus au-delà de la provision de coût rendu.

---

## Sources (vérifiées en juin 2026)

- Tarifs Starlink RDC : Connecting Africa (« Starlink live in DRC ») ; Technext (lancement RDC, juin 2025)
- Référence abonnements PMS du marché (comparaison) : RoomMaster / Capterra (Sirvoy) ; Cloudbeds.com / CostBench (Cloudbeds)
- Serrures hôtelières TTLock (gros sur devis) : TTLock.eu ; Yonann ; LockBotin
- Références solaires : Energy Bee (coût par kW installé) ; ProConnectSA
- Caisse Loyverse : loyverse.com/pricing ; GetApp

*Document préparé pour le propriétaire d'ARYV Tower — ARYV Logistics, Goma, République Démocratique du Congo.*
