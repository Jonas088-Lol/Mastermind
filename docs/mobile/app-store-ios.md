# MasterMind → Apple App Store (iOS)

⚠ iOS-Builds gehen NUR auf einem Mac (Xcode ist Apple-only). Diese Anleitung
ist für morgen, wenn der Mac da ist. Auf Windows kannst du iOS nicht bauen —
Alternative wäre der Cloud-Mac-Dienst **Codemagic** (siehe unten).

## Voraussetzungen (auf dem Mac, einmalig)
1. **Xcode** aus dem Mac App Store (mehrere GB, dauert).
2. **CocoaPods:** `sudo gem install cocoapods`
3. **Node.js** + Repo geklont, `npm install`.
4. **Apple Developer Program** — https://developer.apple.com/programs/
   **99 $/Jahr**. Als **Organisation** registrieren (Schulplattform), das
   braucht eine D-U-N-S-Nummer — die Beantragung kann Tage dauern, deshalb
   am besten SOFORT starten.

## Schritt 1 — iOS-Projekt erzeugen (auf dem Mac)
```bash
CAPACITOR_APP_URL=https://konvertis.de npx cap add ios
CAPACITOR_APP_URL=https://konvertis.de npx cap sync ios
npx cap open ios   # öffnet Xcode
```

## Schritt 2 — In Xcode konfigurieren
- **Signing & Capabilities** → dein Apple-Developer-Team wählen.
- Bundle Identifier: `app.mastermind.client` (muss mit capacitor.config.ts
  übereinstimmen).
- Display Name: „MasterMind".
- App-Icon setzen (Assets.xcassets), Launch Screen prüfen.

## Schritt 3 — ⚠ Apple Guideline 4.2 (der kritische Punkt)
Eine App, die nur eine Website in einem Fenster lädt, lehnt Apple oft nach
**Guideline 4.2 (Minimum Functionality)** ab. Unser Capacitor-Setup lädt
`https://konvertis.de` in einer nativen Hülle — das ist grenzwertig.

Um durchzukommen, braucht die App **echte native Wertschöpfung**, z. B.:
- **Push-Benachrichtigungen** (Plugin ist schon konfiguriert) — aktiv nutzen.
- Native Features: Kamera für Hausaufgaben-Scan, Offline-Fähigkeit,
  Face-ID-Login, o. Ä.
- Ohne mind. ein echtes natives Feature ist iOS-Ablehnung wahrscheinlich.

→ Das ist eine Produktentscheidung, die wir VOR der iOS-Einreichung treffen
sollten. Bei Android (Play Store) ist diese Regel deutlich lockerer, deshalb
starten wir dort.

## Schritt 4 — App Store Connect
1. https://appstoreconnect.apple.com → neue App anlegen (Bundle-ID wählen).
2. **App Privacy** ausfüllen (Apples Pendant zu Googles Data Safety):
   welche Daten, wozu, verschlüsselt, löschbar. Muss zur
   Datenschutzerklärung passen.
3. **Age Rating** → bei Minderjährigen ehrlich ausfüllen; ggf. greift
   Apples „Kids Category" mit Extra-Auflagen (mit DSB klären).
4. Screenshots (iPhone-Formate), Beschreibung, Datenschutz-URL.
5. **Demo-Login** im „App Review Information"-Feld hinterlegen
   (`demo.schueler@konvertis.de`), sonst kommt der Reviewer nicht rein.

## Schritt 5 — Archivieren & einreichen
In Xcode: **Product → Archive** → **Distribute App** → App Store Connect.
Dann in App Store Connect zum Review einreichen. Apple-Review dauert i. d. R.
1–3 Tage.

## Alternative ohne physischen Mac: Codemagic
- https://codemagic.io — Cloud-Mac, baut aus dem Git-Repo iOS + Android.
- Braucht trotzdem das Apple Developer Program + hochgeladene Zertifikate.
- Sinnvoll, wenn kein dauerhafter Mac verfügbar ist. Für den ersten Build
  ist der echte Mac einfacher (Xcode-UI fürs Signing).
