# MasterMind → Google Play Store (Android)

Kompletter Weg von null bis veröffentlichte App. Läuft komplett auf Windows.

## Voraussetzungen (einmalig installieren)

1. **JDK 17** — https://adoptium.net (Temurin 17). Prüfen: `java -version`
2. **Android Studio** — https://developer.android.com/studio
   Beim ersten Start das Android SDK mitinstallieren lassen.
3. **Umgebungsvariablen** (Windows → „Umgebungsvariablen bearbeiten"):
   - `ANDROID_HOME` = `C:\Users\jonas\AppData\Local\Android\Sdk`
   - `JAVA_HOME` = dein JDK-17-Pfad
4. **Google Play Console Konto** — https://play.google.com/console
   Einmalig **25 $** Gebühr. ⚠ Für eine Schul-/Kinder-App: als
   **Organisation** registrieren (nicht Privatperson), das erwartet Google bei
   Bildungs-Apps.

## Schritt 1 — Upload-Keystore erzeugen (EINMALIG, extrem wichtig)

```bash
bash scripts/android-create-keystore.sh
```
Dann `android/keystore.properties` anlegen (Vorlage zeigt das Skript).

> ⚠⚠ Keystore + Passwort SOFORT sichern (Passwortmanager + Offsite). Verlust =
> du kannst NIE wieder ein Update der App hochladen. Beide Dateien sind
> git-ignoriert und existieren nur auf deinem Rechner.

## Schritt 2 — Signiertes App Bundle bauen

```bash
CAPACITOR_APP_URL=https://konvertis.de bash scripts/build-playstore.sh
```
Ergebnis: `android/app/build/outputs/bundle/release/app-release.aab`

## Schritt 3 — Play Console: App anlegen

1. Play Console → **Create app**. Name „MasterMind", Deutsch, App, Free.
2. Die „Declarations" durchklicken.

## Schritt 4 — ⚠ KINDER-COMPLIANCE (hier scheitern die meisten)

Eure Nutzer sind teils < 13/16. Das triggert Googles strengste Regeln:

- **App content → Target audience and content:** Ziel-Altersgruppen ehrlich
  angeben. Wenn Kinder < 13 dabei sind → **Designed for Families / Kinder**
  greift, mit strengen Regeln (keine personalisierte Werbung, strenge
  Datenschutz-Auflagen). ⚖️ Ob ihr euch als „auch für Kinder" oder „nur ab X"
  deklariert, ist eine rechtliche/strategische Entscheidung — mit DSB klären.
- **Data safety:** Vollständig ausfüllen — WELCHE Daten ihr sammelt (Name,
  E-Mail, Lernfortschritt), wozu, ob verschlüsselt (ja, TLS + at-rest),
  ob löschbar (ja → Link auf euer Lösch-Feature `/api/me/export` bzw.
  Konto-Löschung). Muss mit eurer Datenschutzerklärung übereinstimmen.
- **Privacy Policy:** Pflicht-URL zu eurer Datenschutzerklärung (habt ihr:
  `/legal/datenschutz`).
- **Content rating:** Fragebogen ausfüllen → ergibt USK/PEGI-Einstufung.

## Schritt 5 — Store-Listing

- Kurzbeschreibung (80 Zeichen), Langbeschreibung.
- **Assets:** App-Icon 512×512, Feature-Graphic 1024×500, mind. 2
  Screenshots (Telefon). Screenshots kannst du aus der laufenden App machen.
- Kategorie: **Bildung**.

## Schritt 6 — Release

1. **Testing → Internal testing** zuerst (nicht direkt Production!).
   AAB aus Schritt 2 hochladen, dich selbst als Tester eintragen,
   Test-Link auf dem Handy öffnen, App real testen.
2. Läuft alles → **Production → Create release** → AAB hochladen → Review
   einreichen. Google-Review dauert bei neuen Apps oft mehrere Tage,
   bei Kinder-Apps länger.

## Häufige Ablehnungsgründe (vermeiden)
- Data-Safety-Angaben stimmen nicht mit der App überein.
- Fehlende/ungültige Datenschutzerklärung.
- Kinder-App ohne korrekte Zielgruppen-Deklaration.
- Login-Wall ohne Test-Zugang → **gib Google im Review-Formular einen
  Demo-Login** (deine `demo.schueler@konvertis.de`-Accounts!).
