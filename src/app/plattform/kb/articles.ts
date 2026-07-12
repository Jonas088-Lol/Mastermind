/* Copyright 2026 Elian Schock, Jonas Schwenk */
export interface KbArticle {
  slug: string;
  category: string;
  title: string;
  summary: string;
  content?: string;
  sections: { heading: string; body: string }[];
}

export const ARTICLES: KbArticle[] = [
  // ── Onboarding ────────────────────────────────────────────────────────────
  {
    slug: "neue-schule-einrichten",
    category: "Onboarding",
    title: "Neue Schule einrichten",
    summary: "Schritt-für-Schritt vom Onboarding-Formular bis zur ersten Anmeldung.",
    sections: [
      {
        heading: "1. Onboarding starten",
        body: "Rufe /onboarding auf. Gib Schulname, Schulart (Gymnasium, Realschule etc.) und Bundesland ein. Diese Werte bestimmen den Lehrplan-Standard (BY / NRW / BW) und erscheinen auf Zeugnissen.",
      },
      {
        heading: "2. Plan auswählen",
        body: "Wähle Basic (bis 100 Schüler), Pro (unbegrenzt + KI) oder Enterprise (Multi-Campus, White-Label). Der Plan kann jederzeit unter /admin/lizenz hochgestuft werden.",
      },
      {
        heading: "3. Anmelde-Methode festlegen",
        body: "Empfohlen: E-Mail + Passwort für den Start. SSO (Entra ID, Google) kann später unter /admin/integrationen konfiguriert werden. 2FA ist für Lehrer standardmäßig erzwungen.",
      },
      {
        heading: "4. Admin-Account anlegen",
        body: "Im letzten Schritt wird ein Admin-Nutzer erstellt. Das Passwort muss mind. 12 Zeichen haben. Der Account erhält sofort Zugriff auf /admin.",
      },
      {
        heading: "5. Erste Schritte nach dem Onboarding",
        body: "Klassen anlegen (/admin/klassen/neu), Fächer definieren (/admin/faecher/neu), Lehrer einladen (/admin/nutzer/einladen). Schüler können per Einladungs-E-Mail (/admin/nutzer/schueler-einladen) oder Massen-Import ongeboardet werden.",
      },
    ],
  },
  {
    slug: "untis-import",
    category: "Onboarding",
    title: "Untis-Import Schritt für Schritt",
    summary: "Stundenplan aus WebUntis oder Untis-Export als CSV importieren.",
    sections: [
      {
        heading: "Voraussetzungen",
        body: "Du benötigst einen Untis-Export im CSV-Format (GPU002.TXT oder eigenes Format). Klassen und Fächer müssen in MasterMind bereits angelegt sein — die Namen müssen exakt übereinstimmen.",
      },
      {
        heading: "Import durchführen",
        body: "Gehe zu /admin/stundenplan und wähle 'Stundenplan importieren'. Lade die CSV-Datei hoch. Das System erkennt automatisch Spalten für Tag, Stunde, Fach, Klasse, Lehrer und Raum.",
      },
      {
        heading: "Konflikt-Erkennung",
        body: "Nach dem Import zeigt das System Konflikte an: gleicher Lehrer oder gleicher Raum zur selben Zeit. Konflikte müssen manuell aufgelöst werden bevor der Plan aktiviert wird.",
      },
      {
        heading: "Perioden konfigurieren",
        body: "Unter /admin/stundenplan → Perioden legst du die Startzeiten pro Stunde fest (z. B. 1. Stunde 08:00, 2. Stunde 08:50). Diese Zeiten erscheinen in Schüler- und Lehrer-Dashboards.",
      },
    ],
  },
  {
    slug: "klassen-und-faecher",
    category: "Onboarding",
    title: "Klassen und Fächer anlegen",
    summary: "Schulklassen erstellen, Jahrgangsstufen zuweisen, Fächer mit Farbe definieren.",
    sections: [
      {
        heading: "Klassen anlegen",
        body: "Gehe zu /admin/klassen/neu. Gib Name (z. B. '9b') und Jahrgangsstufe (1–13) ein. Die Jahrgangsstufe bestimmt welche Übungsthemen und Lehrplan-Inhalte verfügbar sind.",
      },
      {
        heading: "Fächer definieren",
        body: "Gehe zu /admin/faecher/neu. Jedes Fach braucht einen Namen (z. B. 'Mathematik'), ein Kürzel (z. B. 'M') und eine Farbe (Hex-Code). Die Farbe erscheint in allen Noten-, Aufgaben- und Stundenplan-Ansichten.",
      },
      {
        heading: "Lehrer-Fach-Klasse zuweisen",
        body: "Unter /admin/klassen kannst du für jede Klasse Lehrkräfte + Fächer zuweisen. Diese Zuweisungen bestimmen welche Klassen/Fächer in /teach erscheinen und wer welche Noten eintragen darf.",
      },
    ],
  },

  // ── SSO ──────────────────────────────────────────────────────────────────
  {
    slug: "microsoft-entra-id",
    category: "SSO",
    title: "Microsoft Entra ID konfigurieren",
    summary: "SAML 2.0-SSO mit Microsoft Entra ID (ehem. Azure AD) einrichten.",
    sections: [
      {
        heading: "Voraussetzungen",
        body: "Enterprise-Plan erforderlich. Du brauchst Global-Administrator-Rechte in Entra ID und die MasterMind-Tenant-ID deiner Schule (zu finden unter /admin/integrationen).",
      },
      {
        heading: "App in Entra ID anlegen",
        body: "Öffne Entra ID → Enterprise-Anwendungen → Neue Anwendung → Eigene Anwendung erstellen. Wähle 'SAML' als Anmeldemethode. Trage als Entitäts-ID 'https://deineschule.mastermind.app' und als Antwort-URL 'https://deineschule.mastermind.app/api/auth/saml/callback' ein.",
      },
      {
        heading: "Zertifikat + Metadaten",
        body: "Lade das SAML-Signaturzertifikat als Base64-PEM herunter. Kopiere die Metadaten-URL. Beides trägst du unter /admin/integrationen → Entra ID ein.",
      },
      {
        heading: "Benutzer zuweisen",
        body: "Weise in Entra ID die Lehrkräfte und ggf. Schüler der App zu. Beim ersten SSO-Login wird automatisch ein MasterMind-Account angelegt (JIT-Provisioning).",
      },
    ],
  },
  {
    slug: "google-workspace-sso",
    category: "SSO",
    title: "Google Workspace SSO einrichten",
    summary: "OAuth 2.0 mit Google Workspace für Schul-Accounts konfigurieren.",
    sections: [
      {
        heading: "Google Cloud Console",
        body: "Öffne console.cloud.google.com → Neues Projekt → APIs & Dienste → OAuth-Zustimmungsbildschirm (intern, da Workspace). Aktiviere die Google+ API.",
      },
      {
        heading: "OAuth-Client anlegen",
        body: "Unter 'Anmeldedaten' → OAuth-Client-ID erstellen → Webanwendung. Autorisierte Weiterleitungs-URI: 'https://deineschule.mastermind.app/api/auth/google/callback'. Notiere Client-ID und Client-Secret.",
      },
      {
        heading: "In MasterMind eintragen",
        body: "Gehe zu /admin/integrationen → Google Workspace. Trage Client-ID, Client-Secret und deine Google-Workspace-Domain (z. B. 'meinegymnasium.de') ein. Speichern — ab sofort erscheint 'Mit Google anmelden' auf der Login-Seite.",
      },
    ],
  },

  // ── Abrechnung ────────────────────────────────────────────────────────────
  {
    slug: "lizenzmodelle",
    category: "Abrechnung",
    title: "Lizenzmodelle im Überblick",
    summary: "Basic, Pro und Enterprise — was ist enthalten, was kostet es.",
    sections: [
      {
        heading: "Basic — ab 0,90 € / Schüler / Monat",
        body: "Bis 100 aktive Schüler-Sitze. Enthält: Notenverwaltung, Aufgaben, Klassenbuch, Nachrichten, Eltern-Zugang, Push-Benachrichtigungen. Kein KI-Tutor, kein CSV-Export, kein SSO.",
      },
      {
        heading: "Pro — 1,49 € / Schüler / Monat",
        body: "Unbegrenzte Sitze. Alles aus Basic plus: KI-Tutor (50 Anfragen/Woche je Schüler), Prüfungs-Generator, Auto-Korrektur, CSV-Exporte, API-Zugang, erweiterte Statistiken. Empfohlen für die meisten Schulen.",
      },
      {
        heading: "Enterprise — auf Anfrage",
        body: "Alles aus Pro plus: Multi-Campus-Verwaltung unter einem Schulträger, White-Label (eigene Domain, Logo, Farben), SAML SSO, SCIM-Provisioning, dedizierter Support mit SLA, individuelle Datenschutz-Vereinbarungen.",
      },
      {
        heading: "Testphase",
        body: "Alle neuen Schulen starten mit 30 Tagen Pro-Features kostenlos. Danach automatischer Wechsel auf Basic, sofern kein Plan aktiv ist. Abrechnung monatlich, Kündigung jederzeit zum Monatsende.",
      },
    ],
  },
  {
    slug: "sitz-kontingent",
    category: "Abrechnung",
    title: "Sitz-Kontingent erhöhen",
    summary: "Schüler-Sitze erweitern wenn das Kontingent voll ist.",
    sections: [
      {
        heading: "Wann ist das Kontingent erreicht?",
        body: "Das Dashboard unter /admin zeigt eine Warnung wenn 90 % der Sitze belegt sind. Neue Schüler-Einladungen werden blockiert sobald 100 % erreicht sind.",
      },
      {
        heading: "Kontingent anpassen",
        body: "Gehe zu /admin/lizenz → 'Sitze erweitern'. Wähle das neue Sitz-Paket (Schritte: +50, +100, +250, +500). Die Änderung ist sofort wirksam, die Abrechnung wird anteilig für den laufenden Monat berechnet.",
      },
      {
        heading: "Massengutschrift (Enterprise)",
        body: "Enterprise-Kunden können Schüler-Jahres-Lizenzen vorab kaufen. Kontaktiere sales@mastermind.app für ein individuelles Angebot.",
      },
    ],
  },

  // ── API ──────────────────────────────────────────────────────────────────
  {
    slug: "rest-api-webhooks",
    category: "API",
    title: "REST-API & Webhooks",
    summary: "Externe Systeme an MasterMind anbinden — Endpunkte, Authentifizierung, Webhooks.",
    sections: [
      {
        heading: "Authentifizierung",
        body: "Alle API-Anfragen benötigen einen Bearer-Token im Authorization-Header. Tokens werden unter /admin/integrationen → API generiert. Tokens sind schul-spezifisch und laufen nach 1 Jahr ab.",
      },
      {
        heading: "Wichtige Endpunkte",
        body: "GET /api/v1/users — Nutzerliste. POST /api/v1/users — Nutzer anlegen. GET /api/v1/grades?studentId=… — Noten eines Schülers. GET /api/v1/timetable?classId=… — Stundenplan einer Klasse. Vollständige Referenz: /plattform/kb/rest-api-reference (demnächst).",
      },
      {
        heading: "Webhooks",
        body: "Unter /admin/integrationen → Webhooks kannst du eine URL hinterlegen, die bei folgenden Ereignissen aufgerufen wird: user.created, grade.added, assignment.submitted, absence.reported. Payload ist JSON, Signatur via HMAC-SHA256.",
      },
      {
        heading: "Rate Limits",
        body: "Basic: 100 Anfragen/Minute. Pro: 500 Anfragen/Minute. Enterprise: individuell konfigurierbar. Bei Überschreitung: HTTP 429 mit Retry-After-Header.",
      },
    ],
  },

  // ── DSGVO ─────────────────────────────────────────────────────────────────
  {
    slug: "datenschutz-avv-checkliste",
    category: "DSGVO",
    title: "Datenschutz & AVV — Checkliste",
    summary: "Was Schulen vor dem Produktiveinsatz datenschutzrechtlich erledigen müssen.",
    sections: [
      {
        heading: "AVV unterzeichnen",
        body: "MasterMind verarbeitet personenbezogene Daten (Schülernamen, Noten) im Auftrag der Schule. Gemäß Art. 28 DSGVO ist ein Auftragsverarbeitungsvertrag (AVV) Pflicht. Den vorausgefüllten AVV findest du unter /avv — drucken, unterschreiben, an datenschutz@mastermind.app senden.",
      },
      {
        heading: "Datenschutzerklärung prüfen",
        body: "Die Schule ist Verantwortliche i. S. d. DSGVO und muss Schüler und Eltern über die Datenverarbeitung informieren. Unsere Muster-Datenschutzerklärung für Schulen steht als DOCX zum Download bereit (Link im Admin-Bereich).",
      },
      {
        heading: "KI-Nutzung kommunizieren",
        body: "Der KI-Tutor überträgt Anfragen (pseudonymisiert) an Anthropic (USA) via Standardvertragsklauseln. Dies muss in der schulischen Datenschutzerklärung erwähnt werden. MasterMind stellt entsprechende Formulierungen bereit.",
      },
      {
        heading: "Minderjährigen-Schutz",
        body: "Für Schüler unter 16 Jahren ist gemäß Art. 8 DSGVO die Einwilligung der Erziehungsberechtigten erforderlich. Das Eltern-Einladungs-System stellt sicher, dass Eltern-Accounts vor Schüler-Accounts aktiv werden.",
      },
    ],
  },
  {
    slug: "dsgvo-export",
    category: "DSGVO",
    title: "DSGVO-Export anfordern",
    summary: "Vollständigen Datensatz einer Schule als ZIP exportieren (Art. 20 DSGVO).",
    sections: [
      {
        heading: "Wer kann exportieren?",
        body: "Nur Schul-Admins und Super-Admins können den DSGVO-Export auslösen. Der Export enthält alle personenbezogenen Daten der Schule: Nutzer, Noten, Aufgaben, Nachrichten, Audit-Log.",
      },
      {
        heading: "Export anfordern",
        body: "Gehe zu /admin → 'DSGVO-Export' (unten in der Seitenleiste) oder rufe direkt GET /api/admin/dsgvo-export auf. Der Export wird als ZIP generiert und enthält JSON-Dateien pro Datenkategorie.",
      },
      {
        heading: "Inhalt des Exports",
        body: "users.json — alle Nutzer mit Stammdaten. grades.json — alle Noteneinträge. assignments.json — alle Aufgaben und Abgaben. messages.json — alle Nachrichten-Threads. audit_log.json — vollständiges Aktivitätsprotokoll.",
      },
      {
        heading: "Löschung bei Vertragsende",
        body: "Nach Vertragsende werden alle Daten binnen 30 Tagen unwiderruflich gelöscht. Eine Löschbestätigung wird per E-Mail zugesandt. Für Einzelpersonen-Löschung (Recht auf Vergessenwerden) steht /admin/nutzer/[id] → 'Endgültig löschen' bereit.",
      },
    ],
  },

  // ── Fehlerbehebung ────────────────────────────────────────────────────────
  {
    slug: "login-probleme",
    category: "Fehlerbehebung",
    title: "Häufige Login-Probleme",
    summary: "Passwort vergessen, 2FA-Code ungültig, Rate-Limit — Lösungen auf einen Blick.",
    sections: [
      {
        heading: "Passwort vergessen",
        body: "Nutzer gehen auf /login/passwort-vergessen und geben ihre E-Mail ein. Der Reset-Link ist 15 Minuten gültig. Admins können auch unter /admin/nutzer/[id] einen neuen Einladungslink senden.",
      },
      {
        heading: "2FA-Code wird abgelehnt",
        body: "Ursache 1: Uhr des Smartphones nicht synchronisiert → Uhrzeit automatisch einstellen aktivieren. Ursache 2: Code bereits verbraucht → 30 Sekunden warten. Admins können 2FA für einen Nutzer unter /admin/nutzer/[id] → '2FA zurücksetzen' deaktivieren.",
      },
      {
        heading: "Rate-Limit erreicht (zu viele Versuche)",
        body: "Nach 8 fehlgeschlagenen Logins wird die IP + E-Mail-Kombination für 10 Minuten gesperrt. Meldung: 'Zu viele Versuche'. Lösung: 10 Minuten warten oder anderes Netzwerk nutzen. Super-Admins können das Limit unter /plattform/sicherheit temporär aufheben.",
      },
      {
        heading: "Magic Link funktioniert nicht",
        body: "Magic Links sind einmalig und 15 Minuten gültig. Bei erneutem Klick nach Ablauf erscheint 'Link ungültig'. Lösung: Neuen Magic Link anfordern. Prüfe ob der E-Mail-Client den Link in mehrere Zeilen umbricht — in diesem Fall den Link manuell zusammensetzen.",
      },
      {
        heading: "Konto gesperrt / unverifiziert",
        body: "Neue Konten müssen die E-Mail bestätigen. Unverifizierte Konten erscheinen in /admin/nutzer mit gelbem Badge. Admin kann unter /admin/nutzer/[id] → 'Einladungs-E-Mail senden' eine neue Verifizierungs-Mail auslösen.",
      },
    ],
  },
  {
    slug: "push-benachrichtigungen",
    category: "Fehlerbehebung",
    title: "Push-Benachrichtigungen einrichten",
    summary: "VAPID-Schlüssel generieren, Service Worker debuggen, Browser-Berechtigungen prüfen.",
    sections: [
      {
        heading: "VAPID-Schlüssel konfigurieren",
        body: "Push-Benachrichtigungen benötigen VAPID-Schlüssel in der Serverumgebung. Generiere sie mit: npx web-push generate-vapid-keys. Trage NEXT_PUBLIC_VAPID_PUBLIC_KEY (Browser) und VAPID_PRIVATE_KEY (Server) in die .env ein. Ohne diese Keys werden Push-Subscriptions lautlos abgelehnt.",
      },
      {
        heading: "Browser-Berechtigung",
        body: "Nutzer müssen Push explizit erlauben. Der Toggle dafür erscheint in /app/einstellungen → Benachrichtigungen. Wenn ein Nutzer 'Blockiert' hat, muss er dies manuell in den Browser-Einstellungen zurücksetzen (Schloss-Icon in der Adressleiste).",
      },
      {
        heading: "iOS / Safari (PWA)",
        body: "Safari auf iOS unterstützt Web-Push erst ab iOS 16.4 und nur wenn die App als PWA zum Home-Bildschirm hinzugefügt wurde. Über den Safari-Browser (ohne Installierung) funktioniert Push auf iOS nicht.",
      },
      {
        heading: "Service Worker debuggen",
        body: "Öffne Chrome DevTools → Application → Service Workers. Prüfe ob der SW unter /sw.js registriert ist und 'Activated and running' zeigt. Fehler erscheinen unter 'Console'. Nach Änderungen an public/sw.js: 'Update on reload' aktivieren.",
      },
    ],
  },
];

export function getArticle(slug: string): KbArticle | undefined {
  return ARTICLES.find((a) => a.slug === slug);
}
