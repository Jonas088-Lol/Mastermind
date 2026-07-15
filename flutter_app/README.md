# MasterMind — Flutter-App (Android, iOS, Windows, macOS, Linux)

**Eine** App aus einem Codebestand für **alle 5 Plattformen**, die **offline und online**
funktioniert:

- **Offline** (immer nutzbar): Übungen (Fächer → Themen → Quiz) und Karteikarten
  (erstellen, lernen, SM-2). Inhalte sind gebündelt bzw. lokal gespeichert.
- **Online** (wenn Internet + angemeldet): Login, Inhalts-Sync, später KI-Tutor,
  Ranking, Chat, Uploads. Diese Features werden offline automatisch ausgegraut.

Das Design entspricht dem Web (Pastell-Hellblau → Hellgrün, Farbverläufe,
Light/Dark, Bottom-Navigation: Start · Übungen · Karten · Profil).

> Electron (`../electron`) bleibt optional als „voller Online-Client" für Desktop —
> die Flutter-App ist der neue, offline-fähige Client für alle Plattformen.

## Was funktioniert offline

| Feature | Offline | Grund |
|---|---|---|
| **Übungen** (Fächer, Themen, Quiz) | ✅ | In die App gebündelt (`assets/exercises.json`) |
| **Karteikarten** (erstellen, lernen, SM-2) | ✅ | Lokal auf dem Gerät (Hive) |
| KI-Tutor | ❌ | Braucht Server/LLM |
| Uploads / Dokumente | ❌ | Braucht Server-Storage |
| Chat / Community / Ranking | ❌ | Braucht Server |
| Login / Sync | ❌ | Braucht Server |

Online-Features werden bei fehlender Verbindung automatisch ausgegraut
(`ConnectivityService` + `OfflineBanner`).

## Projektstruktur

```
flutter_app/
├─ pubspec.yaml
├─ assets/exercises.json          # gebündelte Übungsinhalte (Offline)
└─ lib/
   ├─ main.dart                   # Init (Hive, Content laden) + Provider
   ├─ app.dart                    # MaterialApp + Theme
   ├─ theme.dart                  # Pastell-Design + GradientButton
   ├─ models/                     # ExerciseTopic/Question, Deck/Flashcard
   ├─ services/                   # Connectivity, ApiClient, LocalStore(Hive)
   ├─ data/                       # ExerciseRepository, FlashcardRepository
   └─ screens/                    # Home, Fächer→Klassen→Themen→Quiz, Karteikarten
```

## Einrichtung (einmalig)

