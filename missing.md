<!-- Copyright 2026 Elian Schock, Jonas Schwenk -->
# MasterMind — Offene Punkte

> Stand: 2026-05-15  
> Reihenfolge: Aufwand aufsteigend (Trivial → Klein → Mittel → Groß).  
> Jeder Punkt enthält betroffene Datei(en) und was konkret fehlt.

---

## Trivial (< 15 min)

### 1. `/teach/aufgaben` — "Neue Aufgabe"-Button hat kein href
**Datei:** `src/app/teach/aufgaben/page.tsx:76`  
**Problem:** `<Button size="sm">Neue Aufgabe</Button>` ist kein Link.  
**Fix:** Durch `<Link href="/teach/aufgaben/neu">` ersetzen (Route existiert bereits).

---

### 2. `/app/noten` — "Lernplan starten"-Button hat kein href
**Datei:** `src/app/app/noten/page.tsx:273`  
**Problem:** KI-Coach-CTA-Button ist nicht verlinkt.  
**Fix:** `<Link href="/app/lernen">` (führt zum bestehenden Lernpfad-Bereich).

---

### 3. `/app/einstellungen` — Sprachauswahl-Buttons nicht verdrahtet
**Datei:** `src/app/app/einstellungen/page.tsx` — `LanguageOption`-Komponente  
**Problem:** DE / EN / TR / PL Buttons haben kein `onClick`, nur `aria-pressed`.  
**Fix:** Gleicher Ansatz wie bei `/teach/einstellungen` — `useOptimistic` + `updatePref("lang", code)` Server Action. Die Action existiert bereits in `teach/einstellungen/actions.ts` und kann kopiert/geteilt werden.

---

## Klein (30–90 min)

### 4. `/app/dashboard` — Checkbox "Als erledigt markieren" hat keinen Handler
**Datei:** `src/app/app/page.tsx:229`  
**Problem:** Checkbox-Button neben anstehenden Aufgaben hat kein `onClick`.  
**Fix:** Server Action `markDone(assignmentId)` — setzt `submission.status = "done"` oder navigiert zu `/app/aufgaben/[id]`. Einfachste Lösung: Button wird zu `<Link href="/app/aufgaben/${a.id}">`.

---

### 5. `/teach/nachrichten` — "Neue Nachricht"-Button hat kein href
**Datei:** `src/app/teach/nachrichten/page.tsx:68`  
**Problem:** `<Button size="sm">Neue Nachricht</Button>` hat kein Ziel.  
**Fix:** Neue Route `/teach/nachrichten/neu` anlegen — analog zu `src/app/app/nachrichten/neu/page.tsx` (copy & adapt für Lehrer-Kontext, Empfänger: Schüler, Eltern, Kollegen).

---

### 6. `/plattform/flags` — "Neuer Flag"- und "Bearbeiten"-Buttons nicht verdrahtet
**Datei:** `src/app/plattform/flags/page.tsx:69` (Neuer Flag), `page.tsx:201` (Bearbeiten je Zeile)  
**Problem:** Beide Buttons haben kein `onClick`/`action`.  
**Fix:**  
- "Neuer Flag": Einfaches Modal oder Inline-Form mit `name`, `description`, `state` → `prisma.featureFlag.create()`  
- "Bearbeiten": Inline-Edit oder Link zu `/plattform/flags/[key]` — `state` togglen + `schoolIds` anpassen via Server Action

---

### 7. `/app/einstellungen` — DataAction-Buttons nicht verdrahtet
**Datei:** `src/app/app/einstellungen/page.tsx` — `DataAction`-Komponente  
**Problem:** "Daten exportieren (DSGVO)" und "Account löschen" sind optisch vorhanden, aber ohne Logik.  
**Fix:**  
- "Daten exportieren": Neuer Endpunkt `GET /api/user/dsgvo-export` (analog zu `/api/admin/dsgvo-export`, aber nur eigene Daten)  
- "Account löschen": Bestätigungs-Dialog + Server Action `deleteOwnAccount()` → Session löschen, User auf `deletedAt` setzen

---

## Mittel (2–4 h)

### 8. `/admin/klassen` — "Bearbeiten" und "Schüler"-Buttons ohne Route
**Datei:** `src/app/admin/klassen/page.tsx:67–68`  
**Problem:** Beide Buttons haben kein Ziel; keine `/admin/klassen/[id]`-Route existiert.  
**Fix:** Neue Route `src/app/admin/klassen/[id]/page.tsx` mit:  
- Klassenname / Jahrgangsstufe / Lehrkraft bearbeiten (Server Action `updateClass`)  
- Schülerliste: Schüler zuweisen / entfernen (bestehende `/admin/nutzer/[id]`-Actions nutzen)  
- "Bearbeiten" → Link zu `/admin/klassen/[id]`  
- "Schüler" → Link zu `/admin/klassen/[id]#schueler`

---

