# Datenschutz-Folgenabschätzung (DSFA / DPIA)

**Art. 35 DSGVO** · Plattform: MasterMind / konvertis.de

> ⚠ Rechtsdokument-Entwurf. Muss vom Datenschutzbeauftragten (DSB) finalisiert
> und von der Geschäftsführung freigegeben werden. Ergänzt das VVT (`vvt.md`).

## 1. Warum ist eine DSFA erforderlich?
Eine DSFA ist verpflichtend, weil mehrere Kriterien der Art.-29-Gruppe/DSK
zutreffen (ab zwei Kriterien i. d. R. Pflicht):
1. **Daten schutzbedürftiger Personen** — überwiegend Minderjährige, teils <13.
2. **Systematische Überwachung** — Aktivitätszeit, Lernfortschritt, Ranglisten.
3. **Innovative Technologie** — KI-gestützte Funktionen (Tutor, Bewertung).
4. **Umfangreiche Verarbeitung** — potenziell viele Schulen/Klassen.
5. **Bewertung/Scoring** — Noten, Gamification-Ranking.

→ DSFA erforderlich.

## 2. Systematische Beschreibung der Verarbeitung
Siehe VVT (`vvt.md`) für Tätigkeiten, Datenkategorien, Empfänger, Rechtsgrund-
lagen. Kern: schulische Lernplattform; Bereitstellung über die Schule
(Auftragsverarbeitung), Einwilligung/Legitimation über Schulträger/Eltern
(Art. 8 bei <16).

## 3. Notwendigkeit & Verhältnismäßigkeit
- **Zweckbindung:** Daten dienen ausschließlich dem schulischen Lernbetrieb.
- **Datenminimierung:** nur funktionsnotwendige Daten; keine Werbung, keine
  Werbe-IDs, kein Cross-Site-Tracking, keine In-App-Käufe.
- **KI-Minimierung:** vor Übermittlung an die KI werden Namen pseudonymisiert
  (Initialen); Prompt-Längen begrenzt; Tages-Limits pro Nutzer.
- **Speicherbegrenzung:** Retention-Job + Löschung bei Vertragsende.

## 4. Risiken für die Rechte und Freiheiten der Betroffenen

| # | Risiko | Ursache | Schwere | Eintritt |
|---|---|---|---|---|
| R1 | Offenlegung von Noten/Leistungsdaten | unbefugter Zugriff, Fehlberechtigung | hoch | mittel |
| R2 | Sensible Daten in Freitext (Nachrichten/Abgaben) | Nutzer geben unbeabsichtigt Gesundheits-/Privatdaten ein | mittel | mittel |
| R3 | KI-Drittlandtransfer (USA) | Übermittlung an Anthropic | mittel | niedrig (pseudonymisiert) |
| R4 | Profilbildung durch Gamification/Ranking | systematische Aktivitätserfassung | mittel | mittel |
| R5 | Kontoübernahme (v. a. Lehrer/Admin) | schwaches Passwort, kein 2. Faktor | hoch | mittel |
| R6 | Datenverlust | Ausfall/Angriff ohne Backup | hoch | niedrig |
| R7 | Sichtbarkeit von Klarnamen in Ranglisten | Peer-Vergleich unter Minderjährigen | niedrig–mittel | hoch |

## 5. Abhilfemaßnahmen (bereits umgesetzt / geplant)

| Risiko | Maßnahme | Status |
|---|---|---|
| R1 | Rollen-/Zugriffskontrolle, Field-Level-Verschlüsselung, TLS/HSTS, CSP | umgesetzt |
| R2 | Hinweis/Netiquette, Möglichkeit zur Löschung; ⟨ggf. Moderation⟩ | teils / prüfen |
| R3 | Pseudonymisierung vor KI-Call, SCC/AVV, Nutzungs-Limits | umgesetzt; ⚖️ Transfer im Review |
| R4 | Zweckbindung, keine Werbung, Opt-out-Optionen prüfen | teils / prüfen |
| R5 | **2FA für Lehrkräfte/Admins**, scrypt-Hashing, Session-Hashing, Lockout | 2FA: siehe Umsetzung; Rest umgesetzt |
| R6 | Verschlüsselte tägliche Backups (age), Offsite, Restore-Test | umgesetzt (Restore-Test regelmäßig) |
| R7 | Ranglisten auf Klassen-/Schul-Ebene, ⟨Pseudonym-/Opt-out-Option erwägen⟩ | prüfen |

## 6. Bewertung des Restrisikos
Nach Umsetzung der Maßnahmen wird das Restrisiko als **vertretbar** eingeschätzt.
Offene Punkte für den DSB-Review:
- Drittlandtransfer KI (R3): Restrisiko final bewerten; EU-Region/Alternative prüfen.
- Freitext-sensible Daten (R2): Moderations-/Hinweiskonzept.
- Klarnamen in Ranglisten (R7): Pseudonym- oder Opt-out-Option erwägen.

## 7. Einbindung & Freigabe
- DSB konsultiert: ⟨Datum, Name⟩
- Betroffene/Vertretung angehört (soweit angemessen): ⟨…⟩
- Freigabe Geschäftsführung: ⟨Datum⟩
- Nächste Überprüfung: bei wesentlichen Änderungen, mind. jährlich.

_Stand: ⟨Datum⟩_
