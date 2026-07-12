<!-- Copyright 2026 Elian Schock, Jonas Schwenk -->
# MasterMind — Monetarisierung, Shop & Plattform-Ausbau

**Datum:** 2026-05-16  
**Status:** Genehmigt  
**Scope:** 4 Sub-Projekte (SP-1 bis SP-4)

---

## Überblick

MasterMind ist eine Lernplattform für Schüler mit einem umfangreichen Gamification-System (500 Level, Ranks, Quests, Boss Battles, Duelle, Achievements, Titles, Skill Trees). Das Ziel dieses Designs ist es, die App in eine profitbringende Plattform umzuwandeln durch:

1. Einen vollständigen In-App-Shop mit Währungssystem
2. Ein integriertes Zahlungssystem (Stripe)
3. Eine überarbeitete Landing Page mit Student-Value-Prop
4. Cross-Platform-Unterstützung via verbesserter PWA + Capacitor-Shell

Die bestehende Gamification-Infrastruktur bleibt unverändert und wird um den Shop erweitert.

---

## Sub-Projekt 1: Währungssystem + Shop + Avatar

### 1.1 Währungsdesign

Zwei Währungen:

| Währung | Name | Farbe | Wie erhalten |
|---|---|---|---|
| Kostenlos | **Silber-Coins** (SC) | Silber/Grau `#9ca3af` | Durch Spielen |
| Kaufbar | **Gold-Coins** (GC) | Gold `#fbbf24` | Echtes Geld |

**Silber-Coin-Quellen:**
- Daily Login: +10 SC
- Quest abschließen: +20–100 SC (je nach Difficulty)
- Boss besiegen: +200 SC
- Level-Up: +50 × Level SC (Level 5 = +250 SC)
- Duell gewinnen: +30 SC
- Saison-Tier freischalten: +50–500 SC
- Streak-Meilensteine (7/30/100 Tage): +100/500/1.000 SC
- Wöchentliches Ranking Top 3: +500/300/100 SC
- Tagesbelohnung (Wochenbonus Tag 7): +200 SC

**Gold-Coin-Pakete (Echtes Geld):**
| Paket | GC | Preis | Bonus |
|---|---|---|---|
| Starter | 500 GC | €1,99 | — |
| Popular | 1.500 GC | €4,99 | +10% |
| Value | 4.000 GC | €9,99 | +33% |
| Ultimate | 10.000 GC | €19,99 | +100% |

### 1.2 Shop-Kategorien

Alle Items haben: `slug`, `name`, `description`, `category`, `rarity`, `priceSilver`, `priceGold`, `isPremiumOnly`, `seasonId` (optional), `expiresAt` (optional), `previewUrl`.

#### Avatar-Frames
- Standard (gratis)
- Blaue Flammen (200 SC)
- Eisrand (300 SC)
- Goldkrone (800 SC / 200 GC)
- Regenbogen-Puls — animiert (500 GC)
- Blitz-Frame (400 SC)
- Prestige-Frame (nur P1+, nicht kaufbar)
- Saison-exklusiver Frame (je Saison, 1.000 SC oder 300 GC)
- Premium-Mitglieder-Frame (Premium-only)

#### Profilhintergründe
- Standard (gratis)
- Sternenhimmel (150 SC)
- Matrix-Regen — animiert (400 GC)
- Galaxie-Gradient (250 SC)
- Lila Dämmerung (200 SC)
- Goldene Partikel — animiert (600 GC)
- Saison-exklusiv (je Saison)

#### Namensfarben (im Ranking sichtbar)
- Standard Weiß/Schwarz (gratis)
- Rot (100 GC)
- Lila (100 GC)
- Cyan (100 GC)
- Gold (250 GC)
- Regenbogen — animiert (500 GC)
- Prestige-Gold (nur P3+)