### 9. Onboarding Step 1 — Formulardaten nicht gespeichert
**Datei:** `src/app/onboarding/page.tsx` — `Step1()`  
**Problem:** Alle Inputs (Schulname, Schulart, Bundesland, Adresse, Schüler-/Lehrerzahl) sind rein visuell — sie sind weder in einem `<form>` noch mit URL-Params verbunden. Schritt 5 hat ein separates Schulname-Feld und die Daten landen nicht in der Datenbank.  
**Fix Option A (URL-Params):** Inputs als Hidden-Fields bei "Weiter" in URL enkodieren (`?schulname=...&schulart=...`), Step 5 `createSchoolAndAdmin` mit diesen Werten befüllen.  
**Fix Option B (Vereinfachen):** Step 1 explizit als "Demo/Vorschau" kennzeichnen (Hinweistext), Step 5 als einziges Pflicht-Formular beibehalten — alle weiteren Felder optional nach Login.

---

### 10. Onboarding Step 3 — SSO-Provider-Auswahl nicht gespeichert
**Datei:** `src/app/onboarding/page.tsx` — `Step3()`  
**Problem:** "Wählen"-Buttons für die 5 Anmelde-Provider haben kein `onClick`. Auswahl geht verloren.  
**Fix:** `ssoProvider`-Param in URL schreiben (analog zu `plan`) → nach Login-Weiterleitung in `/admin/integrationen` vorausgewählten Provider anzeigen. Echte Konfiguration passiert ohnehin in `/admin/integrationen/[provider]`.

---

### 11. Onboarding Step 4 — Branding-Inputs nicht gespeichert
**Datei:** `src/app/onboarding/page.tsx` — `Step4()`  
**Problem:** Logo-Upload-Button, Farbwähler und Subdomain-Input haben keine Logik.  
**Fix Option A:** Branding-Daten (Farbe, Subdomain) via URL-Params an Step 5 übergeben, dort mit `createSchoolAndAdmin` speichern.  
**Fix Option B:** Nach Schulerstellung per Redirect zu `/admin/branding` weiterleiten mit Hinweis "Branding noch einrichten". Einfacher und der `/admin/branding`-Editor funktioniert bereits vollständig.

---

### 12. `/admin/sicherheit` — API-Token-Verwaltung ist Platzhalter
**Datei:** `src/app/admin/sicherheit/page.tsx`  
**Problem:** Abschnitt "API-Token-Verwaltung" zeigt den Text "steht in einer zukünftigen Version bereit" — kein UI.  
**Fix:** Neues Prisma-Modell `ApiToken` (name, hashedToken, scopes, createdAt, lastUsedAt, expiresAt), CRUD-UI:  
- Token erstellen (einmaliges Anzeigen des Klartext-Tokens)  
- Token auflisten mit `lastUsedAt`  
- Token widerrufen

---

## Groß (4 h+, KI-Features)

### 13. `/app/aufgaben` — "KI-Lernplan generieren" nicht implementiert
**Datei:** `src/app/app/aufgaben/page.tsx:122`  
**Problem:** Button mit Sparkles-Icon hat kein `onClick`.  
**Fix:** Neuer API-Endpunkt `POST /api/ai/lernplan` (Schüler-Noten + offene Aufgaben als Kontext) → Anthropic generiert priorisierten Wochenplan → Ergebnis als Modal oder neue Seite `/app/plan/[id]` anzeigen. Ggf. als `LearningPath`-Eintrag speichern.

---

### 14. `/app/karteikarten` — "Aus PDF generieren" nicht implementiert
**Datei:** `src/app/app/karteikarten/page.tsx:94`  
**Problem:** Button hat kein `onClick`.  
**Fix:** Datei-Upload (PDF) → `/api/upload` → Texte per `pdfjs-dist` oder server-side extrahieren → Anthropic generiert Frage/Antwort-Paare → neues Deck anlegen. Braucht: Upload-Handling, PDF-Parsing, KI-Prompt für Karteikartenformat.

---

### 15. `/app/einstellungen` — DSGVO-Datenexport für Schüler fehlt
**Datei:** Kein Endpunkt vorhanden  
**Problem:** "Meine Daten exportieren"-Button (DataAction) verlinkt auf nichts.  
**Fix:** Neuer Endpunkt `GET /api/user/dsgvo-export` — exportiert alle eigenen Daten (Noten, Aufgaben, XP-Log, Nachrichten, Karteikarten) als ZIP/JSON. Analog zu `src/app/api/admin/dsgvo-export/route.ts` aber scoped auf den angemeldeten Nutzer.

---

## Bekannte Lücken (kein unmittelbarer Handlungsbedarf)

| Bereich | Was fehlt | Warum noch offen |
|---------|-----------|-----------------|
| `src/lib/company.ts` | CEO-Name "Max Mustermann" ist Platzhalter | Erst ersetzen, wenn echte Firmendaten feststehen |
| `/admin/lizenz` | "Sitz-Kontingent anpassen"-Karte ist Display-Only | Braucht Billing-Integration (Stripe o. ä.) |
| `/plattform/abrechnung` | Abrechnungsübersicht ist statisch | Braucht Billing-Backend |
| `/app/mannschaften` | Kein DB-Backing, reine UI-Mockup | Feature noch nicht spezifiziert |
| `/rektor/statistiken` | Diagramme könnten statische Demo-Daten enthalten | Niedrige Priorität, DB-Daten fließen schon ein |
| Nachrichten-Ungelesen-Badge | Zähler in Sidebar ggf. nicht live | Kein Websocket / kein Polling implementiert |
