# Datenschutz-Dokumentation — MasterMind

> Arbeitsdokument, **keine Rechtsberatung**. ⚖️-Punkte müssen mit einer/einem
> Datenschutzbeauftragten oder Anwalt/Anwältin geprüft werden. Stand: 09.07.2026.

MasterMind ist eine Lernplattform mit überwiegend **minderjährigen** Nutzern.
Damit gelten erhöhte Anforderungen: Art. 8 DSGVO (Einwilligung Minderjähriger),
TTDSG/DDG (Cookies), bei Schulen ggf. Auftragsverarbeitung (Art. 28).

## 1. Datenklassifizierung

Verbindliche Zuordnung in Code: `src/lib/privacy/classification.ts`.

| Stufe | Bedeutung | Beispiele |
|---|---|---|
| PUBLIC | kein Personenbezug | Fächerkatalog, Landkreise |
| INTERNAL | intern, kein Personenbezug | Konfiguration, aggregierte Zähler |
| PII | personenbezogen (Art. 4 Nr. 1) | E-Mail, IP, Avatar, Nachrichten |
| SENSITIVE_MINOR | PII Minderjähriger / sensible Profile | Name, Noten, Verhaltensdaten, Tracking |
| SPECIAL_CATEGORY | besondere Kategorien (Art. 9) | Krankmeldungs-Freitext |
| SECRET | Auth-Geheimnisse | Passwort-Hash, Tokens, 2FA-Secret |

## 2. Datenminimierung — umgesetzt (Phase 1)

- **KI-Lernplan:** Klarname wird **nicht mehr** an Anthropic gesendet
  (`api/ai/lernplan`). Der KI-Tutor-Prompt enthält nur Fach-Durchschnitte +
  Aufgabentitel, keinen Namen.
- **Analytics-Pseudonymisierung:** `pseudonymId()` (HMAC über User-ID, mit
  `SESSION_SECRET` gesalzen) für Statistiken statt Klarname/ID.
- **Log-Redaction:** `src/lib/security/redact.ts` maskiert E-Mail, IP,
  Tokens, User-Agent. Angewandt in E-Mail-Console-Transport und Firewall-Alert.

## 3. Drittempfänger (Übermittlungen)

| Empfänger | Zweck | Übermittelte Daten | ⚖️ offen |
|---|---|---|---|
| Anthropic (USA) | KI-Tutor/Lernplan/Korrektur | Noten (Ø), Aufgabentitel, Abgabetexte, Nutzereingaben — **kein Klarname mehr** | AVV + Drittlandtransfer prüfen |
| Resend | E-Mail (Magic-Link, Reset, Postfach) | E-Mail-Adresse, Betreff, Body | AVV |
| Mollie | Zahlungen | Zahlungs-ID, Betrag (kein Klarname) | AVV |
| Web-Push-Gateways | Benachrichtigungen | Push-Endpoint, Titel/Body | Inhalts-Minimierung prüfen |

## 4. Offene Punkte (nächste Phasen)

- **Pseudonymisierung Richtung Anthropic** ist für Freitexte weiterhin nur
  Regex-basiert (`ai/index.ts`) — Restrisiko, dass Namen in Chat-Eingaben
  durchrutschen. ⚖️ AVV mit Anthropic klären.
- **Krankmeldungs-Freitext** (`Absence.reason`) ist als SPECIAL_CATEGORY
  klassifiziert, aber technisch noch nicht gesondert zugriffsbeschränkt.
- **Retention/Löschkonzept** (Art. 5 Abs. 1 lit. e) fehlt — Phase 10/11.
- **Field-Level-Encryption** für `twoFactorSecret`, `SsoConfig.clientSecret` —
  Phase 2 (in `classification.ts` mit `encrypt: true` markiert).
- **Consent-Flow für <16** (Art. 8) — Phase 5.
- **DSFA (Art. 35)** wegen Verhaltens-Tracking Minderjähriger — Phase 14.

## 5. Technische & organisatorische Maßnahmen (TOM, Art. 32) — Kurzstand

- Passwörter: scrypt (N=32768), versioniert, transparentes Re-Hashing beim
  Login. Session-Tokens in DB nur SHA-256-gehasht.
- **Verschlüsselung in transit:** nginx erzwingt HTTPS (HTTP→301), TLS 1.2/1.3,
  moderne Cipher-Suites, HSTS `max-age=31536000; includeSubDomains; preload`,
  OCSP-Stapling. Empfehlung: reines TLS 1.3, sobald keine Alt-WebViews mehr
  bedient werden müssen (`nginx/conf.d/mastermind.conf`).
- **Verschlüsselung at rest (Feld-Ebene):** `src/lib/privacy/field-encryption.ts`
  — AES-256-GCM, HKDF-abgeleitete Feldschlüssel, Key-Versionierung/Rotation.
  Aktiv für `User.twoFactorSecret` und `SsoConfig.clientSecret` (sobald
  `FIELD_ENCRYPTION_KEYS`/`ACTIVE` gesetzt). Re-Encrypt/Rotation:
  `scripts/reencrypt-fields.ts`.
- **Volume-Verschlüsselung (Disk):** ⚖️ mit ZAP-Hosting klären (LUKS auf dem
  VServer). Feld-Encryption schützt die sensibelsten Spalten unabhängig davon.
- Interne Verbindungen App↔Postgres↔Redis: privates Docker-Netz, nicht
  exponiert. Postgres derzeit `sslmode=disable` (intern) — bei getrennten Hosts
  TLS aktivieren.
- Rate-Limiting (Redis) auf Login/Registrierung/Reset/AI. HMAC-Gate.
- Security-Header (CSP, HSTS, X-Frame-Options) via `next.config.ts`.
- Postgres/Redis nicht öffentlich exponiert, Container non-root.
- Audit-Log für sicherheitsrelevante Events (`AuditLog`).

### Field-Encryption: Was verschlüsselt wird — und was nicht

Bewusst NUR selten gelesene Geheimnisse (2FA-Secret, SSO-Client-Secret).
Nicht field-verschlüsselt werden durchsuchbare/häufig gelesene Felder wie
E-Mail oder Name — dort würde Verschlüsselung Suche/Joins brechen und bringt
gegenüber Disk- + Transport-Verschlüsselung wenig. Passwörter werden **nie**
verschlüsselt, sondern gehasht.

### ENV für Field-Encryption

```
FIELD_ENCRYPTION_KEYS="v1:<base64-32-byte-key>"
FIELD_ENCRYPTION_ACTIVE="v1"
```
Key erzeugen: `node -e "console.log('v1:'+require('crypto').randomBytes(32).toString('base64'))"`
Rotation: neuen Key `v2:` ergänzen, `ACTIVE=v2` setzen, `reencrypt-fields.cjs --write` laufen lassen, danach `v1` entfernen.
