# ARYV Tower — Digital Tools Budget (Goma, DRC)

**Prepared:** June 2026 · **Currency:** USD · **Building:** Basement night club « Rue de la Bière » · Ground-floor restaurant · Floors 1–4 short-stay rooms · Rooftop terrace

> **How to read this document.** Every line is tagged:
> - **[VERIFIED]** — public price confirmed online in June 2026 (sources at the end).
> - **[ESTIMATE]** — engineered estimate; final price requires a supplier quote (typically via Kigali for hardware imports).
>
> **Key assumption: 24 rooms (6 per floor × 4 floors).** Per-room and per-door
> prices are given everywhere so totals scale linearly if the real count differs.
> All import-hardware lines include a landed-cost allowance (freight Kigali→Goma,
> customs); still add a **10–15% project contingency** on Section B and C.

---

## A. PMS — Property Management System (Floors 1–4)

The PMS is a monthly subscription, not capital expenditure. Two credible options:

| | **Sirvoy** (recommended start) | **Cloudbeds** (upgrade path) |
|---|---|---|
| Model | Tiered by room count | Custom quote, 4 plans (Flex/One/Experience/Enterprise) |
| Entry price | From **$15/mo** Starter, **$54/mo** Pro (small tiers) **[VERIFIED]** | **$200–$1,000/mo** typical range **[VERIFIED]** |
| Est. for 24 rooms | **≈ $60–100/mo** Pro tier **[ESTIMATE — confirm in their room-count picker]** | **≈ $200–350/mo [ESTIMATE — sales quote required]** |
| Includes | PMS + booking engine + channel manager, no commission on direct bookings | PMS + channel manager + booking engine + revenue management |
| Trial | 14 days free, no card | Demo via sales call |
| French UI | Yes | Yes |

**Recommendation:** start on **Sirvoy Pro** (~$1,000/year all-in). It covers the
full requirement — Booking.com/Airbnb sync, WhatsApp-friendly direct booking
links, housekeeping board, flexible day-use/overnight rates. Move to Cloudbeds
only if you later add dynamic pricing across 40+ rooms.

**Annual cost (24 rooms): ≈ $720–1,200/yr. No hardware beyond one reception tablet (~$250).**

---

## B. Smart locks — per-door hardware (24 doors + service doors)

TTLock-compatible hotel mortise locks (PIN + RFID card + app, AA batteries
~12 months, offline-capable once a code is issued). Bulk pricing is
quote-only from manufacturers (Yonann, Locstar, LockBotin and similar)
**[VERIFIED that bulk is quote-based; unit figures below are ESTIMATE]**:

| Item | Unit cost (landed Goma) | Qty | Subtotal |
|---|---|---|---|
| Hotel-grade TTLock mortise lock (PIN+RFID+app) | $70–110 | 24 | $1,680–2,640 |
| TTLock Wi-Fi gateway (remote PIN issuing, 1/floor) | $30–45 | 4 | $120–180 |
| RFID guest/staff cards | $0.50 | 100 | $50 |
| Installation (local locksmith, incl. door prep) | $15–25/door | 24 | $360–600 |
| Spare locks + batteries (1 yr) | — | — | $250 |
| **Total locks, 24 doors** | **≈ $100–150/door all-in** | | **≈ $2,500–3,700** |

No subscription: the TTLock / TTHotel app is free and integrates with PMSs.
Order **2 sample locks first (~$200)**, test on one floor, then place the bulk order.

---

## C. Power — Starlink + solar sizing

### C.1 Internet (Starlink officially live in DRC) **[VERIFIED]**

| Item | Cost |
|---|---|
| Starlink Standard kit hardware | **$389 (CDF 1,130,000)** each |
| Starlink monthly service | **$50 (CDF 144,000)** /kit/month |
| Recommended: 2 kits (load-balanced, redundancy) | $778 one-time + $100/mo |
| Local ISP failover line (optional) | ~$50–100/mo |
| Building network: UniFi router, 3 switches, 14 APs (basement→roof), captive portal | $2,500–3,500 **[ESTIMATE]** |
| **Connectivity one-time ≈ $3,300–4,300 · monthly $100–200** | |