#### Zusatztitel (kaufbar, ergänzt bestehende)
Alle bestehenden Titel bleiben durch Gameplay erreichbar. Zusätzliche kaufbare Titel:
- "Der Käufer" (Ironie-Titel, 500 SC)
- "Sponsor" (Support-Titel, 200 GC)
- "Nachtfalke" (150 GC)
- "Pixelkämpfer" (100 GC)
- Saison-exklusive Titel (je Saison)

#### XP-Booster
- ×1,5 XP für 24h (300 GC)
- ×2,0 XP für 24h (500 GC)
- ×1,5 XP für 3 Tage (700 GC)
- ×2,0 XP für 3 Tage (1.000 GC)
- Weekend-Booster ×2,5 (Fr–So) (1.200 GC)

Aktiver Booster wird in DB gespeichert (`activeBoosterUntil`, `activeBoosterMultiplier`) und beim XP-Award berücksichtigt.

#### Streak-Schutz
- 1-Tages-Freeze (200 SC / 80 GC)
- 3-Tages-Paket (500 SC / 180 GC)
- Wochenpaket (1.000 SC / 350 GC)

Streak-Freeze wird in `streakFreezeCount` auf User gespeichert und bei `awardXp` geprüft. Logik: Wenn ein Streak-Break erkannt wird (gestern war kein aktiver Tag) UND `streakFreezeCount > 0`, wird der Streak nicht zurückgesetzt sondern `streakFreezeCount -= 1`. Der Freeze "rettet" den Streak für genau einen verpassten Tag.

#### Boss-Boosts
- ×2 Schaden nächster Angriff (150 SC)
- ×3 Schaden nächster Angriff (300 SC / 80 GC)
- Gruppen-Boost: Alle Klassen-Mitglieder ×1,5 für 1h (500 GC, Admin kann aktivieren)

#### Quest-Slot-Erweiterung
- +1 Daily Quest Slot (500 GC, permanent)
- +1 Weekly Quest Slot (800 GC, permanent)
- (Standard: 3 Daily, 2 Weekly)

#### Karteikarten-Themes
- Standard (gratis)
- Holz-Optik (200 SC)
- Neon-Dunkel (300 SC)
- Pastell-Hell (150 SC)
- Saison-Theme (je Saison)

#### Quiz-Effekte (Animation bei richtiger Antwort)
- Standard Grün-Flash (gratis)
- Konfetti-Regen (200 GC)
- Blitz-Einschlag (150 GC)
- Feuer-Explosion (300 GC)
- Sternenregen (250 GC)

#### Loot Boxes / Mystery Boxes
- Bronze Mystery Box (300 SC) — Common bis Uncommon Item
- Silber Mystery Box (150 GC) — Uncommon bis Rare Item
- Gold Mystery Box (400 GC) — Rare bis Epic Item
- Legendäre Box (1.000 GC) — Legendary/Mythic garantiert
- Saisonale Box (variabel) — Saison-exklusive Items

Loot-Box-Wahrscheinlichkeiten müssen angezeigt werden (Transparenz-Anforderung).

#### Tägliches Glücksrad
- 1× täglich kostenlos drehen
- Extra-Dreh: 100 SC oder 30 GC
- Gewinne: SC, GC, Items, Booster, Nichts (mit Wahrscheinlichkeiten)
- Wheel-State in DB: `lastWheelSpin`, `extraWheelSpins`

#### Companions / Pets (kosmetisch)
Kleine animierte Icons die neben dem Avatar auf dem Profil erscheinen:
- Kleiner Drache (500 GC)
- Pixel-Hund (300 GC)
- Leuchtender Stern (400 GC)
- Mini-Boss (nur nach Boss-Sieg erhältlich, nicht kaufbar)
- Saison-Pet (je Saison, 800 GC)

#### Emotes
Reaktionen die nach Duell-Sieg, im Ranking oder in Boss-Battle-Chat erscheinen:
- Standard 👍 (gratis)
- Feuer 🔥 (100 SC)
- Krone 👑 (200 SC)
- Trollface (200 GC)
- GG-Emote (150 SC)
- Saison-Emote (exklusiv)

