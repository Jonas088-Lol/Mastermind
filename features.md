<!-- Copyright 2026 Elian Schock, Jonas Schwenk -->
# MasterMind — Feature-Dokumentation

> **Stand:** Juli 2026  
> **Stack:** Next.js 16 App Router · Prisma · SQLite (Dev) / PostgreSQL (Prod) · Anthropic Claude · VAPID Push · Tailwind CSS

Diese Datei dokumentiert alle implementierten Features der MasterMind-Plattform nach Bereich gegliedert. Zielgruppe: interne Entwickler, Stakeholder und potenzielle Kunden.

---

## Inhaltsverzeichnis

1. [Rollen & Zugriffsmodell](#1-rollen--zugriffsmodell)
2. [Landing Page & Marketing](#2-landing-page--marketing)
3. [Authentifizierung](#3-authentifizierung)
4. [Onboarding](#4-onboarding)
5. [Schüler-Bereich (/app)](#5-schüler-bereich-app)
6. [Lehrer-Bereich (/teach)](#6-lehrer-bereich-teach)
7. [Eltern-Bereich (/eltern)](#7-eltern-bereich-eltern)
8. [Sekretariat (/sekretariat)](#8-sekretariat-sekretariat)
9. [Schulleitung (/rektor)](#9-schulleitung-rektor)
10. [Schul-Admin (/admin)](#10-schul-admin-admin)
11. [Schulträger (/schultraeger)](#11-schulträger-schultraeger)
12. [Plattform-Super-Admin (/plattform & /super)](#12-plattform-super-admin-plattform--super)
13. [KI-Features](#13-ki-features)
14. [Gamification](#14-gamification)
15. [Push-Benachrichtigungen & Offline](#15-push-benachrichtigungen--offline)
16. [API-Endpunkte](#16-api-endpunkte)
17. [Sicherheit & Datenschutz](#17-sicherheit--datenschutz)
18. [E-Mail-System](#18-e-mail-system)
19. [Rechtliche Seiten](#19-rechtliche-seiten)
20. [UI & Design-System](#20-ui--design-system)
21. [Anzeigetafel (Kiosk-Modus)](#21-anzeigetafel-kiosk-modus)
22. [MEGA-Fragen-Bank](#22-mega-fragen-bank)

---

## 1. Rollen & Zugriffsmodell

MasterMind basiert auf einem feingranularen, rollenbasierten Zugriffsmodell. Jede Route prüft serverseitig die Session-Rolle und leitet bei fehlender Berechtigung automatisch um.

### Rollen

| Rolle | Slug | Startseite | Beschreibung |
|-------|------|------------|--------------|
| Schüler | `student` | `/app` | Lernender an einer Schule |
| Lehrkraft | `teacher` | `/teach` | Unterrichtende Lehrkraft |
| Elternteil | `parent` | `/eltern` | Erziehungsberechtigte/r |
| Schul-Admin | `admin` | `/admin` | Schulverwaltung, erstellt Klassen, Nutzer, etc. |
| Schulleiter | `rector` | `/rektor` | Statistiken, Broadcasts, Schulaufsicht |
| Konrektor | `vice_rector` | `/rektor` | Wie Schulleiter, ohne bestimmte Admin-Rechte |
| Sekretariat | `secretary` | `/sekretariat` | Fehlzeiten, Schülerverwaltung |
| Schulträger | `school_company` | `/schultraeger` | Verwaltung mehrerer Schulen |
| Super-Admin | `super` | `/plattform` | Plattformbetreiber, volle Rechte |

### Schüler-Zusatzrollen (Features)

Zusätzlich zur Rolle `student` können pro Schüler-Account mehrere "Features" kombiniert werden (`src/lib/student-features.ts`, gespeichert als JSON-Array in `User.studentFeatures`):

| Feature | Berechtigung |
|---------|-------------|
| `klassensprecher` | Nachrichten an die eigene Klasse senden |
| `schuelersprecher` | Schulweite Nachrichten an alle Schüler senden |
| `schuelerzeitung` | Artikel in der Schülerzeitung veröffentlichen |

Die Vergabe erfolgt durch Admins; Parsing/Serialisierung ist gegen ungültige Werte abgesichert.

### Impersonation (Super-Admin)
Der Super-Admin kann jede Rolle simulieren, ohne Daten zu manipulieren. Die `effectiveRole()` Funktion gibt die aktuell eingenommene Rolle zurück; `session.realRole` bleibt immer `super`. Mit `switchView()` wechselt der Super-Admin die Sichtweise, mit `stopImpersonation()` kehrt er zurück.

### Session-Mechanismus
Sessions werden als signierte JWT-artige Cookies gespeichert (`mm_session`). Jeder Session-Cookie enthält eine zufällige Server-Session-ID (SID), die gegen `prisma.session` geprüft wird. Die Session enthält: `userId`, `email`, `name`, `klasse`, `classId`, `schoolId`, `realRole`, `viewAs`, `iat`, `sid`.

---

## 2. Landing Page & Marketing

**Route:** `/`

Die Landing Page ist vollständig statisch gerendert und enthält keine personalisierten Daten.

### Sektionen

**Navbar**
- MasterMind-Logo mit "MM"-Badge
- Links: Produkt, Preise, Für Schulen, Login
- CTA: "Kostenlos starten" → `/onboarding`

**Hero-Sektion**
- Headline: Lernen, Verwaltung und KI in einer Plattform
- Sub-Headline: DSGVO-konform, Made in Germany
- Zwei CTAs: Demo-Zugang, Schule einrichten
- Visuelle Trust-Signale: Hetzner-Hosting, Anthropic Claude, Zertifizierungen

**Feature-Highlights**
- Kacheln für: KI-Tutor, Stundenplan, Klassenbuch, Noten-Management, Eltern-Zugang, Push-Benachrichtigungen

**Use Cases**
- Für Schulen: Entlastung der Verwaltung
- Für Lehrer: Zeitersparnis bei Korrekturen
- Für Schüler: Individuelles Lernen mit KI
- Für Eltern: Transparenz über Leistungen und Fehlzeiten

**Preissektion**
- Basic: ab 0,90 € / Schüler / Monat (bis 100 Sitze, Standard-Features)
- Pro: 1,49 € / Schüler / Monat (unbegrenzte Sitze, KI, Reports, API)
- Enterprise: Auf Anfrage (Multi-Campus, White-Label, SAML SSO, SLA)

**Pilot-Sektion**
- Früh-Zugang für Testschulen
- Formular mit Schulname, Bundesland, Kontakt

**Footer**
- 4 Spalten: Produkt, Plattform, Unternehmen, Recht
- Verlinkung zu echten Rechtsseiten: Impressum, Datenschutz, AGB, AVV
- Copyright-Jahr dynamisch (`new Date().getFullYear()`)
- "Made with ◆ in Deutschland"

---

## 3. Authentifizierung

### 3.1 Login-Seite (`/login`)

Die Login-Seite bietet zwei Methoden per Tab-Switch:

**Passwort-Login:**
- Felder: E-Mail-Adresse, Passwort
- Server Action `loginWithCredentials()`: Hash-Vergleich (Argon2id), Session-Erstellung, Weiterleitung zu `ROLE_HOME[role]`
- Fehlerbehandlung: Falsche Zugangsdaten, Rate-Limit erreicht, unverifiziert
- Wenn 2FA aktiv: Weiterleitung zu `/login/2fa` statt direktem Login

**Magic Link (Passwortlos):**
- Feld: E-Mail-Adresse
- Server Action `requestMagicLink()`: Token generieren, E-Mail senden
- Sicherheitsantwort: "E-Mail gesendet" – unabhängig davon, ob Adresse existiert (kein E-Mail-Enumeration)
- Link-Format: `/login/magic-link/{token}` (15 Minuten gültig, einmalig)

**Demo-Konten (5 Kacheln):**
- Super-Admin, Schul-Admin, Lehrer, Schüler, Elternteil
- Ein-Klick-Login via `loginAsRole()` für Demonstrationszwecke
- Ausklappbare Credential-Liste mit allen Demo-Accounts

**Rate Limiting:**
- Login: 8 Versuche / 10 Minuten (IP + E-Mail kombiniert)
- Magic Link: 3 Anfragen / 10 Minuten (IP + E-Mail)

### 3.2 Magic-Link-Validierung (`/login/magic-link/[token]`)
- Token aus DB abrufen (prüft: existiert, nicht abgelaufen, nicht verwendet)
- Token als `consumedAt` markieren
- Session erstellen, zu Dashboard weiterleiten

### 3.3 Zwei-Faktor-Authentifizierung (`/login/2fa`)
- TOTP-basiert (kompatibel mit Google Authenticator, Authy, Bitwarden)
- 6-stelliger Code, 30-Sekunden-Fenster
- Pending-Zustand in temporärer DB-Zeile gespeichert (Ablauf nach Timeout)
- Server Action `verifyLoginTwoFactor()`: Code gegen Geheimnis prüfen, echte Session erstellen
- Rate Limiting: 5 Versuche / 5 Minuten pro Nutzer

### 3.4 Passwort-Vergessen (`/login/passwort-vergessen`)
- Formular: E-Mail-Adresse eingeben
- Server Action: `VerificationToken` mit type=`password-reset` erstellen, E-Mail senden
- Rate Limiting: 3 Anfragen / 15 Minuten (IP + E-Mail)
- Sicherheitsantwort: Immer "E-Mail gesendet" (kein E-Mail-Enumeration)

### 3.5 Passwort-Zurücksetzen (`/login/passwort-zuruecksetzen`)
- Query-Param: `?token={token}`
- Token validieren (existiert, nicht abgelaufen, nicht verbraucht)
- Formular: Neues Passwort (min. 12 Zeichen)
- Server Action: Passwort-Hash aktualisieren, Token als verbraucht markieren, Session erstellen

### 3.6 Logout
- Server Action `logout()`: Session aus DB löschen, Cookie entfernen, zu `/login` weiterleiten
- Alle aktiven Sessions bleiben bestehen (nur die aktuelle wird gelöscht), außer bei "Alle abmelden"

---

## 4. Onboarding

### 4.1 Schul-Onboarding (`/onboarding`)

5-schrittiger Wizard für neue Schulen (Schritt via `?step=1-5`):

**Schritt 1 – Schul-Daten**
- Schulname, Schulart (Grundschule, Hauptschule, Realschule, Gymnasium, Gesamtschule, Berufskolleg, Andere)
- Bundesland (alle 16 deutschen Bundesländer)
- Adresse, geschätzte Schüler- und Lehrerzahl
- Verwendung: Lehrplan-Profil, Lizenzgröße, AVV-Vorlage

**Schritt 2 – Plan-Auswahl**
- Basic / Pro (empfohlen) / Enterprise
- Jeder Plan mit Preispunkt, Featureliste, CTA-Button

**Schritt 3 – Anmeldung & Identität**
- 5 Anmelde-Methoden auswählen: Microsoft Entra ID, Google Workspace, Apple School Manager, SAML 2.0, E-Mail+Passwort
- Hinweis: 2FA standardmäßig für Lehrer/Admins erzwungen

**Schritt 4 – Branding**
- Logo hochladen (SVG bevorzugt, PNG min. 512×512)
- 7 voreingestellte Akzentfarben auswählbar
- Sub-Domain vergeben (`rs-muenchen.mastermind.app`)
- Live-Vorschau der Anmeldeseite mit Schul-Branding

**Schritt 5 – Schule aktivieren**
- Schul-Name (Bestätigung)
- Plan-Auswahl (finalisieren)
- Admin-Account: Vor- und Nachname, E-Mail, Passwort (min. 12 Zeichen)
- Server Action `createSchoolAndAdmin()`:
  1. Slug-Generierung (URL-sicher, kollisionsgeprüft)
  2. `school` + `user` (role=admin) in einer Transaktion erstellen
  3. Willkommens-E-Mail senden
  4. Session setzen
  5. Zu `/admin` weiterleiten
- Fehlerbehandlung: E-Mail bereits registriert, Schulname zu kurz, ungültiger Plan

### 4.2 Lehrer-Einladungs-Aktivierung (`/onboarding?token=...&role=teacher`)

Dediziertes Formular für eingeladene Lehrkräfte (kein Wizard):

- Name (vorausgefüllt aus Einladungs-URL, editierbar)
- E-Mail (vorausgefüllt, schreibgeschützt)
- Passwort (min. 8 Zeichen)

Server Action `activateTeacherInvite()`:
1. Token aus DB laden (type=`teacher-invite`)
2. Validierung: existiert, E-Mail stimmt überein, nicht abgelaufen (7 Tage), nicht bereits verwendet
3. Schule anhand `schoolId`-URL-Param prüfen
4. Nutzer anlegen (`role=teacher`, `verifiedAt=now()`)
5. Token als verbraucht markieren (`consumedAt`)
6. Session erstellen → Weiterleitung zu `/teach`

### 4.3 Schüler-Einladungs-Aktivierung (`/onboarding?token=...&role=student`)

Wie Lehrer-Aktivierung, zusätzlich:
- Klasse (vorausgefüllt aus URL, schreibgeschützt – nur wenn vom Admin übergeben)

Server Action `activateStudentInvite()`:
- Legt Nutzer mit `role=student`, `klasse` aus Formular an
- Weiterleitung zu `/app/dashboard`

---

## 5. Schüler-Bereich (/app)

### 5.1 Dashboard (`/app`)

**4 KPI-Karten (obere Zeile):**
- **Streak**: Aktuelle Lern-Serie in Tagen (mit Flammen-Icon)
- **Wochen-XP**: XP diese Woche + Gesamt-XP in Klammern
- **KI-Kontingent**: Verbrauchte / verfügbare KI-Anfragen
- **Ø Note**: Gewichteter Gesamtdurchschnitt aller Fächer

**Abschnitte:**

*Anstehende Aufgaben (7-Tage-Fenster)*
- Die 5 dringendsten offenen Aufgaben der Klasse
- Pro Aufgabe: Fach-Badge, Titel, Lehrkraft, humanisiertes Fälligkeitsdatum (Heute, Morgen, in X Tagen)
- Checkbox (UI-only), "Öffnen"-Link

*Stundenplan heute*
- Alle Stunden des aktuellen Wochentags
- Spalten: Stunde, Fach, Lehrkraft, Raum
- Sortiert nach Unterrichtsstunden-Nummer

*Letzte Noten*
- Die 3 jüngsten Noteneinträge
- Fach, Datum, Note (farbcodiert: grün ≤2,0, gelb ≤3,0, orange ≤4,0, rot >4,0)

*KI-Empfehlungs-Karte* (Marken-Gradient)
- Analysiert jüngste Noten, empfiehlt Lernschwerpunkt
- Zeigt verbleibendes KI-Kontingent
- CTA: "Lernplan starten"

*Tagesaufgabe (Daily Challenge)*
- Deterministisch per Datums-Seed ein Übungsthema auswählen
- Zeigt Titel, Fach, Jahrgangsstufe
- Wird als erledigt markiert, wenn der Schüler den Quiz heute abgeschlossen hat
- CTA: "Aufgabe starten" → `/app/uebungen/{subject}/{grade}/{topicId}/quiz`

*Tages-Lernziel*
- Tagesziel: 50 XP
- Fortschrittsbalken basierend auf heute verdientem XP
- Zählt alle XP-Log-Einträge seit Tagesbeginn

*Letzte Errungenschaften*
- Die 3 zuletzt freigeschalteten Achievements
- Icon, Titel, Beschreibung, Zeitstempel (relativiert: "vor 2 Tagen")

---

### 5.2 Aufgaben (`/app/aufgaben`)

**Übersicht:**
- Alle Aufgaben der Klasse des Schülers
- Filter-Tabs: Alle · Offen · Erledigt · Spät

**Pro Aufgabe:**
- Fach-Badge (farbcodiert), Typ-Badge (Hausaufgabe, Test/KA, Projekt, Prüfung)
- Status-Badge: Verspätet (rot), Bewertet (grün), Abgegeben (blau)
- Fälligkeitsdatum humanisiert
- Lehrkraft-Name
- "Starten"-Button (wenn offen und nicht verspätet)

**Aufgaben-Detail (`/app/aufgaben/[id]`):**
- Vollständige Aufgabenbeschreibung
- Anhänge der Lehrkraft
- Abgabe-Textfeld + Datei-Upload
- Server Action `submitAssignment()`: Erstellt `Submission`-Eintrag
- Server Action `retractSubmission()`: Rücknahme vor Fälligkeit möglich

---

### 5.3 Noten (`/app/noten`)

**Übersicht-Sektion:**
- Gesamt-Ø (gewichtet, alle Fächer)
- Bestes Fach + Note, Schwächstes Fach + Note
- Anzahl Bewertungen gesamt

**Fach-Tabelle:**
- Pro Fach: gewichteter Ø, schriftlicher Ø, mündlicher Ø
- Visuelle Fortschrittsbalken
- "Details"-Link → `/app/noten/{subjectId}`

**Letzte Noten (letzte 8):**
- Datum, Fach, Typ, Note (farbcodiert)

**KI-Coach-Karte:**
- Wenn bestes Fach ≤ 2,0: positive Verstärkung
- Wenn schwächstes Fach ≥ 3,0: "Hier lohnt mehr Übung"
- Wenn schwächstes Fach ≥ 4,0: "Gefährliche Zone — jetzt gegensteuern"
- CTA: "Lernplan starten"

---

### 5.4 Zeugnis-Vorschau (`/app/noten/zeugnis`)

Druckbares HTML-Zeugnis im A4-Format:

**Kopfzeile:**
- Schulname (aus Nutzerprofil)
- Titel: Halbjahreszeugnis
- Schuljahr (automatisch berechnet: z. B. 2025/26)

**Schüler-Info-Box:**
- Name, Klasse, Schuljahr, 1. Halbjahr

**Notentabelle:**
- Spalten: Fach · Note (Ø) · Bewertungen · Tendenz
- Note mit Textbezeichnung: sehr gut, gut, befriedigend, ausreichend, mangelhaft, ungenügend
- Trennstrich, Gesamtdurchschnitt in großer Schrift

**Unterschriften-Sektion:**
- 4 Felder: Datum/Ort, Schulleitung, Klassenlehrkraft, Erziehungsberechtigte/r
- Unterschriftslinien

**Drucken:**
- Client-Komponente `PrintButton` → `window.print()`
- Print-CSS: `@page { size: A4; margin: 20mm 25mm; }`, Navigation ausgeblendet, keine Border/Shadow

---

### 5.5 Lernpfade (`/app/lernen`)

**Übersicht:**
- Zusammenfassung: X Pfade, X in Bearbeitung, X abgeschlossen

**3 Sektionen:**
- In Bearbeitung (0 % < Fortschritt < 100 %)
- Verfügbar (noch nicht gestartet)
- Abgeschlossen (100 %)

**Pro Lernpfad-Karte:**
- Fach-Badge, Titel, Beschreibung (2-zeilig gekürzt)
- Modulanzahl: "X/Y Module"
- Prozentualer Fortschritt + Fortschrittsbalken (grün bei 100 %)

**Lernpfad-Detail (`/app/lernen/[pathId]/[moduleId]`):**
- Modul-Navigation (Sidebar)
- Modul-Inhalt (Text, Videos, Quizfragen)

---

### 5.6 Übungen (`/app/uebungen`)

**Route-Struktur:**
`/app/uebungen/{subject}/{grade}/{topicId}/quiz`

**Fächer:** Mathematik, Deutsch, Englisch, Physik, Chemie, Biologie, Geschichte, Informatik  
**Jahrgangsstufen:** 1–13

**Quiz-Engine (Client-Komponente `QuizEngine`):**
- Fragetypen: Multiple-Choice (`mc`), Lückentext (`fill_blank`), Wahr/Falsch (`true_false`), Reihenfolge (`order`), Zuordnung (`match`)
- Fortschrittsanzeige (Frage X / Y)
- Korrekte/falsche Antwort-Feedback
- Am Ende: XP-Belohnung, Score-Zusammenfassung
- Server Action in `quiz/actions.ts`: XP loggen, Fortschritt in `ExerciseProgress` speichern

**Themennavigation:**
- Fach-Übersicht → Jahrgangsstufen-Auswahl → Themen-Liste → Quiz

**Fragen-Basis:**
- MEGA-Fragen-Bank mit über 120.000 Fragen (siehe [Abschnitt 22](#22-mega-fragen-bank))
- Abdeckung: 19 Fächer (von Mathematik bis Wirtschaft), Klassen 1–13

**Übungs-Statistiken (`/app/uebungen/stats`):**
- Persönliche Auswertung des Übungsfortschritts (pro Fach/Thema)

**Wiederholen (`/app/uebungen/wiederholen`):**
- Gezieltes Wiederholen zuvor falsch beantworteter Fragen

---

### 5.7 Karteikarten (`/app/karteikarten`)

**Routen:**
- `/app/karteikarten` – Deck-Übersicht
- `/app/karteikarten/neu` – Neues Deck erstellen
- `/app/karteikarten/[id]` – Deck-Details und Karten bearbeiten
- `/app/karteikarten/session` – Lernsession (Spaced Repetition)

**Features:**
- Erstellen/Bearbeiten von Karteikarten-Decks (Vorderseite / Rückseite)
- Spaced-Repetition-Algorithmus für optimales Wiederholungsintervall
- Lernfortschritt pro Deck tracken
- Deck mit Klassenkammeraden teilen → +5 XP pro Teilen
- **Import/Export:** Decks als JSON importieren (`importDeck()`-Action, `ImportDeckForm`) und exportieren
- **Deck aus PDF** (`/app/karteikarten/aus-pdf`): Karteikarten aus hochgeladenem PDF generieren

---

### 5.8 Duelle (`/app/duelle`)

**Routen:**
- `/app/duelle` – Aktive und vergangene Duelle
- `/app/duelle/neu` – Neues Duell erstellen
- `/app/duelle/[id]` – Laufendes Duell
- `/app/duelle/challenge` – Klassenkammeraden herausfordern

**Features:**
- Schüler können andere Schüler zu Quiz-Duellen herausfordern
- Asynchrones oder synchrones Spielformat
- Fach-Auswahl (Deutsch, Mathe, Englisch, Physik, Chemie, Biologie, Geschichte, Informatik)
- Annehmen/Ablehnen von Herausforderungen (`acceptDuel()` / `declineDuel()`)
- **Revanche:** Nach abgeschlossenem Duell direkt ein Rückduell starten (`rematchDuel()`)
- **Statistik:** Siege/Niederlagen-Bilanz in der Duell-Übersicht
- XP- und Münz-Belohnung für Gewinner (`COIN_REWARDS`)
- Live-Aktualisierung der Übersicht per Auto-Refresh
- Leaderboard-Integration

---

### 5.9 Klassen-Rangliste (`/app/ranking`)

**Anzeigeformat:**
- Platz 1–3: Goldmedaille 🥇, Silber 🥈, Bronze 🥉 – Rest: Platznummer
- Avatar + Name, "Du"-Badge für aktuellen Nutzer
- Level (berechnet: Level = floor(XP / 100))
- Fortschrittsbalken zum nächsten Level
- Die letzten 5 XP-Log-Einträge: Betrag, Grund, Datum

**XP-Gründe:**
- `aufgabe_abgabe`: Aufgabe abgegeben (+10 XP)
- `aufgabe_bewertet`: Note erhalten (+5–20 XP je nach Ergebnis)
- `karteikarte_session`: Lernsession abgeschlossen (+15 XP)
- `note_geteilt`: Notiz geteilt (+5 XP)
- Tägliche Herausforderung: +25 XP

---

### 5.10 KI-Tutor (`/app/tutor`)

**Interface:**
- Chat-Oberfläche (Sidebar: Themenhistorie, Hauptbereich: Nachrichtenverlauf + Eingabe)
- Streaming-Antworten (Server-Sent Events, token-by-token)
- Quota-Anzeige: verbleibende Anfragen
- **Presets:** Vordefinierte Einstiegs-Prompts als Schnellauswahl-Buttons (z. B. Erklären, Abfragen)

**Verhalten:**
- Lernt schrittweise – gibt nie komplette Lösungen
- Stellt Leitfragen, erklärt Konzepte, zeigt Rechenwege
- Jugendgerechte Sprache (Deutsch, Bayern/NRW/BW Lehrplan)
- Erkennt sensible Themen (Mobbing, Selbstverletzung) → verweist an Lehrkraft / Telefonseelsorge 116111

**Datenschutz:**
- Schüler-/Schulnamen pseudonymisiert (→ Initialen) vor Übermittlung an Anthropic
- Keine dauerhafte Speicherung von Chat-Inhalten
- Anthropic-Verarbeitung über EU-Standardvertragsklauseln (SCCs)

**Rate Limiting:**
- Pro Nutzer: 30 Anfragen / Minute
- Pro IP: 60 Anfragen / Minute

---

### 5.11 Community & Notizen (`/app/community/notizen`)

- Geteilte Lernnotizen der Klasse
- Neue Notiz erstellen (Titel, Inhalt, Fach)
- Notizen ansehen und teilen → XP-Belohnung für Autor

---

### 5.12 Nachrichten (`/app/nachrichten`)

- Thread-basiertes Nachrichtensystem
- Neue Unterhaltung starten
- Teilnehmer: Schüler, Lehrkräfte, Eltern
- Ungelesen-Zähler
- Thread-Ansicht mit chronologischen Nachrichten

---

### 5.13 Profil & XP (`/app/profil`)

- Name, E-Mail, Klasse, Schule
- Gesamt-XP, aktuelles Level
- Streak (konsekutive Lerntage)

**XP-Aufschlüsselung (`/app/profil/xp`):**
- Historisches XP-Log
- Grund pro Eintrag, Betrag, Datum
- Aufschlüsselung nach Aktivitätstyp

---

### 5.14 Einstellungen (`/app/einstellungen`)

**Profil:**
- Name bearbeitbar, E-Mail schreibgeschützt
- Passwort ändern (Altes Passwort + neues Passwort min. 8 Zeichen)

**Darstellung:**
- Theme-Toggle (Hell / Dunkel) via `ThemeButtons`-Client-Komponente

**2FA-Einrichtung (`/app/einstellungen/2fa`):**
- TOTP-Geheimnis generieren
- QR-Code zur Einrichtung anzeigen
- Verifikationscode eingeben zur Bestätigung
- Backup-Codes generieren (10 Stück, einmalig verwendbar, gehasht gespeichert)
- 2FA deaktivieren (erfordert aktuellen Code)

**Geräte:**
- Alle aktiven Sessions mit Gerät/Browser/IP
- Einzelne Sessions beenden (`DeviceLogout`-Komponente)
- "Überall abmelden"-Option

**Weitere Einstellungen:**
- Schriftgröße (`FontSizePicker`) und Sprache (`LangSelector`)
- Klassencode einlösen (`ClassCodeRedeemer`) zum Klassenbeitritt
- App-Download-Hinweis (`AppDownloadSection`)
- Konto löschen (`deleteOwnAccount()`, mit Bestätigung)

**Meine Daten (DSGVO):**
- Abschnitt "Meine Daten" mit Selbst-Export der eigenen personenbezogenen Daten
- Download via `GET /api/user/dsgvo-export` (Art. 15/20 DSGVO)

---

### 5.15 Office-Suite (Dokumente, Tabellen, Präsentationen)

**Dokumente (`/app/dokumente`):**
- Word-ähnlicher Rich-Text-Editor (HTML-basiert), Dokument-Liste mit Zuletzt-bearbeitet
- **Vorlagen** (`templates.ts`): u. a. Formeller Brief — vorstrukturierte Inhalte mit Platzhaltern

**Tabellen (`/app/tabellen`):**
- Excel-Alternative mit Formeln und CSV-Export
- **Diagramme:** Charts aus Tabellendaten (`SpreadsheetCharts`)
- **Sortierung** und **Farbskala** (bedingte Zellenfärbung) im Editor (`SpreadsheetEditor`)

**Präsentationen (`/app/praesentationen`):**
- Folien-Editor auf 16:9-Canvas (Text, Titel, Bilder, Formen — Rechteck/Kreis/Dreieck; Position in Prozent)
- Notizen pro Folie
- **Folien-Vorlagen** (`templates.ts`) in einer Vorlagen-Galerie

**Office-Dark-Mode:** Eigener Theme-Umschalter für die Office-Editoren (`src/components/office/OfficeTheme.tsx`), unabhängig vom App-Theme.

---

### 5.16 Boss-Battles (`/app/boss`)

- Klassenweite Boss-Kämpfe als 2D-Arena: Avatar vs. Boss, Spieler-Herzen, aufploppende Fragen mit Antwort-Erklärung
- Boss-Stufen (`BOSS_TIERS` aus `src/lib/game.ts`), gemeinsamer Boss-HP-Pool (`BossBattle.currentHp`)
- Fragen kommen aus dem Fach-Pool; robuster Fallback auf beliebige Frage, falls der Pool leer ist
- Todes-/Sieg-Animationen (`BossDeathAnimation`, `BossDefeatedOverlay`), Live-Aktualisierung per Auto-Refresh
- **Kompendium** (`/app/boss/kompendium`) und **Bestiarium** (`/app/boss/bestiary`): Übersicht aller Bosse und Fortschritt

---

### 5.17 Quests, Saison, Shop & Münzen

**Quests (`/app/quests`):**
- Tages-, Wochen-, Monats- und versteckte Quests (Pools in `src/lib/game.ts`)
- Schwierigkeitsgrade, Fortschrittsbalken, Belohnung einlösen (`claimQuestReward()`)

**Saison (`/app/saison`):**
- Saisonaler Fortschritt mit Belohnungsstufen (Trophäen/Geschenke), Verknüpfung zu Shop und Rangliste

**Shop (`/app/shop`) & Coins (`/app/coins`):**
- Münz-Währung als zweite Belohnungsschiene neben XP (`src/lib/coins.ts`)
- Käufe im Shop (z. B. kosmetische Items), Inventar unter `/app/inventar`

---

### 5.18 Streaks & Hall of Fame

**Streak-Tracker (`/app/streaks`):**
- Meilensteine bei 7/14/30/60/100 Tagen mit Fortschrittsanzeige
- Wochen-/Kalender-**Heatmap** der Aktivitätstage

**Hall of Fame (`/app/hall-of-fame`):**
- Schulweite Bestenlisten in Kategorien: XP, Münzen, Boss-Schaden, MVP, Streak, Lernzeit u. a.
- Datenschutz: Anzeige nur als Vorname + Initial des Nachnamens

---

### 5.19 Ziele & Belohnungen (`/app/ziele`)

- Eltern setzen Ziele mit Belohnungsversprechen (`RewardPromise`), Schüler sehen offene und erfüllte Ziele
- Einlösen erfüllter Ziele über `/app/ziele-claim`; Gegenstück im Eltern-Bereich (`/eltern/belohnungen`)

---

### 5.20 Schülerzeitung & Sprecher-Nachrichten

**Schülerzeitung (`/app/zeitung`):**
- Alle Schüler lesen veröffentlichte Artikel der eigenen Schule, filterbar nach Rubrik
- Schüler mit Feature `schuelerzeitung` verfassen/veröffentlichen Artikel (`/app/zeitung/neu`)
- Auto-Refresh: neue Artikel erscheinen ohne Neuladen

**Sprecher (`/app/sprecher`):**
- Nur für Schüler mit Feature `klassensprecher` (eigene Klasse) bzw. `schuelersprecher` (schulweit)
- Nachricht wird den Empfängern als Benachrichtigung mit dem Namen des Absenders zugestellt; Meldung an Admins

---

### 5.21 Drive & Lernzettel

**Drive (`/app/drive`):**
- Persönliche Dateiablage (Upload, Ordner, Download) als Client-Oberfläche

**Lernzettel (`/app/lernzettel`):**
- Lernzettel erstellen (`/neu`), bearbeiten und verwalten

---

### 5.22 Weitere Schüler-Seiten

- **Fehlzeiten (`/app/fehlzeiten`):** Eigene Fehlzeiten und Entschuldigungsstatus einsehen
- **Erfolge (`/app/erfolge`), Titel (`/app/titel`), Skills (`/app/skills`):** Achievements, Titel-Auswahl, Skill-Fortschritt
- **Tagesbelohnung (`/app/tagesbelohnung`):** Tägliche Login-Belohnung
- **Mannschaften (`/app/mannschaften`):** Team-Wettbewerbe
- **Vokabeln (`/app/vokabeln`), Hausaufgaben (`/app/hausaufgaben`), Lernplan (`/app/lernplan`), Heft (`/app/heft`), Arbeitsblätter (`/app/arbeitsblatter`)**
- **Plan (`/app/plan`):** Anzeigetafel-Ansicht (siehe Abschnitt 21)

---

## 6. Lehrer-Bereich (/teach)

### 6.1 Dashboard (`/teach`)

**4 KPI-Karten:**
- Schüler gesamt (Zahl + Anzahl Klassen)
- Offene Korrekturen (eingereichte, noch nicht bewertete Abgaben)
- Stunden heute (aus Stundenplan)
- Aufgaben diesen Monat (erstellt)

**Korrektur-Stapel:**
- Die 6 jüngsten unbewerteten Abgaben
- Pro Abgabe: Schüler-Avatar/Name, Fach-Badge, Klasse, Aufgabentitel
- "Öffnen"-Link zu `/teach/korrektur/[submissionId]`
- Link zur vollständigen Korrekturoberfläche

**Meine Klassen:**
- Farbcodierte Klassen-Kacheln
- Fach, Schülerzahl
- Links zu Klassen-Detail-Seiten

**KI-Tools Quick-Access:**
- KA-Generator → `/teach/generator`
- Auto-Korrektur → `/teach/korrektur`
- Kompetenz-Heatmap → `/teach/kompetenzen`
- Lernpfad-Empfehlungen → `/teach/lernpfade`

**Stundenplan heute:**
- Stunde, Fach, Klasse, Raum, Uhrzeit

**Ungelesene Nachrichten:**
- Zahl-Badge, "Nachrichten öffnen"-Button

---

### 6.2 Aufgaben (`/teach/aufgaben`)

**Übersicht:**
- Alle vom Lehrer erstellten Aufgaben
- Status-Übersicht: Demnächst fällig · Bald fällig · Korrektur · Erledigt

**Pro Aufgabe:**
- Fach-Badge, Typ-Badge, Status-Badge
- Fälligkeitsdatum
- Abgabe-Fortschrittsbalken (X/Y eingereicht)
- "Korrigieren"- oder "Details"-Link

**Aufgabe erstellen (`/teach/aufgaben/neu`):**
- Klassen-Auswahl, Fach-Auswahl, Typ
- Titel, Beschreibung (Rich-Text)
- Fälligkeitsdatum/-uhrzeit
- Dateianhänge
- Server Action: Aufgabe anlegen, Schülern der Klasse zuweisen

---

### 6.3 Korrektur-Interface (`/teach/korrektur`)

**Übersicht:**
- Wartende Abgaben gefiltert nach Klasse/Fach

**Abgaben-Detail (`/teach/korrektur/[id]`):**
- Schülername, Aufgabentitel, Einreichungszeitpunkt
- Abgabe-Inhalt (Text + Dateien)
- KI-Vorschlag: vorgeschlagene Note + Feedback-Kommentar
- Eingabe: Note (1,0–6,0), Gewichtung, Kommentar
- "Speichern" → bewertete Note in DB, XP für Schüler
- "KI-Vorschlag übernehmen" → befüllt Felder automatisch

**Bulk-Aktionen:**
- Mehrere Abgaben gleichzeitig bewerten

---

### 6.4 Noten (`/teach/noten`)

**Übersicht:**
- Pro Fach: Ø Note, Anzahl Klassen, Bewertungen gesamt (letzte 200)
- Tabelle: Datum · Schüler · Klasse · Fach · Typ · Note · Kommentar

**Note eintragen (`/teach/noten/neu`):**
- Klasse → Schüler → Fach → Typ (Klausur, Test, Mündlich, Hausaufgabe, Projekt)
- Note (1,0–6,0), Gewichtung, optionaler Kommentar
- Server Action `submitGrade()`: `Grade`-Eintrag anlegen, XP für Schüler loggen

---

### 6.5 Klassen-Management (`/teach/klassen`)

- Liste aller zugewiesenen Klassen (Fach, Schülerzahl)
- Klassen-Detail (`/teach/klassen/[slug]`):
  - Schülerliste mit Noten-Übersicht
  - Einzelner Schüler (`/teach/klassen/[slug]/schueler/[studentId]`): Profil, Notenhistorie, Fehlzeiten
  - Anwesenheit (`/teach/klassen/[slug]/anwesenheit`): Tagesliste mit Anwesenheitsstatus

---

### 6.6 Fehlzeiten-Verwaltung (`/teach/abwesenheit`)

- Schüler nach Datum als fehlend/anwesend/verspätet/entschuldigt markieren
- Massenerfassung pro Klasse/Tag
- Optionale Fehlzeitenbezeichnung
- Server Actions: `markAbsence()`, `excuseAbsence()`

---

### 6.7 Klassenbuch (`/teach/klassenbuch`)

**Übersicht:**
- Datumsnavigation (Vor/Zurück/Heute)
- Tages-Statistiken: Anwesend · Fehlend · Entschuldigt · Einträge · Unterzeichnet

**Stundeneintrag:**
- Unterrichtsstunde, Fach, Klasse
- Unterrichtsinhalt (was wurde behandelt)
- Hausaufgaben
- Anwesenheit pro Schüler mit `AttendanceButtons`-Komponente (Anwesend / Verspätet / Entschuldigt / Fehlt)

**Vorfälle (`/teach/klassenbuch/vorfall`):**
- Typ: Verweis, Lob, Notiz
- Schüler, Klasse, Freitext
- Automatischer Zeitstempel
- Server Action: `recordIncident()`

**Unterzeichnung:**
- Server Action `signLesson()`: Markiert Stundeneintrag als offiziell unterzeichnet
- Unterzeichnete Stunden erscheinen mit Signierstatus-Badge

---

### 6.8 Kompetenz-Heatmap (`/teach/kompetenzen`)

- Heatmap-Visualisierung der Klassen-Kompetenzen
- Zeilen: Schüler · Spalten: Curriculum-Kompetenzen/Themen
- Farbe zeigt Beherrschungsgrad an
- Identifiziert klassenweite Lücken
- Empfiehlt Lehrschwerpunkte

---

### 6.9 Prüfungs-Generator (`/teach/generator`)

**Formular:**
- Klasse, Fach, Jahrgangsstufe, Dauer (Minuten), Fragenanzahl
- Schwierigkeitsgrad: Leicht / Mittel / Schwer
- Themen-Mehrfachauswahl

**KI-Generierung:**
- Erstellt Multiple-Choice, Kurzantwort- und Aufsatz-Fragen via Anthropic Claude
- Lehrplan-konform (Bayern/NRW/BW Curriculum-Standards)
- Server Action `generateExam()` → JSON-Fragen zurückgeben
- Download als PDF/DOCX via `downloadExam()`

---

### 6.10 Lernpfade (`/teach/lernpfade`)

- Übersicht aller erstellten Lernpfade
- Fortschritts-Tracking pro Schüler
- Lernpfad erstellen (`/teach/lernpfade/neu`): Fach, Titel, Beschreibung, Module

**KI-Empfehlungen:**
- "Für Schüler X empfehlen" → KI generiert Begründung anhand jüngster Noten
- Lehrkraft genehmigt → Schüler erhält Empfehlung in `/app/lernen`

---

### 6.11 Broadcast-Nachrichten (`/teach/broadcast`)

- Schulweite oder klassenweite Ankündigungen
- Zielgruppe: Alle Schüler · bestimmte Klasse · Alle Eltern · Alle
- Rich-Text-Editor, optionale Bild-Anhänge
- Server Action `sendBroadcast()`: Nachricht in Notification-Queue einreihen

---

### 6.12 Nachrichten (`/teach/nachrichten`)

- Thread-basiertes Messaging identisch zu Schüler-Bereich
- Unterhaltungen mit Schülern, Eltern, Kollegen starten/fortführen

---

### 6.13 Einstellungen (`/teach/einstellungen`)

- Anzeigename bearbeitbar, E-Mail schreibgeschützt
- Unterrichtsfächer (lesen, Admin-verwaltet)
- Benachrichtigungspräferenzen
- Profil (`/teach/profil`): Avatar, Kurzbiografie

---

### 6.14 Aufgaben-Vorlagen (`/teach/vorlagen`)

- Wiederverwendbare Aufgaben-Vorlagen (`AssignmentTemplate`): Aufgabentext, Typ, max. Punkte
- Eigene Vorlagen + von Kollegen geteilte Vorlagen (`shared`-Flag) derselben Schule
- Vorlagen-Verwaltung als Client-Oberfläche (`VorlagenClient`)

---

### 6.15 Elternbrief-Generator (`/teach/elternbrief`)

- KI-gestützt: Stichpunkte eingeben → fertig formulierter Elternbrief
- Lehrkraft behält die Endkontrolle und kann den Text vollständig bearbeiten
- Funktioniert nur bei konfigurierter KI (`isAiConfigured()`), sonst Hinweis

---

### 6.16 Statistiken (`/teach/statistiken`)

- Auswertungen über eigene Klassen: Notendurchschnitte, Trends (steigend/fallend), Abgabequoten
- Farbcodierte Notenwerte, Fortschrittsbalken, Warnhinweise bei Auffälligkeiten

---

### 6.17 Sitzplan (`/teach/sitzplan`)

- Sitzplan-Ansicht pro Klasse (Raster-Darstellung der Schüler)
- Klassen-Auswahl per Dropdown

---

## 7. Eltern-Bereich (/eltern)

### 7.1 Dashboard (`/eltern`)

**Mehrere Kinder:**
- Multi-Kind-Wechsler in der Navigation (alle verknüpften Kinder mit Klasse + Ø Note)
- Alle Anzeigen beziehen sich auf das ausgewählte Kind

**5 KPI-Karten:**
- Ø Note (gewichtet, alle Fächer)
- Anwesenheitsquote (Anwesend / Gesamttage in %)
- Unentschuldigte Fehlzeiten (Anzahl)
- Verspätungen (Anzahl dieses Halbjahrs)
- Offene Aufgaben (aktuell fällig/ausstehend)

**Sektionen:**
- Letzte 5 Noten mit Fach, Datum, Wert
- Fehlzeiten dieses Halbjahrs (Datum, Status: Entschuldigt / Ausstehend / Abgelehnt, Grund)
- Stundenplan heute (Stunde, Fach, Lehrkraft, Raum)
- Nachrichten-Widget (ungelesene Anzahl + Link)
- Nächste 3 Aufgaben des Kindes (Fach, Fälligkeit)
- Quick-Access: Alle Noten · Aufgaben · Krankmeldung

---

### 7.2 Noten (`/eltern/noten`)

- Gesamt-Ø, Bestes/Schwächstes Fach
- Fach-Aufschlüsselung (schriftlich, mündlich)
- Letzte Noten-Tabelle
- Fach-Detail-Links

---

### 7.3 Aufgaben (`/eltern/aufgaben`)

- Alle Aufgaben des Kindes mit Status
- Fach, Typ, Fälligkeit, Abgabestatus sichtbar

---

### 7.4 Stundenplan (`/eltern/stundenplan`)

- Wochenansicht des Kindes
- Fach, Lehrkraft, Raum pro Stunde

---

### 7.5 Abwesenheitsmeldung (`/eltern/abwesenheit`)

**Formular:**
- Datumsbereich (Von / Bis)
- Grund: Krankheit · Arztbesuch · Urlaub · Sonstiges
- Optionaler Anhang (ärztliches Attest)

Server Action `reportAbsence()`:
- Erstellt `Absence`-Eintrag mit Status `pending`
- Sekretariat/Lehrkraft sieht und genehmigt/lehnt ab

---

### 7.6 Nachrichten (`/eltern/nachrichten`)

- Thread-basiertes Messaging
- Neue Unterhaltung mit Lehrkräften starten
- Bestehende Threads fortführen

---

### 7.7 Einstellungen (`/eltern/einstellungen`)

- Anzeigename, E-Mail (schreibgeschützt)
- Benachrichtigungspräferenzen
- Verknüpfte Kinder verwalten

---

### 7.8 Belohnungen & Ziele (`/eltern/belohnungen`)

- Eltern legen pro Kind Ziele mit Belohnungsversprechen an (`createPromise()`)
- Status-Verwaltung: Offen · Erfüllt · Abgebrochen (`fulfillPromise()` / `cancelPromise()`)
- Kinder sehen die Ziele unter `/app/ziele`

---

### 7.9 Wochenbericht (`/eltern/bericht`)

- Kompakter Wochenbericht pro Kind: Noten mit Tendenz (steigend/fallend), Streak, Fehlzeiten, erledigte Aufgaben
- Tagesaufschlüsselung Mo–So, farbcodierte Notenbewertung

---

## 8. Sekretariat (/sekretariat)

**Zugriffsrollen:** secretary · rector · vice_rector · admin · super

### 8.1 Dashboard (`/sekretariat`)

- Schnellstatistiken: Klassen · Schüler · Fehlzeiten heute

**Sidebar-Navigation (`SekretariatNav`):**
- Dashboard, Klassen, Schüler, Fehlzeiten

---

### 8.2 Klassen (`/sekretariat/klassen`)

- Alle Schulklassen mit Schülerlisten
- Klassenleitung, Klassengröße
- Export-Funktion für Klassenlisten

---

### 8.3 Schüler (`/sekretariat/schueler`)

- Schüler-Verzeichnis mit Kontaktdaten
- Eltern-Verknüpfung sichtbar
- Basis-Infos editierbar (Sekretariats-Rolle)

---

### 8.4 Fehlzeiten (`/sekretariat/fehlzeiten`)

- Tages-Fehlzeitenübersicht
- Filter nach Klasse, Datum
- Fehlzeiten-Statistiken (Häufigkeiten, Trends)
- Ausstehende Abwesenheitsmeldungen der Eltern → Genehmigen / Ablehnen

---

## 9. Schulleitung (/rektor)

**Zugriffsrollen:** rector · vice_rector · admin · super

### 9.1 Dashboard (`/rektor`)

- Schüleranzahl, Lehreranzahl, Klassenanzahl
- Ø Note schulweit
- Fehlzeiten letzten Monat (Zahl)

---

### 9.2 Statistiken (`/rektor/statistiken`)

- Notenverteilungs-Diagramme
- Fehlzeiten-Trends
- Lehrer-/Klassenvergleiche
- Performance-Dashboards

---

### 9.3 Broadcast (`/rektor/broadcast`)

- Schulweite Ankündigungen senden
- Zielgruppen: Lehrer · Schüler · Eltern · Alle
- Zeitgesteuerte Veröffentlichung (optional)

---

## 10. Schul-Admin (/admin)

**Zugriffsrollen:** admin · super

### 10.1 Dashboard (`/admin`)

**4 KPI-Karten:**
- Aktive Nutzer gesamt (mit Rollenaufschlüsselung)
- Klassen
- Logins heute (aktive Sessions)
- KI-Anfragen diesen Monat (Kontingentnutzung)

**Dynamische Admin-Aufgaben** (adaptiv zum Schulzustand):
- Warnung: X Nutzer noch nie eingeloggt
- Gefahr: X unverifizierte Lehrkräfte
- Info: X Abgaben warten auf Korrektur
- Warnung: Kapazität erreicht 90 %

**Nutzer-Aufschlüsselung:**
- Kreisdiagramm: Schüler / Lehrer / Eltern / Admin
- Fortschrittsbalken pro Rolle

**Audit-Log (letzte Einträge):**
- Jüngste Aktionen: Noten eingetragen, Nutzer registriert
- Akteur, Aktion, Ziel, Zeitstempel
- Link zum vollständigen Export

---

### 10.2 Nutzerverwaltung (`/admin/nutzer`)

**Übersicht:**
- Alle Schulnutzer mit Rolle, E-Mail, Verifikationsstatus, 2FA-Status, letzte Session
- Filter: Rolle · Status (unverifiziert) · Suche (Name/E-Mail)
- 2FA-Rollout-Fortschrittsbalken (X/Y Lehrer/Admins mit 2FA)
- CSV-Export-Button

**Nutzer anlegen (`/admin/nutzer/neu`):**
- Name, E-Mail, Rolle (Schüler/Lehrer/Elternteil), Klasse (optional)
- Zufälliges Temp-Passwort wird generiert

**Lehrer einladen (`/admin/nutzer/einladen`):**
- E-Mail + Name eingeben
- Server Action `inviteTeacher()`:
  - `VerificationToken` (type=`teacher-invite`, 7 Tage) erstellen
  - Einladungs-E-Mail mit Link senden: `/onboarding?token=...&role=teacher&schoolId=...`
- Lehrer richtet Passwort selbst ein

**Schüler einladen (`/admin/nutzer/schueler-einladen`):**
- Name, E-Mail, Klasse (optional)
- Server Action `inviteStudent()`: analog zu Lehrer-Einladung, type=`student-invite`
- Aktivierungs-Link: `/onboarding?token=...&role=student&schoolId=...&klasse=...`

---

### 10.3 Klassen-Management (`/admin/klassen`)

- Klassen erstellen/bearbeiten
- Lehrkräfte Klassen zuweisen (TeacherSubjectClass-Mapping)
- Schüler Klassen zuweisen
- Klassen-Profile konfigurieren (Name, Größe, Jahrgangsstufe)

---

### 10.4 Fächer (`/admin/faecher`)

- Schulspezifische Fächer definieren (Name, Kürzel, Farbe)
- Farbcodierung für UI-Badges
- Curriculum-Standards-Verknüpfung

---

### 10.5 Stundenplan-Verwaltung (`/admin/stundenplan`)

- Stundenplan hochladen (Excel/CSV im Untis-Format)
- Perioden konfigurieren (Startzeiten pro Stunde)
- Lehrer-Fach-Klassen-Raum-Zuweisung pro Zeitslot
- Konflikt-Erkennung (gleicher Lehrer/Raum zur gleichen Zeit)
- Massen-Zuweisung zu Klassen
- iCal-Export verfügbar

---

### 10.6 Notenspiegel (`/admin/notenspiegel`)

- Notenverteilungs-Analyse
- Pro-Fach-Zusammenfassung
- Pro-Klasse-Zusammenfassung
- Lehrer-Arbeitsbelastung (eingetragene Noten pro Lehrkraft)

---

### 10.7 Abgaben-Übersicht (`/admin/abgaben`)

- Alle Schüler-Abgaben und Bewertungsstatus
- Ausstehende Abgaben pro Lehrkraft
- Erinnerungen an Lehrkräfte senden

---

### 10.8 Branding (`/admin/branding`)

**Anpassbare Elemente:**
- Schul-Logo (SVG/PNG, Validierung nach Typ/Größe)
- Primäre Markenfarbe (Hex-Picker)
- Subdomain (z. B. rs-muenchen.mastermind.app)
- Anmeldeseiten-Vorschau in Echtzeit

Server Action `updateBranding()`: Logo + Farbe in DB speichern

---

### 10.9 Sicherheit (`/admin/sicherheit`)

**Einstellungen:**
- 2FA-Erzwingungs-Richtlinie: Aus · Empfohlen (für Lehrer) · Pflicht (für alle Lehrer)
- SSO-Konfiguration
- Session-Timeout
- IP-Allowlist (bei SSO)
- Passwort-Richtlinie (Mindestlänge, Komplexität)
- Zugriff auf Aktivitäts-Audit-Log

Server Action `updateSecurityPolicy()`: Einstellungen in DB speichern  
Server Action `exportAuditLog()`: Compliance-Bericht herunterladen

---

### 10.10 Lizenz-Verwaltung (`/admin/lizenz`)

- Aktueller Plan (Basic/Pro/Enterprise)
- Sitze belegt / zugewiesen
- Abrechnungsstatus
- Upgrade-Pfad
- Nutzungsanalytics

---

### 10.11 Integrationen (`/admin/integrationen`)

Pro Integration: Konfigurations-Status, Einrichtungsanleitung, Verbindungstest

- Microsoft Entra ID (SAML+SCIM)
- Google Workspace (OAuth)
- Apple School Manager
- Untis Stundenplan
- WebUntis API

---

### 10.12 Audit-Log (`/admin/audit`)

- Vollständiges Audit-Trail aller Schulaktionen
- Filter: Akteur · Aktion · Datumsbereich
- Export als CSV/JSON
- DSGVO Art. 32 (Rechenschaftspflicht) konform

---

### 10.13 Anzeigetafel-Verwaltung (`/admin/anzeigetafel-verwaltung`)

- Ankündigungen für die schulische Anzeigetafel (siehe Abschnitt 21) pflegen
- Aktionen: Erstellen, Löschen, Ein-/Ausblenden, Reihenfolge per Hoch/Runter verschieben
- Akzentfarbe pro Ankündigung aus 6er-Farbpalette (Blau, Grün, Gelb, Rot, Violett, …)
- Vorschau der Tafel unter `/admin/anzeigetafel`

---

### 10.14 Vertretungsplan (`/admin/vertretungsplan`)

- Vertretungen pro Tag erfassen (Klasse, Stunde, Vertretungslehrkraft/Entfall, Raum)
- **Schnellerfassung:** Kompaktformular zum zügigen Eintragen mehrerer Vertretungen
- Vertretungen erscheinen auf der Anzeigetafel und in der Read-only-API (`/api/v1/vertretungen`)

---

### 10.15 Berichte (`/admin/berichte`)

- Auswertungs-Dashboard: Nutzer-, Noten- und Fehlzeiten-Kennzahlen mit Trends
- **CSV-Downloads:**
  - `/api/admin/export/nutzer` — Nutzerliste (Name, E-Mail, Rolle, Klasse)
  - `/api/admin/export/noten` — Noten (Schüler, Fach, Note, Art)
  - `/api/admin/export/fehlzeiten` — Anwesenheit & Gründe

---

## 11. Schulträger (/schultraeger)

**Zugriffsrollen:** school_company · super

### Dashboard (`/schultraeger`)

- Verwaltete Schulen gesamt
- Gesamtnutzer aller Schulen
- Klassen gesamt

**Schulliste:**
- Pro Schule: Name, Stadt, Bundesland, Plan (Basic/Pro/Enterprise)
- Nutzerzahl, Klassenzahl, Beitrittsdatum
- Kapazitäts-Nutzungsbalken (Warnung bei 90 %)

**Statistiken (`/schultraeger/statistiken`):**
- Multi-Schul-Analytics
- Nutzungstrends
- Umsatz-Tracking

---

## 12. Plattform-Super-Admin (/plattform & /super)

**Zugriffsrolle:** super (ausschließlich)

### Dashboard (`/plattform`)

**4 KPI-Karten:**
- Aktive Schulen gesamt
- Nutzer plattformweit
- Aufgaben gesamt
- Noten gesamt

**Alle Schulen (paginiert):**
- Name, Stadt, Bundesland, Plan
- Nutzer / Kapazität, Klassen
- Beitrittsdatum, Admin-E-Mail (Hover)
- Kapazitäts-Fortschrittsbalken

**Plattform-Aktivität:**
- Schul-Registrierungen, Nutzer-Beitritte
- Relative Zeitstempel

**System-Health (Monitoring):**
- DB-Status (SQLite/PostgreSQL, Frankfurt)
- API-Status
- KI-Provider-Status (Anthropic)
- Push-Service-Status (VAPID)
- Farbindikatoren: Grün OK · Gelb Warnung · Rot Alarm

---

### Feature Flags (`/plattform/flags`)
- Features pro Schule oder global aktivieren/deaktivieren
- Schrittweises Rollout konfigurieren
- A/B-Test-Steuerung

### Knowledge Base (`/plattform/kb`)
- FAQ und Dokumentation
- Troubleshooting, Integrations-Guides, API-Dokumentation

### Support (`/plattform/support`)
- Ticket-Management
- Schul-Support-Queue, Eskalation, SLA-Tracking

### Plattform-Audit-Export (`/plattform/audit`)
- Audit-Log aller Schulen
- GDPR/DSGVO-konformer Export
- Datumsbereichsfilterung

### Impersonation
- Beliebige Rolle aller Schulen annehmen (Super-Admin-Feature)
- `switchView(schoolId, role)` → Sichtweise wechseln
- `stopImpersonation()` → Zurück zu Super-Admin

---

## 13. KI-Features

### 13.1 KI-Tutor (`/api/ai/tutor`)

**Technologie:** Anthropic Claude via Streaming-SSE

**Endpunkt:** `POST /api/ai/tutor`  
**Authentifizierung:** Session (student · super)

**Request-Format:**
```json
{
  "messages": [
    { "role": "user", "content": "Erkläre mir den Satz des Pythagoras" },
    { "role": "assistant", "content": "..." }
  ]
}
```

**Response-Ereignisse (SSE):**
```
event: meta
data: { "quota": { "used": 12, "limit": 50 }, "configured": true }

event: token
data: { "token": "...", "index": 0 }

event: done
data: {}

event: error
data: { "message": "Rate limit exceeded" }
```

**System-Prompt-Richtlinien:**
- Schrittweise Erklärungen – nie vollständige Lösungen liefern
- Leitfragen stellen, die zum eigenständigen Denken anregen
- Mathematische Rechenwege klar zeigen
- Schulischer Lehrplan Bayern/NRW/BW
- Safeguarding: Bei sensiblen Themen (Mobbing, Selbstverletzung) → Telefonseelsorge 116111 nennen

**Quota-Tracking:** Pro Nutzer wöchentlich begrenzt; `AiUsage`-Tabelle in DB inkrementiert

**Datenschutz:** Pseudonymisierung vor API-Aufruf (Namen → Initialen), Standard-Vertragsklauseln für USA-Übermittlung

---

### 13.2 KI-Prüfungs-Generator (`/teach/generator`)

- Inputs: Fach, Klasse, Jahrgang, Dauer, Fragenanzahl, Schwierigkeitsgrad, Themen
- Outputs: Multiple-Choice, Kurzantwort, Aufsatz
- Lehrplan-konform für das jeweilige Bundesland
- Export als PDF/DOCX

---

### 13.3 KI-Auto-Korrektur (`/teach/korrektur`)

- Schüler-Abgaben werden per KI vorbewertet
- Vorgeschlagene Note + Feedback-Kommentar
- Lehrkraft kann Vorschlag übernehmen oder überschreiben
- Signifikante Zeitersparnis bei schriftlichen Arbeiten

---

### 13.4 Kompetenz-Heatmap (KI-gestützt)

- Notenhistorie + Aufgabendaten → Kompetenz-Profil pro Schüler
- Klassen-Heatmap identifiziert systemische Wissenslücken
- Empfiehlt unterrichtliche Nachsteuerung

---

### 13.5 Lernpfad-Empfehlungen (KI-gestützt)

- Analysiert Schüler-Performance (Noten der letzten 30 Tage)
- Generiert personalisierte Begründung für Lernpfad-Empfehlung
- Lehrkraft genehmigt → Schüler sieht empfohlenen Pfad

---

## 14. Gamification

### 14.1 XP-System

**Quelle:** `/src/lib/xp.ts`

Level-Formel: `level = Math.floor(xp / 100)` (Level 1 = 100 XP, Level 2 = 200 XP, ...)

| Ereignis | XP |
|----------|----|
| Aufgabe abgegeben | +10 |
| Note erhalten | +5–20 (je nach Ergebnis) |
| Karteikarten-Session | +15 |
| Notiz geteilt | +5 |
| Tages-Herausforderung | +25 |
| Duell gewonnen | variabel |

**Streak-Tracking:** Konsekutive Tage mit mindestens einer XP-Aktivität

---

### 14.2 Achievements

**Quelle:** `/src/lib/achievements.ts`

Beispiel-Achievements:
- Erste Schritte – Erste Aufgabe eingereicht
- Geschwindigkeitsrekord – Quiz in < 5 Minuten abgeschlossen
- Wissensmeister – Level 10 erreicht
- Sozial aktiv – 5 Notizen geteilt
- Beständigkeit – 30-Tage-Streak
- Und viele weitere...

**Speicherung:** `UserAchievement`-Tabelle mit `achievementSlug`, `unlockedAt`, `userId`

---

### 14.3 Klassen-Rangliste

- Ranglistenposition unter Klassenkameraden
- Level, Fortschrittsbalken zum nächsten Level
- Letzte 5 XP-Log-Einträge sichtbar
- Podium-Design für Top 3 (Gold/Silber/Bronze)

---

### 14.4 Duelle

- Schüler können andere zu Quiz-Wettbewerben herausfordern
- Asynchrones Spielformat
- Fach- und Themenauswahl
- XP-Belohnungen für Sieger

---

### 14.5 Tages-Herausforderung

- Täglich neues Übungsthema (deterministisch per Datum-Seed)
- Dashboard-Karte mit Fortschrittstracking
- +25 XP bei Abschluss
- Streak-Beitrag

---

## 15. Push-Benachrichtigungen & Offline

### 15.1 Service Worker (`/public/sw.js`)

**Caching-Strategie:**
- Vorgehalten (Precache): `/`, `/login`, `/offline`
- Navigation: Network-First
- `_next/static/*` + Icons: Cache-First
- Offline-Fallback: `/offline`-Seite

**Push-Ereignis-Handler:**
- Empfängt Backend-Push-Nachrichten
- Zeigt Browser-Notification mit Titel + Inhalt
- Klick öffnet zugehörige URL in neuer/bestehender Fensterinstanz

---

### 15.2 Push-Subscription (`/api/push/subscribe`)

**POST-Endpunkt:**  
- Speichert Browser-Subscription (Endpoint + VAPID-Schlüssel) in `PushSubscription`-Tabelle
- Verknüpft mit Nutzer-Session

**VAPID-Konfiguration:**
- Public Key: `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (Browser-seitig)
- Private Key: `VAPID_PRIVATE_KEY` (Server-seitig, geheim)
- Absender-E-Mail: `VAPID_EMAIL`

**Benachrichtigungs-Typen:**
- Aufgabe fällig (24h vorher)
- Note eingetragen
- Nachricht empfangen
- Lehrer-/Admin-Broadcast
- Fehlzeit genehmigt/abgelehnt

**Opt-In UI (`PushSubscribeToggle`):**
- Client-Komponente
- Zustände: Laden · Nicht unterstützt · Verweigert · Abonniert · Abbestellt
- Button-Toggle: Benachrichtigungen an/aus
- VAPID-Key aus API abrufen, Browser-Permission anfragen

---

### 15.3 Offline-Seite (`/offline`)

- Angezeigt, wenn Navigation ohne Netz fehlschlägt
- "Neu laden"-Button zum Retry
- Hinweis: einige Features offline nicht verfügbar

---

## 16. API-Endpunkte

### `POST /api/ai/tutor`
KI-Tutor-Chat (Streaming SSE). Auth: Session (student/super). Rate-Limit: 30 req/min user, 60/min IP.

### `POST /api/push/subscribe`
Browser für Push-Benachrichtigungen registrieren. Auth: Session. Body: WebPush-Subscription-Objekt.

### `GET /api/stundenplan/ical`
Stundenplan als iCal exportieren. Query: `?classId=...` oder `?userId=...`. Output: `.ics`-Datei.

### `GET /api/admin/dsgvo-export`
DSGVO-Datenvollexport für eine Schule. Auth: Admin. Output: ZIP mit JSON-Dateien (Nutzer, Noten, Aufgaben, Audit-Log).

### `GET /api/admin/users-export`
Nutzer-Liste als CSV. Auth: Admin. Spalten: Name, E-Mail, Rolle, Klasse, Status.

### `GET /api/admin/audit-export`
Audit-Trail als CSV. Auth: Admin.

### `GET /api/super/audit-export`
Plattformweiter Audit-Export. Auth: Super.

### `POST /api/upload`
Allgemeiner Datei-Upload (Aufgaben, Notizen). Auth: Session. Output: `{ fileId, url }`.

### `POST /api/upload/notes`
Notiz-Datei-Upload. Auth: Session. Output: `{ url, size }`.

### `GET /api/health`
Health-Check für Uptime-Monitoring. Output: `{ status: "ok", timestamp }`.

### `GET /api/user/dsgvo-export`
Selbst-Export der eigenen personenbezogenen Daten (Art. 15/20 DSGVO). Auth: Session.

### Read-only API v1 (`/api/v1/*`)

Öffentliche, schreibgeschützte Schnittstelle für Drittsysteme. Auth: `Authorization: Bearer <API-Token>` (Token-Verwaltung unter Admin → Sicherheit, Prüfung via `authenticateApiRequest()`).

| Endpunkt | Antwort |
|----------|---------|
| `GET /api/v1/klassen` | Klassen (id, Name, Jahrgangsstufe, aggregierte Schüleranzahl) |
| `GET /api/v1/stundenplan` | Stundenplan-Daten |
| `GET /api/v1/vertretungen` | Vertretungen |
| `GET /api/v1/termine` | Schultermine |

DSGVO: Es werden keine personenbezogenen Schülerdaten ausgegeben — nur aggregierte bzw. organisatorische Daten.

---

## 17. Sicherheit & Datenschutz

### 17.1 Session-Sicherheit

- `HttpOnly`-Cookies (kein JS-Zugriff)
- `SameSite: lax` (CSRF-Schutz)
- `Secure: true` in Production (HTTPS only)
- Server-seitige Session-Validierung bei jedem Request
- Session-Token: 32 Bytes kryptografisch zufällig (Base64url)
- Session-Ablauf: 7 Tage, `lastUsedAt`-Update bei jedem Zugriff

### 17.2 Passwort-Sicherheit

- **Algorithmus:** Argon2id (memory-hard, salt-basiert)
- **Mindestlänge:** 12 Zeichen (Admin-Onboarding), 8 Zeichen (Lehrer/Schüler-Aktivierung)
- Keine Klartextspeicherung
- Password-Reset über signierte E-Mail-Token (15 Minuten gültig)

### 17.3 Rate Limiting

| Endpunkt | Limit | Fenster |
|----------|-------|---------|
| Login | 8 Versuche | 10 Minuten (IP + E-Mail) |
| Magic Link | 3 Anfragen | 10 Minuten |
| Passwort-Reset | 3 Anfragen | 15 Minuten |
| 2FA-Code | 5 Versuche | 5 Minuten |
| KI-Tutor | 30 Anfragen | 1 Minute (Nutzer) |
| KI-Tutor | 60 Anfragen | 1 Minute (IP) |

Implementierung: Upstash Redis (Production) / In-Memory-Fallback (lokale Entwicklung, nicht für Produktion)

### 17.4 2FA (Zwei-Faktor-Authentifizierung)

- **Protokoll:** TOTP (RFC 6238), kompatibel mit Google Authenticator, Authy, Bitwarden
- **Geheimnis-Generierung:** via `speakeasy`-Bibliothek
- **QR-Code:** Direkt in der App anzeigbar zur Einrichtung
- **Backup-Codes:** 10 Stück, einmalig verwendbar, gehasht gespeichert
- **Admin-Richtlinien:** Pro Schule konfigurierbar (Aus / Empfohlen / Pflicht für Lehrer)
- **Pending-State:** Temporäre DB-Zeile während 2FA-Flow (verhindert Session-Fixation)

### 17.5 Datenschutz (DSGVO)

- **Daten-Hosting:** Ausschließlich Deutschland (Frankfurt am Main / Hetzner)
- **Verantwortlicher:** Schule (als Auftragsverarbeiter-Vertragspartner)
- **Auftragsverarbeiter:** MasterMind GmbH (gem. Art. 28 DSGVO, AVV)
- **KI-Datenübertragung:** Pseudonymisierung + SCCs (Art. 46 DSGVO) für Anthropic (USA)
- **DSGVO-Export:** Admin kann vollständigen Datensatz als ZIP exportieren
- **Löschung:** Alle personenbezogenen Daten binnen 30 Tagen nach Vertragsende
- **Audit-Log:** Vollständiges Trail aller datenschutzrelevanten Aktionen (Art. 32 DSGVO)

### 17.6 Datei-Verschlüsselung (At-Rest)

**Quelle:** `src/lib/privacy/file-encryption.ts` (Art. 32 DSGVO)

- **Algorithmus:** AES-256-GCM (authentifiziert), pro Datei ein zufälliger 12-Byte-IV
- **Schlüsselableitung:** HKDF-SHA256 aus dem `FIELD_ENCRYPTION_KEYS`-Master-Key (Kontext `file:<version>`) — keine neuen Secrets nötig
- **Streaming:** Ver-/Entschlüsselung über `pipeline()` — auch große Uploads (500 MB) ohne RAM-Spitzen
- **Key-Versionierung:** Rotation ohne Migration, aktive Version via `FIELD_ENCRYPTION_ACTIVE`
- **Dateiformat:** Magic `MMENC1` + Versions-Header + IV + Ciphertext + 16-Byte-GCM-Auth-Tag
- **Graceful Fallback:** Ohne konfigurierte Keys wird unverschlüsselt gespeichert; Aufrufer prüfen `isFileEncryptionConfigured()`

### 17.7 Eingeladene Nutzer / Token-Sicherheit

- Alle Einladungstoken: 32 Bytes kryptografisch zufällig (hex)
- Token-Ablauf: 7 Tage
- Einmalig verwendbar (`consumedAt`-Timestamp)
- E-Mail-Übereinstimmung serverseitig geprüft (kein URL-Parameter-Missbrauch)

---

## 18. E-Mail-System

**Anbieter:** Resend (transaktionale E-Mails)  
**Konfiguration:** `RESEND_API_KEY`, `EMAIL_FROM`, optional `EMAIL_REPLY_TO`  
**Fallback:** Ohne API-Key werden E-Mails nur in Server-Logs ausgegeben (lokale Entwicklung)

### Versendete E-Mail-Typen

| Auslöser | Empfänger | Inhalt |
|----------|-----------|--------|
| Schule aktiviert | Admin | Willkommen, Login-Daten |
| Lehrer eingeladen | Lehrkraft | Einladungslink (7 Tage) |
| Schüler eingeladen | Schüler | Einladungslink (7 Tage) |
| Magic Link angefordert | Nutzer | Anmeldelink (15 Min.) |
| Passwort-Reset angefordert | Nutzer | Reset-Link |
| Fehlzeit gemeldet | Sekretariat | Benachrichtigung |
| Broadcast (optional) | Alle Rollen | Ankündigung |

---

## 19. Rechtliche Seiten

Alle juristischen Seiten sind rein statisch gerendert, verlinkt im Footer.

### Impressum (`/impressum`)
- Vollständige Anbieterkennzeichnung gemäß § 5 TMG
- MasterMind GmbH, München
- Kontakt-E-Mail, Handelsregister, EU-Streitschlichtungshinweis

### Datenschutzerklärung (`/datenschutz`)
8 Abschnitte:
1. Verantwortlicher + Kontakt (datenschutz@mastermind.app)
2. Erhobene Daten (Name, E-Mail, Schule, Klasse, Lernaktivitäten, IP/Browser)
3. Rechtsgrundlagen (Art. 6 (1) b, f DSGVO; Art. 8 DSGVO für Minderjährige)
4. Speicherort (ausschließlich Deutschland / Frankfurt am Main)
5. Datenverarbeitung im Schulkontext (Schulen als Verantwortliche, AVV gem. Art. 28)
6. KI-Funktionen (Pseudonymisierung, Anthropic USA via SCCs Art. 46 DSGVO)
7. Betroffenenrechte (Auskunft, Berichtigung, Löschung, Einschränkung, Portabilität, Widerspruch)
8. Beschwerderecht bei Aufsichtsbehörde (BayLDA)

### AGB (`/agb`)
9 Paragraphen: Geltungsbereich, Leistungsgegenstand, Vertragsschluss, Nutzungsrechte, Kundenpflichten, Vergütung, Datenschutz, Haftungsbeschränkung, Schlussbestimmungen

### AVV (`/avv`)
Auftragsverarbeitungsvertrag gem. Art. 28 DSGVO:
- Gegenstand und Dauer der Verarbeitung
- Art und Zweck (Benutzerverwaltung, Lernfortschritte, KI-Tutor mit Pseudonymisierung, Kommunikation)
- Kategorien betroffener Personen (Schüler inkl. Minderjährige, Lehrkräfte, Eltern)
- Weisungsgebundenheit
- Technisch-organisatorische Maßnahmen (TLS 1.3, Ruhezustands-Verschlüsselung, RBAC, Backups DE, 2FA für Admins)
- Unterauftragsverarbeiter (Hetzner DE, Anthropic USA via SCCs)
- Datenlöschung (30 Tage nach Vertragsende)

---

## 20. UI & Design-System

### Theme

**Design-Tokens (CSS Custom Properties):**
- `--bg`: Hintergrundfarbe
- `--fg`: Vordergrundfarbe (Text)
- `--surface`: Erhöhte Oberfläche
- `--surface-2`: Zweite Oberflächenebene
- `--border`: Rahmenlinie
- `--muted-fg`: Gedämpfter Text
- `--brand` / `--brand-fg`: Markenfarbe + dazugehöriger Text
- `--success` / `--warning` / `--danger` / `--info`: Semantische Farben

Hell- und Dunkelmodus via `ThemeButtons`-Komponente (Client), Präferenz im Cookie gespeichert.

**Office-Dark-Mode:** Die Office-Editoren (Dokumente, Tabellen, Präsentationen) haben einen eigenen Theme-Umschalter (`src/components/office/OfficeTheme.tsx`), sodass Editor-Flächen unabhängig vom App-Theme hell/dunkel dargestellt werden können.

### Komponenten-Bibliothek (`/src/components/ui/`)

| Komponente | Beschreibung |
|-----------|-------------|
| `Avatar` | Initialen-Avatar mit optionalem Bild, Größen: sm/md/lg |
| `Badge` | Status-Badge, Varianten: brand/info/success/warning/danger/outline |
| `Button` | Button mit Varianten (primary/outline/ghost/danger) und Größen (sm/md/lg) |
| `Card` / `CardHeader` / `CardBody` | Karten-Layout-Komponent |
| `Container` | Zentrierender Wrapper mit Max-Width und Padding |
| `Input` | Formularfeld mit Fokus-Styles |
| `Label` | Formular-Label |
| `Progress` | Fortschrittsbalken mit Tönen (brand/success/warning/danger) |
| `Tabs` / `TabList` / `Tab` / `TabPanel` | Tab-Navigation |

### Layouts

**App-Layout (`/app/layout.tsx`):**
- Sidebar-Navigation (`AppNav`): Icons + Labels für alle Schüler-Bereiche
- Mobil: untere Tab-Leiste
- Sticky-Header mit Seitentitel und Nutzer-Avatar

**Teach-Layout (`/teach/layout.tsx`):**
- Analoge Sidebar für Lehrer-Bereich

**Admin-Layout (`/admin/layout.tsx`):**
- Admin-Sidebar mit allen Admin-Bereichen

### Typografie & Abstände

- Monospace-Font für Zahlen/Codes/Labels (Font-Klasse `font-mono`)
- Uppercase-Tracking-Wider für Section-Labels
- Tight-Tracking für Headlines (`tracking-tight`)
- Konsistente 8px-Raster über Tailwind-Spacing-Scale

### Responsive Design

- Mobile-first mit Breakpoints: sm (640px), md (768px), lg (1024px)
- Sidebar collapsed on mobile → Bottom-Tab-Bar
- Grid-Layouts kollabieren zu Single-Column auf kleinen Screens
- Touch-optimierte Button-Größen (min. 44px)

---

## 21. Anzeigetafel (Kiosk-Modus)

**Quelle:** `src/components/plan/PlanBoardClient.tsx`, Datenaufbereitung in `src/lib/plan-board.ts`

Vollbild-Anzeigetafel für Bildschirme/Fernseher im Schulgebäude:

- Heutiger Stundenplan **aller Klassen** inkl. Vertretungen (Entfall/Vertretung hervorgehoben)
- Uhr + Tagesdatum, Auto-Refresh alle 60 Sekunden
- Echtes Browser-Vollbild (Maximize/Minimize-Toggle); im Vollbild skaliert die Typografie hoch für Lesbarkeit aus Distanz
- Zusatzinhalte: Schultermine, Team-/Mannschafts-Ergebnisse, Ankündigungen (gepflegt über `/admin/anzeigetafel-verwaltung`, mit Akzentfarbe und Reihenfolge)
- Blättern zwischen Klassen-Seiten (Vor/Zurück)

---

## 22. MEGA-Fragen-Bank

**Quelle:** `scripts/questions/mega/` (Generator-Skripte `generate*.mjs`, Import via `import-mega.ts`)

- **Umfang:** über 120.000 Multiple-Choice-Fragen in 286 JSON-Dateien (`data/*.json`)
- **Fächer (19):** Biologie, Chemie, Deutsch, Englisch, Erdkunde, Ethik, Französisch, Geschichte, Informatik, Kunst, Latein, Mathematik, Musik, Physik, Sachkunde, Spanisch, Sport, Technik, Wirtschaft
- **Jahrgangsstufen:** 1–13 (fachabhängig, z. B. Sachkunde in der Grundschule)
- **Fragenformat:** Thema, Fragetext, 4 Antwortoptionen, Index der richtigen Antwort, Erklärungstext
- **Import:** `npx tsx scripts/questions/mega/import-mega.ts` — legt Topics und Fragen an, überspringt Duplikate (`createMany` mit `skipDuplicates` auf Postgres)
- Genutzt von: Übungen (`/app/uebungen`), Duellen, Boss-Battles

---

## Anhang: Technische Infrastruktur

### Umgebungsvariablen (`.env.example`)

| Variable | Zweck | Pflicht in Prod? |
|----------|-------|-----------------|
| `SESSION_SECRET` | HMAC-Schlüssel für Session-Cookies | ✅ Ja |
| `DATABASE_URL` | PostgreSQL-Connection-String | ✅ Ja |
| `RESEND_API_KEY` | Transaktionale E-Mails (Resend) | Nein (Log-Fallback) |
| `EMAIL_FROM` | Absender-Adresse | Nein |
| `ANTHROPIC_API_KEY` | KI-Tutor + Generator | Nein (Mock-Modus) |
| `ANTHROPIC_MODEL` | Model-Override (Default: claude-opus-4-7) | Nein |
| `NEXT_PUBLIC_APP_URL` | Basis-URL für Einladungslinks | ✅ Ja |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Browser-Push-Verschlüsselung | Nein |
| `VAPID_PRIVATE_KEY` | Server-Push-Signierung | Nein |
| `VAPID_EMAIL` | VAPID-Absender-Kontakt | Nein |
| `UPSTASH_REDIS_REST_URL` | Redis für Rate-Limiting | Empfohlen (Prod) |
| `UPSTASH_REDIS_REST_TOKEN` | Redis-Auth | Empfohlen (Prod) |

### Datenbankschema-Highlights

Kernmodelle: `User`, `School`, `SchoolClass`, `Subject`, `Assignment`, `Submission`, `Grade`, `Session`, `VerificationToken`, `TimetableEntry`, `LearningPath`, `LearningModule`, `FlashcardDeck`, `FlashcardCard`, `ExerciseTopic`, `ExerciseQuestion`, `ExerciseProgress`, `XpLog`, `Achievement`, `UserAchievement`, `Absence`, `ClassbookEntry`, `ClassbookIncident`, `AttendanceRecord`, `Message`, `MessageThread`, `PushSubscription`, `AuditLog`, `AiUsage`, `Notification`

### Build & Deploy

- **Dev:** `npm run dev` (Turbopack)
- **Build:** `npx next build` → 120 statische und dynamische Routen
- **DB-Seed:** `npx prisma db seed` (Demo-Daten), `npx tsx scripts/seed-topics.ts` (Curriculum)
- **Deploy:** Vercel (empfohlen) — `DATABASE_URL` via Vercel Postgres (Neon, Region fra1)
- **DB-Migration:** `npx prisma migrate deploy`