### C.2 Solar sizing — load model first **[ESTIMATE — site survey required]**

Estimated diversified loads (gas cooking assumed in the restaurant; club AC/ventilation is the swing factor):

| Zone | Evening peak | Notes |
|---|---|---|
| 24 rooms (AC ~60% duty, TV, lights) | 15–20 kW | Largest steady load |
| Restaurant (cold rooms, AC, screens) | 8–10 kW | Fridges run 24/7 → drives battery size |
| Night club (sound, lighting, LED wall, ventilation) | 10–20 kW | Fri/Sat nights only |
| Terrace + common (pumps, CCTV, Wi-Fi, corridors) | 3–5 kW | |
| **Building peak (weekend night)** | **≈ 40–50 kW** | Weeknights ≈ 25–30 kW |
| **Daily consumption** | **≈ 250–350 kWh/day** | |

**Recommended architecture — hybrid, not solar-only.** Grid (Virunga
Energies/SNEL) remains the bulk supplier; solar + lithium carries daytime
loads and bridges outages; a generator backstops club nights. Sizing solar
to run the whole club is not cost-effective — sizing it to never let
*rooms and fridges* go dark is.

| Tier | System | What it guarantees | Installed cost **[ESTIMATE]** |
|---|---|---|---|
| A — Minimum | 15 kWp PV + 30 kWh LiFePO₄ + 20 kVA hybrid inverter | Rooms' lights/TV/Wi-Fi, fridges, CCTV, locks through any outage; no AC support | $30,000–42,000 |
| **B — Recommended** | **30 kWp PV + 60 kWh LiFePO₄ + 3×15 kVA inverters (Deye/Victron)** | All of Tier A **plus** room AC at reduced duty and full restaurant service during outages; meaningful daytime bill reduction | **$55,000–75,000** |
| C — Add for club nights | + 60 kVA diesel genset with auto-transfer | Full club load (sound/LED/AC) during weekend outages | + $12,000–18,000 |

Basis: regional hybrid systems with storage run ~$1,400–1,700/kWp installed
(South Africa benchmark, **[VERIFIED]**); DRC logistics push this to
~$1,800–2,200/kWp **[ESTIMATE]**. Batteries are 35–45% of system cost.
Get quotes from at least two installers (Goma has experienced firms; Nuru's
ecosystem and Kigali-based EPCs both serve the city). Roof/terrace survey
must confirm ~160 m² of unshaded panel area for Tier B — if the terrace is
fully a guest area, panels go on raised pergola structures (shade = a feature).

---

## D. Remaining shortlist (from the floor-by-floor plan)

All **[ESTIMATE]** unless noted.