#### Saison-Pass
- Schaltet alle Premium-Tier-Rewards einer Saison frei (normalerweise nur Free-Tiers)
- Preis: 1.500 GC pro Saison
- Retroaktiv: Bereits erreichte Tiers werden sofort ausgezahlt

#### Studie-Musik Player
- Lo-Fi Hip-Hop Playlist (500 SC)
- Konzentrations-Sounds (500 SC)
- Classical Focus (500 SC)
- Nature Ambience (300 SC)
- Player erscheint als Mini-Widget im App-Layout (Sidebar unten)

### 1.3 Premium-Abonnement

**Preis:** €4,99/Monat

**Vorteile:**
- Tägliche 50 Silber-Coins Bonus (automatisch gutgeschrieben)
- Premium-Badge im Profil + Ranking (Gold-Stern)
- Exklusiver Premium-Avatar-Frame (sofort)
- Exklusiver Premium-Profilhintergrund (sofort)
- Premium-Shop-Sektion: Gold-Items zu 50% Silber-Preis
- Doppelter Daily-Login-Reward
- +1 Daily Quest Slot (permanent während Abo)
- Doppelte Loot-Box Chance für höhere Rarities
- Musik-Player ohne Kaufen freigeschaltet
- Saison-Pass-Rabatt: 500 GC Rabatt auf jeden Saison-Pass

### 1.4 Avatar-System

**Aktuell:** Buchstaben-Avatar (bleibt als Fallback)

**Neu:**
- Eigenes Bild hochladen (max. 2MB, wird zu 200×200 gecroppt via Canvas API im Browser)
- Avatar-Frame: CSS-Overlay als Ring/Border um den Avatar
- Companion: Absolut positioniertes kleines Icon (24×24px) rechts unten
- Hintergrund: Gradient/Bild hinter Avatar auf Profilseite
- Namefarbe: CSS-Klasse auf Namens-Spans im Ranking/Chat

Avatare werden in `/api/upload/avatar` hochgeladen, gespeichert wie bestehende `/api/upload` Route.

### 1.5 Datenbankmodelle (neu)

```prisma
model CoinBalance {
  id          String   @id @default(cuid())
  userId      String   @unique
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  silver      Int      @default(0)
  gold        Int      @default(0)
  updatedAt   DateTime @updatedAt
}

model CoinTransaction {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  amount    Int      // positive = credit, negative = debit
  currency  String   // "silver" | "gold"
  reason    String   // "quest_complete" | "shop_purchase" | "daily_login" | "stripe_purchase" etc.
  refId     String?
  createdAt DateTime @default(now())
  @@index([userId])
}

model ShopItem {
  id           String    @id @default(cuid())
  slug         String    @unique
  name         String
  description  String
  category     String    // "frame" | "background" | "namecolor" | "title" | "booster" | "streak_freeze" | "boss_boost" | "quest_slot" | "card_theme" | "quiz_effect" | "loot_box" | "companion" | "emote" | "season_pass" | "music" | "wheel_spin"
  rarity       String    // "common" | "uncommon" | "rare" | "epic" | "legendary" | "mythic"
  priceSilver  Int?
  priceGold    Int?
  isPremiumOnly Boolean  @default(false)
  isLimited    Boolean   @default(false)
  seasonId     String?
  expiresAt    DateTime?
  previewData  String?   // JSON: CSS variables, animation class, etc.
  isActive     Boolean   @default(true)
  createdAt    DateTime  @default(now())
  purchases    UserInventory[]
}

model UserInventory {
  id         String    @id @default(cuid())
  userId     String
  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  itemId     String
  item       ShopItem  @relation(fields: [itemId], references: [id])
  purchasedAt DateTime @default(now())
  expiresAt  DateTime? // für zeitlich begrenzte Items
  @@unique([userId, itemId])
  @@index([userId])
}

model EquippedCosmetics {
  id              String  @id @default(cuid())
  userId          String  @unique
  user            User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  frameSlug       String? // Avatar-Frame
  backgroundSlug  String? // Profilhintergrund
  nameColorSlug   String? // Namensfarbe
  companionSlug   String? // Pet/Companion
  emoteSlug       String? // Aktives Emote
  musicSlug       String? // Aktive Musik-Playlist
  quizEffectSlug  String? // Quiz-Effekt
  cardThemeSlug   String? // Karteikarten-Theme
  updatedAt       DateTime @updatedAt
}

model UserSubscription {
  id                 String    @id @default(cuid())
  userId             String    @unique
  user               User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  stripeCustomerId   String?
  stripeSubId        String?
  status             String    // "active" | "canceled" | "past_due" | "trialing"
  currentPeriodEnd   DateTime?
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt
}

model StripePurchase {
  id              String   @id @default(cuid())
  userId          String?
  schoolId        String?
  stripePaymentId String   @unique
  amount          Int      // in Cents
  currency        String   @default("eur")
  type            String   // "coins" | "subscription" | "school_license"
  metadata        String?  // JSON
  createdAt       DateTime @default(now())
  @@index([userId])
  @@index([schoolId])
}
```

