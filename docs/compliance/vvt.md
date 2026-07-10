# Verzeichnis von Verarbeitungstätigkeiten (VVT)

**Art. 30 DSGVO** · Plattform: MasterMind / konvertis.de

> ⚠ Rechtsdokument. Die mit ⟨…⟩ markierten Firmenangaben müssen mit euren
> echten Daten gefüllt werden (siehe `src/lib/company.ts` — dort noch Platzhalter).
> Vor Produktivbetrieb durch euren Datenschutzbeauftragten (DSB) prüfen lassen.

## 0. Verantwortlicher & DSB

| Feld | Angabe |
|---|---|
| Verantwortlicher | ⟨Firmenname, Anschrift⟩ |
| Vertretungsberechtigt | ⟨Geschäftsführung⟩ |
| Datenschutzbeauftragter | ⟨Name / Kontakt DSB⟩ |
| Kontakt Datenschutz | ⟨datenschutz@…⟩ |

Rolle: Die Schulen sind Verantwortliche, MasterMind ist **Auftragsverarbeiter**
(AVV je Schule). Dieses VVT dokumentiert die Verarbeitung als Auftragsverarbeiter
sowie eigene Verarbeitungen (z. B. Vertragsabwicklung mit der Schule).

## 1. Verarbeitungstätigkeiten (Überblick)

| # | Tätigkeit | Zweck | Rechtsgrundlage |
|---|---|---|---|
| V1 | Nutzerkonten (Schüler, Lehrkräfte, Verwaltung) | Zugang, Zuordnung Klasse/Schule | Art. 6(1)(b) + Schulvertrag/AVV; bei <16: Art. 8 (Einwilligung über Schulträger/Eltern) |
| V2 | Lerninhalte (Aufgaben, Hausaufgaben, Arbeitsblätter, Abgaben) | Kernfunktion Unterricht | Auftragsverarbeitung |
| V3 | Noten & Bewertungen | schulische Leistungsdokumentation | Auftragsverarbeitung |
| V4 | Nachrichten/Kommunikation | Schule↔Schüler/Eltern | Auftragsverarbeitung |
| V5 | Gamification (XP, Münzen, Streak, Ranglisten, Duelle, Boss) | Motivation/Lernanreiz | Auftragsverarbeitung |
| V6 | KI-Funktionen (Tutor, Karteikarten, Quiz, Benotungsvorschlag) | Lernunterstützung | Auftragsverarbeitung; Daten **pseudonymisiert** vor Übermittlung |
| V7 | Sessions/Logs (IP, User-Agent, Zeitstempel) | Sicherheit, Missbrauchsschutz | Art. 6(1)(f) berechtigtes Interesse |
| V8 | E-Mail-Versand (Magic-Link, Passwort-Reset, Warnungen) | Kontosicherheit/Betrieb | Art. 6(1)(b)/(f) |

## 2. Kategorien betroffener Personen
Schülerinnen/Schüler (überwiegend minderjährig, teils <13), Lehrkräfte,
Schulverwaltung/Schulträger, Erziehungsberechtigte.

## 3. Kategorien personenbezogener Daten

| Kategorie | Beispiele | Ort im System |
|---|---|---|
| Stammdaten | Name, E-Mail, Rolle, Klasse, Schule | `User`, `SchoolClass` |
| Leistungsdaten | Noten, Aufgaben-Abgaben, Lernfortschritt | `AppNotification`, Aufgaben-/Noten-Modelle, `MasterTaskProgress` |
| Kommunikation | Nachrichten, Klassenbuch-Einträge | Messaging-Modelle |
| Nutzungsdaten | XP, Münzen, Streak, Aktivitätszeit | `XpLog`, `ActivitySession`, `BossParticipant` |
| Technische Daten | IP-Adresse, User-Agent, Session-Token (gehasht) | `Session` |
| Optionale Inhalte | Hausaufgaben-Fotos | Datei-Uploads |

**Besondere Kategorien (Art. 9):** werden nicht gezielt erhoben. Freitext-Felder
(Nachrichten, Abgaben) könnten unbeabsichtigt sensible Daten enthalten → siehe DSFA.

## 4. Empfänger (Auftragsverarbeiter / Weitergabe)

| Empfänger | Zweck | Ort | Grundlage |
|---|---|---|---|
| Hetzner Online GmbH | Hosting (Server, DB, Backups) | Deutschland (FSN1) | AVV |
| Anthropic (Claude API) | KI-Funktionen | USA | AVV + SCC; Daten **pseudonymisiert** (Namen→Initialen); ⚖️ Drittlandtransfer im DSB-Review bewerten |
| Resend | transaktionaler E-Mail-Versand | ⟨Region prüfen⟩ | AVV |
| ⟨Cloudflare, falls genutzt⟩ | CDN/Proxy | ⟨…⟩ | AVV |

Keine Weitergabe zu Werbezwecken. Keine Werbe-IDs, kein Tracking (Kinder-App).

## 5. Drittlandübermittlung
- Anthropic (USA): auf Basis SCC + Pseudonymisierung. ⚖️ Restrisiko im DSB-Review
  bewerten; ggf. auf EU-Region/Alternativmodell ausweichen.

## 6. Löschfristen / Aufbewahrung
- Betroffenenrechte umgesetzt: Export (`/api/user/dsgvo-export`), Löschung
  (`eraseUser`, kaskadierend + Anonymisierung, Art. 17).
- Retention-Job: `/api/cron/retention` (regelmäßige Bereinigung).
- Nach Vertragsende mit einer Schule: Löschung/Rückgabe gemäß AVV.
- Konkrete Fristen je Datenkategorie: ⟨mit DSB festlegen und hier eintragen⟩.

## 7. Technisch-organisatorische Maßnahmen (TOM) — Kurzfassung
- Transportverschlüsselung (TLS), HSTS, restriktive CSP.
- Verschlüsselung ruhender sensibler Felder (AES-256-GCM, Field-Level).
- Passwörter: scrypt (versioniert), Session-Token nur gehasht in DB.
- Zugriffskontrolle: Rollen-Modell, Rollen-Allowlist, Super-Admin getrennt.
- Missbrauchsschutz: 3-stufige Firewall, Rate-Limits, Fail2ban, ufw+Cloudflare.
- Verschlüsselte tägliche Backups (age), Offsite.
- Logging PII-maskiert; Fehler-Alerting.
- Pseudonymisierung vor KI-Übermittlung.
- Details: `docs/security/`, `SECURITY.md`.

_Stand: ⟨Datum⟩ · Nächste Prüfung: ⟨Datum⟩_