Voraussetzung: [Flutter SDK](https://docs.flutter.dev/get-started/install) (Dart ≥ 3.4).

```bash
cd flutter_app

# 1) Native Plattform-Ordner generieren — überschreibt lib/ NICHT:
flutter create --org app.mastermind --project-name mastermind \
  --platforms=android,ios,windows,macos,linux .

# 2) Abhängigkeiten holen
flutter pub get
```

## App-Icon (echtes MasterMind-Logo)

Das echte Logo liegt unter `assets/app_icon.png`. Icons für alle Plattformen
generieren (ersetzt das Standard-Flutter-Icon):

```bash
flutter pub get
dart run flutter_launcher_icons
```

Danach neu bauen. Auf Android/iOS/Windows/macOS erscheint dann das Lupen-Logo.

> Hinweis: Das **kleine Status-Icon** einer Android-Benachrichtigung muss eine
> weiße Silhouette sein. Aktuell wird `@mipmap/ic_launcher` verwendet — für ein
> perfekt sauberes Notif-Icon später eine monochrome `drawable/ic_stat_notify.png`
> ergänzen und in `NotificationService` referenzieren.

## Offline-Inhalte aktualisieren

Die Übungen werden vom Server exportiert und als Asset gebündelt:

```bash
# Als eingeloggter Nutzer (Session-Cookie nötig):
curl -H "Cookie: mm_session=<TOKEN>" \
  https://<host>/api/offline/exercises \
  -o flutter_app/assets/exercises.json
```

(Endpoint: `src/app/api/offline/exercises/route.ts`.) Danach `flutter pub get` und neu bauen.

## Starten & Bauen

```bash
# Entwicklung (Gerät/Emulator/Desktop wählen)
flutter run
flutter run -d macos
flutter run --dart-define=MM_BASE_URL=https://meine-schule.de

# Mobile
flutter build apk --release        # Android APK
flutter build appbundle --release  # Android (Play Store)
flutter build ios --release        # iOS (macOS + Xcode, danach signieren)

# Desktop
flutter build macos                # macOS .app
flutter build windows              # Windows (auf Windows bauen)
flutter build linux                # Linux
```

`MM_BASE_URL` (Default `https://konvertis.de`) setzt die Server-URL für die
Online-Features. Offline-Features brauchen sie nicht.

## Push-Benachrichtigungen (inkl. Smartwatch)

Neue Nachrichten lösen echte Push-Benachrichtigungen aus. **Apple Watch und
Wear-OS-Uhren zeigen diese automatisch** — dafür ist **kein eigener Watch-Code**
nötig, das Betriebssystem spiegelt die Handy-Benachrichtigung auf die Uhr.

Ablauf: Server (`pushToUsers` in `../src/lib/push.ts`) → FCM/APNs → Gerät → Uhr.
Der Client registriert seinen Token nach dem Login unter `/api/push/native-token`.

**Einmalige Einrichtung (sonst bleibt Push einfach aus, App läuft trotzdem):**

1. **Firebase-Projekt** anlegen (console.firebase.google.com), Android- & iOS-App
   hinzufügen.
2. Im `flutter_app`-Ordner:
   ```bash
   dart pub global activate flutterfire_cli
   flutterfire configure
   ```
   Das legt `google-services.json` (Android) bzw. `GoogleService-Info.plist` (iOS)
   und `lib/firebase_options.dart` an.
3. **iOS zusätzlich:** In Firebase unter *Project Settings → Cloud Messaging* einen
   **APNs-Auth-Key** (.p8) hochladen (aus dem Apple-Developer-Account). In Xcode
   die Capability **Push Notifications** + **Background Modes → Remote notifications**
   aktivieren.
4. **Server:** Umgebungsvariable `FIREBASE_SERVICE_ACCOUNT_JSON` mit dem JSON eines
   Firebase-Service-Accounts setzen (Project settings → Service accounts → Generate
   new private key). Danach `bash scripts/deploy.sh`.

Ohne diese Schritte startet die App normal; `NotificationService` deaktiviert Push
still.

### Direkt aus der Benachrichtigung antworten (inkl. Apple Watch)

Nachrichten-Pushes enthalten eine **Antwort-Aktion** mit Textfeld. Server-seitig ist
alles fertig: die Push trägt `data.threadId` + `category: message_reply`, und die App
schickt die Antwort an `POST /api/messages/reply`.

- **Vordergrund (App offen):** funktioniert direkt — die App zeigt die Notification
  mit Antwortfeld und sendet die Antwort (`NotificationService._onResponse`).
- **Sperrbildschirm / Apple Watch / Hintergrund:** Die iOS-**Kategorie**
  `message_reply` ist registriert, damit das Antwortfeld dort erscheint. Die
  Verarbeitung der **Remote**-Antwort erfordert noch etwas native Anbindung:
  - **iOS:** im `ios/Runner/AppDelegate.swift` den `UNUserNotificationCenterDelegate`
    (`didReceive response` mit `UNTextInputNotificationResponse`) implementieren und
    die Antwort an `/api/messages/reply` senden.
  - **Android:** für die Antwort im Hintergrund die Nachricht als **data-only**
    senden und im `firebaseBackgroundHandler` lokal mit `AndroidNotificationAction`
    (RemoteInput) neu aufbauen.

  Die Struktur dafür ist vorbereitet (`firebaseBackgroundHandler`, `replyToThread`,
  Kategorie-IDs). Dieser native Teil lässt sich erst mit eingerichtetem Firebase +
  echtem Gerät testen.

## Status / nächste Schritte

Dieses Fundament deckt den gewünschten **Offline-Kern** ab (Übungen + Karteikarten).
Noch offen (Online, Screen für Screen ergänzbar):

- Login/Session gegen die bestehende Web-API (`ApiClient.login` ist vorbereitet).
- KI-Tutor, Uploads, Chat, Ranking als Online-Screens.
- Optional: automatischer Content-Refresh beim Start (wenn online) über
  `ApiClient.fetchExerciseContent()` → `ExerciseRepository.applyJson()`.