**Erweiterungen auf User:**
```prisma
// Neue Felder auf User model:
avatarUrl           String?
parentEmail         String?   // Für Eltern-Zahlungslinks
streakFreezeCount   Int      @default(0)
activeBossBoost     Int      @default(1)  // Multiplikator nächster Boss-Hit
activeBoosterUntil  DateTime?
activeBoosterMult   Float    @default(1.0)
lastWheelSpin       DateTime?
extraWheelSpins     Int      @default(0)
isPremium           Boolean  @default(false)
premiumSince        DateTime?
```

### 1.6 Shop UI (Seiten)

- `/app/shop` — Hauptshop mit Kategorien-Tabs
- `/app/shop/[category]` — Kategorie-Ansicht
- `/app/shop/loot-box` — Loot-Box-Öffnung mit Animation
- `/app/shop/wheel` — Glücksrad
- `/app/coins` — Coin-Balance + Gold-Coins kaufen (→ Stripe)
- `/app/inventar` — Eigene Items verwalten + ausrüsten
- Admin: `/admin/shop` — Items anlegen/bearbeiten/deaktivieren

---

## Sub-Projekt 2: Zahlungssystem (Stripe)

### 2.1 Flows

**Flow A — Gold-Coins kaufen (Student, One-Time Payment):**
1. Student klickt Paket auf `/app/coins`
2. POST `/api/payments/coins` → Stripe Checkout Session erstellen
3. Redirect zu Stripe Hosted Checkout
4. Stripe Webhook `checkout.session.completed` → `CoinTransaction` erstellen, `CoinBalance.gold` erhöhen
5. Redirect zurück zu `/app/coins?success=1`

**Flow B — Premium-Abo (Student, Subscription):**
1. Student klickt "Premium werden" auf `/app/premium`
2. POST `/api/payments/subscribe` → Stripe Subscription erstellen
3. Stripe Checkout mit `mode: "subscription"`
4. Webhook `customer.subscription.created/updated/deleted` → `UserSubscription` aktualisieren, `User.isPremium` setzen
5. Täglich Cron-Job: Abgelaufene Premium-Status deaktivieren

**Flow C — Schul-Lizenz (Admin, Subscription):**
1. Admin klickt Plan in `/admin/lizenz`
2. POST `/api/payments/school-license` → Stripe Checkout
3. Webhook → `School.plan` aktualisieren, `StripePurchase` anlegen
4. Automatische Jahresrechnung via Stripe Billing

**Flow D — Eltern-Zahlung:**
1. Student klickt "Eltern bezahlen lassen" auf `/app/coins` oder `/app/premium`
2. System generiert einmaligen Zahlungslink (Stripe Payment Link)
3. Link wird per E-Mail an hinterlegte Eltern-E-Mail gesendet
4. Nach Zahlung: normal wie Flow A/B