| # | Item | One-time | Monthly |
|---|---|---|---|
| D1 | POS — Loyverse core **free [VERIFIED]**; Advanced Inventory $29/mo/store ×2 (restaurant + club bars) **[VERIFIED]** | — | $58 |
| D2 | POS hardware: 3 Android tablets, 2 receipt printers, kitchen display screen | $1,000–1,400 | — |
| D3 | Club cashless: NFC wristbands/cards (1,000 pcs @ ~$1–2) + top-up station; platform quote-based | $1,500–2,500 | $0–100 |
| D4 | Club sound (quality 2×top + 2×sub + amps/DSP, e.g. RCF/JBL tier) | $8,000–15,000 | — |
| D5 | Club lighting: DMX controller + moving heads + beat-sync (SoundSwitch) | $3,500–6,000 | — |
| D6 | LED video wall behind DJ, ~10 m² indoor P3.9 | $6,000–10,000 | — |
| D7 | 360° photo booth + branding overlay | $1,000–2,500 | — |
| D8 | Door people-counter | $300–800 | — |
| D9 | Restaurant digital menu boards (3× 55" commercial screens + player) | $1,200–1,800 | — |
| D10 | WhatsApp Business platform (catalog, auto-replies) | — | $0–50 |
| D11 | Room smart TVs 43" ×24 | $4,300–5,500 | streaming subs ~$40 |
| D12 | CCTV: 20–24 cameras + NVR, whole building, installed | $3,500–5,500 | — |
| D13 | Rooftop: outdoor projector + screen + zoned audio | $2,500–4,000 | — |
| D14 | « ARYV Tower » unified booking web app (in-house, Express+React+Supabase) | sweat equity | ~$25 hosting |

---

## E. Consolidated budget

### One-time capital (24-room scenario)

| Block | Low | High |
|---|---|---|
| Power Tier B (solar+battery) | $55,000 | $75,000 |
| Club package (D3–D8) | $20,300 | $36,800 |
| Connectivity + network (C.1) | $3,300 | $4,300 |
| Smart locks, 24 doors (B) | $2,500 | $3,700 |
| Rooms: TVs + reception tablet | $4,550 | $5,750 |
| Restaurant: POS hardware + signage (D2, D9) | $2,200 | $3,200 |
| CCTV (D12) | $3,500 | $5,500 |
| Rooftop (D13) | $2,500 | $4,000 |
| **Subtotal** | **$93,850** | **$138,250** |
| Contingency 12% | $11,260 | $16,590 |
| **TOTAL one-time** | **≈ $105,000** | **≈ $155,000** |
| Optional: club genset (Tier C) | +$12,000 | +$18,000 |

### Monthly operating

| Item | Monthly |
|---|---|
| Starlink ×2 | $100 |
| PMS (Sirvoy Pro est.) | $60–100 |
| Loyverse add-ons ×2 stores | $58 |
| WhatsApp/streaming/hosting/misc | $90–115 |
| **TOTAL** | **≈ $310–375/mo (≈ $3,800–4,500/yr)** |

### Phased rollout (matches cash flow)

| Phase | Contents | Budget |
|---|---|---|
| 1 — Infrastructure | Starlink + network, power Tier A→B, PMS live, POS, WhatsApp | $65k–85k |
| 2 — Guest experience | Locks (pilot 1 floor, then all), room TVs, CCTV, menu boards | $12k–17k |
| 3 — Wow layer | Club package, rooftop kit, cashless wristbands, web app | $28k–53k |

---

## F. Before any money moves — verification checklist

1. **Room count**: replace the 24-room assumption with the real door count; Sections A, B, D11 scale per unit.
2. **Sirvoy quote**: enter the real room count at sirvoy.com pricing page (2 min) to pin the exact tier.
3. **Lock samples**: order 2 units, test PIN/RFID/battery life on site for 2 weeks before the bulk order.
4. **Solar site survey**: two written quotes minimum; confirm terrace structural margin and panel area.
5. **Cloudbeds quote** only if Sirvoy proves limiting after 6 months.
6. **Customs/VAT**: confirm current DRC import duties on electronics with your clearing agent in Goma — not included above beyond the landed-cost allowance.

---

## Sources (checked June 2026)

- Starlink DRC pricing: [Connecting Africa — Starlink live in DRC](https://www.connectingafrica.com/connectivity/starlink-live-in-drc), [Technext](https://technext24.com/2025/06/08/starlink-live-democratic-republic-congo/)
- Sirvoy pricing: [HotelMinder](https://www.hotelminder.com/partner=Sirvoy), [RoomMaster blog](https://www.roommaster.com/blog/sirvoy-pricing), [Capterra](https://www.capterra.com/p/103570/Sirvoy-Booking-System/pricing/)
- Cloudbeds pricing: [Cloudbeds](https://www.cloudbeds.com/pricing/), [CostBench](https://costbench.com/software/hotel-management/cloudbeds/), [6hoteliers review](https://6hoteliers.com/property-management/cloudbeds-review/)
- TTLock hotel locks (bulk = quote): [TTLock.eu](https://ttlock.eu/shop/ttlock-hotel/), [Yonann](https://yonannlock.com/ttlock-smart-lock/), [LockBotin](https://www.btelec.com/554-smart-hotel-door-lock-ttlock-product/)
- Solar benchmarks: [Energy Bee — cost per kW](https://energybee.co.za/guides/solar-installation-cost-per-kw-south-africa-2025), [ProConnectSA](https://www.proconnectsa.co.za/resources/solar-installation-cost-south-africa)
- Loyverse POS: [Loyverse pricing](https://loyverse.com/pricing), [GetApp](https://www.getapp.com/retail-consumer-services-software/a/loyverse-pos/)
