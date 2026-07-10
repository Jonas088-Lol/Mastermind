# Push-Benachrichtigungen einrichten (Firebase Cloud Messaging)

Der **Code ist fertig** — die App registriert sich für Push, sendet den Token
an den Server, und `pushToUsers()` verschickt an alle Geräte. Es fehlen nur
noch **zwei Dateien aus der Firebase Console**, die du erstellen musst. Ohne
sie läuft die App normal weiter, nur ohne native Push.

## Was der Code schon macht (nichts mehr zu programmieren)
- `src/lib/native.ts` → fragt Berechtigung, registriert FCM, gibt Token zurück.
- `src/components/AppInit.tsx` → schickt Token an `/api/push/native-token`.
- `/api/push/native-token` → speichert Token pro User.
- `src/lib/push.ts` → `pushToUsers()` sendet an native (FCM) **und** Web-Push.
- `src/lib/fcm.ts` → spricht die FCM-API mit deinem Service-Account.
- Alle ~20 Auslöser (neue Hausaufgabe, Note, Nachricht …) rufen `pushToUsers`
  bereits auf — die feuern automatisch Push, sobald Firebase konfiguriert ist.

---

## Schritt 1 — Firebase-Projekt anlegen
1. https://console.firebase.google.com → **Projekt hinzufügen**.
2. Name z. B. „MasterMind". Google Analytics kannst du deaktivieren.

## Schritt 2 — Android-App registrieren → `google-services.json`
1. Im Projekt: **⚙ → Projekteinstellungen → Meine Apps → Android** (Robot-Icon).
2. **Android-Paketname:** `app.mastermind.client`
   (muss exakt so sein — steht in `capacitor.config.ts`).
3. App registrieren → **`google-services.json` herunterladen**.
4. Datei ablegen unter: **`android/app/google-services.json`**
   (Die Gradle-Verdrahtung dafür ist schon vorhanden. Die Datei ist
   git-ignoriert — sie enthält Projekt-Keys, gehört nicht ins Repo.)

## Schritt 3 — Service-Account → Server-Credential
1. **Projekteinstellungen → Dienstkonten**.
2. **Neuen privaten Schlüssel generieren** → lädt eine JSON-Datei herunter.
3. Diesen JSON-Inhalt in eine **einzige Zeile** bringen und auf dem Server in
   `.env.production` eintragen:
   ```
   FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"…", …}
   ```
   Tipp (Windows PowerShell, macht JSON einzeilig und kopiert es):
   ```powershell
   (Get-Content dein-service-account.json -Raw) -replace "`r?`n"," " | Set-Clipboard
   ```
   ⚠ Dieser Schlüssel ist ein Geheimnis — niemals ins Git, nur in
   `.env.production` auf dem Server (steht in `.gitignore`).

## Schritt 4 — Android neu bauen & hochladen
Nachdem `android/app/google-services.json` liegt:
```bash
CAPACITOR_APP_URL=https://konvertis.de bash scripts/build-playstore.sh
```
Neues AAB in der Play Console als neuen Release hochladen.

## Schritt 5 — Server neu starten (damit die ENV greift)
```bash
git pull
docker compose up -d --build
```

---

## Testen
1. App auf dem Handy öffnen, einloggen → beim ersten Start fragt Android nach
   der Benachrichtigungs-Erlaubnis → **Erlauben**.
2. Als Lehrer eine neue Hausaufgabe/Note für die Klasse anlegen.
3. Auf dem Schüler-Handy sollte die Push-Nachricht erscheinen — auch wenn die
   App geschlossen ist.

## Fehlersuche
- **Keine Nachfrage nach Erlaubnis:** Android < 13 fragt nicht (Erlaubnis ist
  automatisch). Auf 13+ muss die Permission erteilt sein (App-Einstellungen).
- **Token kommt nicht an:** In den App-Logs (Chrome `chrome://inspect`) nach
  `[Push]` schauen. `google-services.json` muss beim Build dabei gewesen sein.
- **Server sendet nicht:** Läuft nur, wenn `FIREBASE_SERVICE_ACCOUNT_JSON`
  gesetzt ist. Ohne die Variable ist FCM stumm (kein Fehler, nur kein Versand).

## iOS (später, mit dem Mac)
Für iOS-Push brauchst du zusätzlich in Firebase einen **APNs-Schlüssel**
(Apple Developer → Keys → APNs), den du in Firebase hochlädst. Der restliche
Code funktioniert für iOS identisch. Details, wenn wir iOS angehen.