### 2.2 Umgebungsvariablen (neu)
```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Stripe Price IDs (werden in Stripe Dashboard erstellt)
STRIPE_PRICE_COINS_500=price_...
STRIPE_PRICE_COINS_1500=price_...
STRIPE_PRICE_COINS_4000=price_...
STRIPE_PRICE_COINS_10000=price_...
STRIPE_PRICE_PREMIUM_MONTHLY=price_...
STRIPE_PRICE_SCHOOL_BASIC=price_...
STRIPE_PRICE_SCHOOL_PRO=price_...
```

### 2.3 Webhook-Handler
`/api/webhooks/stripe` — verarbeitet:
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`

### 2.4 Sicherheit / DSGVO
- Keine Zahlungsdaten in eigener DB (nur Stripe IDs)
- Stripe EU-Rechenzentren (Frankfurt)
- Stripe-Kundendaten im Stripe-Dashboard — AVV mit Stripe abschließen
- Kinder unter 18: Zahlungsflow mit Eltern-E-Mail-Bestätigung

---

## Sub-Projekt 3: Landing Page Revamp

### 3.1 Neue Seitenstruktur

```
/ (Landing Page)
├── Navbar (überarbeitet: "Für Schulen" | "Für Schüler" | Preise | Login)
├── Hero (überarbeitet: Tab-Switch Schule ↔ Schüler)
├── SocialProof (neue Section: Zahlen + Logos)
├── Features (bestehend, leicht erweitert)
├── StudentShowcase (neu: Gamification Feature-Reel)
├── ShopTeaser (neu: Preview des Shops)
├── Comparison (neu: MasterMind vs. Konkurrenz)
├── Pricing (überarbeitet: Schüler-Karten prominenter)
├── FAQ (neu)
├── AppDownload (neu: PWA Install + QR-Code)
├── Pilot (bestehend)
├── CTA (bestehend)
└── Footer (bestehend)
```

### 3.2 Hero überarbeitet

Zwei Tabs: **"Für Schulen"** / **"Für Schüler"**

Schul-Tab (aktueller Stand, leicht poliert):
- Headline: "Lernen, Verwaltung und KI in einer Plattform."
- Subtext: DSGVO, 3-in-1
- CTA: "Schule kostenlos testen" / "Demo buchen"

Schüler-Tab (neu):
- Headline: "Deine Schule. Dein Ranking. Dein Level."
- Subtext: "Lerne, verdiene XP, kaufe Skins und steige auf — alles kostenlos, solange du willst."
- Mockup: Profil-Page mit Rank, Level, Frame, Companion
- CTA: "Kostenlos starten" / "Shop ansehen"

### 3.3 SocialProof Section (neu)
- Große Kennzahlen: "127+ Schulen", "48.000+ Schüler", "2,3 Mio. XP vergeben"
- Lehrer-Zitate (3 Karten mit Namen, Fach, Foto-Placeholder)
- Trust-Logos: DSGVO-konform, Made in Germany, TÜV-ähnliche Badges

### 3.4 StudentShowcase Section (neu)
Feature-Reel mit 6 Karten (je Screenshot-Mockup + Text):
1. "500 Level, 15 Rank-Stufen" — Profil mit Rank-Badge
2. "Boss Battles mit deiner Klasse" — Boss-Battle-Screen
3. "Duelle gegen Mitschüler" — Duell-Quiz-Screen
4. "Tägliche Quests & Belohnungen" — Quest-Liste
5. "Der Shop: Frames, Skins, Booster" — Shop-Preview
6. "Streak Protect & XP-Booster" — Shop-Items

### 3.5 ShopTeaser Section (neu)
Visueller Preview von 4–6 Shop-Items (Avatar-Frames, Companions) mit Coins-Preisen.
Text: "Verdiene Coins durch Lernen — oder kaufe Gold-Coins direkt."
CTA: "Shop entdecken" → Link zu /app/shop (erst nach Login möglich)

### 3.6 Vergleichstabelle (neu)
| Feature | MasterMind | StudySmarter | Quizlet | Anton |
|---|---|---|---|---|
| DSGVO / Deutsche Server | ✅ | ❌ | ❌ | ✅ |
| Schulverwaltung | ✅ | ❌ | ❌ | ❌ |
| Gamification / Shop | ✅ | ⚠️ | ❌ | ⚠️ |
| KI-Tutor | ✅ | ✅ | ❌ | ❌ |
| Boss Battles | ✅ | ❌ | ❌ | ❌ |
| Kostenloser Einstieg | ✅ | ✅ | ✅ | ✅ |

### 3.7 Pricing überarbeitet

**Drei Spalten für Schüler:**
- **Free** — 0€ — Alle Kern-Features, Shop mit Silber-Coins
- **Premium** — €4,99/Monat — Vorteile aus SP-1.3
- **Gold-Coins** — ab €1,99 — Einmalig, kein Abo

**Drei Spalten für Schulen** (bestehend, leicht überarbeitet):
- Basic / Pro / Enterprise

### 3.8 FAQ Section (neu)
- Ist die App DSGVO-konform? → Ja, Server in Deutschland, AVV auf Anfrage
- Läuft MasterMind auf dem Handy? → Ja, PWA für iOS/Android, App Store geplant
- Können Eltern zahlen? → Ja, Zahlungslink-Funktion
- Muss ich für den Shop echtes Geld ausgeben? → Nein, alles auch durch Spielen verdienbar
- Ab welchem Alter? → Ab 10 Jahren, Eltern-Zahlung für unter 18
- Wie kündige ich? → Jederzeit in den Einstellungen

### 3.9 AppDownload Section (neu)
- "Läuft auf iOS, Android, Windows, Mac, Linux"
- PWA-Install Anleitung (3 Schritte mit Icons)
- QR-Code zur App-URL
- Hinweis: "App Store Version in Kürze"

---

## Sub-Projekt 4: Cross-Platform

### 4.1 PWA-Verbesserungen (sofort)

**manifest.json erweitern:**
- `display: "standalone"`
- `orientation: "portrait"`
- Splash-Screen Icons in allen Größen (192, 512, maskable)
- `theme_color` aus Brand-Farbe

**iOS-spezifische Meta-Tags:**
```html
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="MasterMind" />
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
```

**Offline-Modus:**
- Service Worker cacht: Dashboard, Stundenplan, Karteikarten-Decks
- Offline-Banner wenn keine Verbindung
- Sync-Queue für Karteikarten-Sessions

**Install-Prompt:**
- Bestehende `InstallPrompt.tsx` Komponente verbessern
- Für iOS: Anleitung "Teilen → Zum Home-Bildschirm"
- Persistenz: Nach 3 App-Besuchen zeigen, danach nur in Einstellungen

### 4.2 Capacitor-Shell (mittelfristig)

Capacitor.js ermöglicht es, die bestehende Next.js PWA in eine native App zu wrappen:

**Setup:**
```bash
npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
npx cap init MasterMind app.mastermind.de
npx cap add ios
npx cap add android
```

**Native Features:**
- Push Notifications: Bestehender Web-Push wird auf native `@capacitor/push-notifications` umgeleitet
- Haptic Feedback: Bei Duell-Sieg, Level-Up, Loot-Box-Öffnung
- Share API: Achievements und Ranks teilen
- In-App Purchases: `@capacitor/purchase` für Coins/Premium (App Store / Google Play Payments neben Stripe)
- Status Bar: Angepasste Farbe je nach Theme (dark/light)

**Build-Workflow:**
1. `next build && next export` → statisches HTML/JS
2. `npx cap copy` → Assets in iOS/Android-Projekt kopieren
3. Xcode / Android Studio → App Bundle / APK

**App Store Submission:**
- Mindestandforderungen: Privacy Policy, Datenschutzerklärung auf Deutsch/Englisch
- App Store Connect + Google Play Console einrichten
- Screenshots für alle Gerätegrößen (Xcode Simulator)

### 4.3 Electron (optional, später)
- Für Lehrer-Desktop-Nutzung
- Electron-Builder + Auto-Updater
- Nur sinnvoll nach erfolgreichem App Store Release

---

## Fehlende Features die vervollständigt werden

Als Teil dieser Umsetzung werden folgende halb-fertigen Features fertiggestellt:

1. **Avatar-Upload** — Kamera-Button auf Profilseite wird funktional
2. **Prestige Reset UI** — `/app/prestige` Seite für Level-500-Reset
3. **Season-Pass Claim UI** — Tier-Rewards können beansprucht werden
4. **Boss-Battle Titel-Award** — Nach Boss-Sieg wird `boss_slayer` Titel vergeben
5. **Hidden Quest Trigger** — `hidden_night_owl` (Login 22–04 Uhr), `hidden_speed_run` (10 Aufgaben in 10 Min), `hidden_perfectionist` (20 aufeinanderfolgende perfekte Antworten)
6. **Story Quests** — 3 initiale Story-Quest-Ketten werden erstellt
7. **Combo-Integration im Quiz** — Combo-Zähler in QuizEngine wird XP-Multiplikator korrekt anwenden

---

## Implementierungs-Reihenfolge

```
Phase 1 (Fundament, ~2 Wochen):
  1a. Prisma-Schema erweitern (CoinBalance, ShopItem, UserInventory, etc.)
  1b. Coin-Award-System: awardCoins() Funktion, Integration in alle XP-Events
  1c. Shop-Datenbankschicht + Seed mit allen Items
  1d. /app/shop Grundgerüst

Phase 2 (Shop-Features, ~2 Wochen):
  2a. Shop-UI alle Kategorien
  2b. Avatar-Upload + Frame-System
  2c. Equipped Cosmetics → Profil + Ranking
  2d. Loot Boxes + Glücksrad
  2e. Booster-System in awardXp() integrieren
  2f. Streak-Freeze in awardXp() integrieren

Phase 3 (Zahlungssystem, ~1 Woche):
  3a. Stripe-Integration Setup
  3b. Gold-Coins kaufen Flow
  3c. Premium-Abo Flow
  3d. Schul-Lizenz Flow
  3e. Eltern-Zahlung Flow
  3f. Webhook-Handler

Phase 4 (Landing Page, ~1 Woche):
  4a. Hero mit Tab-Switch
  4b. SocialProof + StudentShowcase
  4c. ShopTeaser + Vergleichstabelle
  4d. Pricing überarbeiten
  4e. FAQ + AppDownload Section

Phase 5 (Cross-Platform, ~1 Woche):
  5a. PWA manifest + Meta-Tags verbessern
  5b. Offline-Modus (Service Worker)
  5c. Install-Prompt verbessern
  5d. Capacitor Setup (iOS + Android)

Phase 6 (Fehlende Features, parallel zu Phase 2–4):
  6a. Prestige Reset UI
  6b. Season-Pass Claim
  6c. Boss-Battle Titel-Award
  6d. Hidden Quest Triggers
  6e. Story Quests
  6f. Combo in QuizEngine
```

---

## Preisgestaltung Zusammenfassung

| Produkt | Preis | Modell |
|---|---|---|
| MasterMind für Schüler | Kostenlos | Free |
| Schüler-Premium | €4,99/Monat | Abo |
| Gold-Coins 500 | €1,99 | Einmalig |
| Gold-Coins 1.500 | €4,99 | Einmalig |
| Gold-Coins 4.000 | €9,99 | Einmalig |
| Gold-Coins 10.000 | €19,99 | Einmalig |
| Schul-Basic | €1.490/Jahr | Abo |
| Schul-Pro | €9/User·Jahr | Abo |
| Schul-Enterprise | Auf Anfrage | Abo |

Alle Preise inkl. 19% MwSt. Kein Pay-to-Win: Alle lernrelevanten Features bleiben kostenlos. Shop enthält ausschließlich Kosmetik und Quality-of-Life-Items (Streak-Schutz, Booster).
