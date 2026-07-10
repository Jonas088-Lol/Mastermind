# Store-Listing & Data Safety — fertig zum Eintragen

Copy-&-paste-Vorlagen für die Play Console (und später App Store Connect).
Der ⚖️-markierte Teil ist eine rechtliche Entscheidung → mit DSB abstimmen.

---

## 1. Texte (Play Console → Store-Eintrag)

**App-Name (30 Zeichen):**
```
MasterMind
```

**Kurzbeschreibung (max. 80 Zeichen):**
```
Die Lernplattform deiner Schule – Aufgaben, Noten & Belohnungen an einem Ort.
```

**Ausführliche Beschreibung (max. 4000 Zeichen):**
```
MasterMind ist die digitale Lernplattform für deine Schule. Hausaufgaben,
Aufgaben und Arbeitsblätter, Noten und Nachrichten von Lehrkräften – alles an
einem Ort, jederzeit auf dem Handy.

FÜR SCHÜLERINNEN UND SCHÜLER
• Hausaufgaben und Aufgaben immer im Blick
• Sofort sehen, wenn es Neues gibt – per Push-Benachrichtigung
• Lernfortschritt verfolgen und Belohnungen sammeln
• Gemeinsam lernen: Duelle, Mannschaften und Ranglisten

FÜR LEHRKRÄFTE
• Aufgaben, Arbeitsblätter und Noten schnell verteilen
• Klasse per Nachricht erreichen
• Fortschritt der Klasse im Cockpit sehen

FÜR ELTERN
• Einträge und Rückmeldungen der Schule nachvollziehen

DATENSCHUTZ
MasterMind ist für den Schuleinsatz gebaut und hält sich an die DSGVO. Daten
werden verschlüsselt übertragen und gespeichert, auf Servern in Deutschland.
Konten und Daten können jederzeit gelöscht werden.

Die Nutzung erfolgt über einen Zugang, den deine Schule bereitstellt.
```

**Kategorie:** Bildung
**Kontakt-E-Mail:** support@konvertis.de  *(prüfen/anpassen)*
**Datenschutz-URL:** https://konvertis.de/legal/datenschutz  *(Pfad verifizieren)*

---

## 2. Grafik-Assets (Pflicht)

| Asset | Format | Hinweis |
|---|---|---|
| App-Icon | 512×512 PNG | euer Logo, kein Text am Rand |
| Feature-Grafik | 1024×500 PNG | Banner oben im Store |
| Screenshots Handy | mind. 2, 16:9 oder 9:16 | echte App-Screens (Schüler-Dashboard, Hausaufgaben, Ranking) |

Screenshots einfach am Testgerät aufnehmen, sobald die App im Internal Testing
läuft. Für die Feature-Grafik reicht ein schlichtes Banner mit Logo + Slogan.

---

## 3. ⚠ Data Safety (Play Console → App-Inhalte → Datensicherheit)

Muss **exakt** zu eurer Datenschutzerklärung passen. Vorausgefüllt aus eurem
Datenmodell – vor dem Absenden gegenprüfen:

**Werden Daten erhoben/geteilt?** → Erhoben: Ja. Geteilt mit Dritten: **Nein**
(nur eure eigenen Server; kein Verkauf, keine Werbe-Weitergabe).

**Sind Daten bei der Übertragung verschlüsselt?** → **Ja** (TLS/HTTPS).
**Können Nutzer Löschung beantragen?** → **Ja** (Konto-Löschung + Export
vorhanden: `/api/me/export`, Löschfunktion). Lösch-URL/Weg angeben.

**Erhobene Datentypen** (ankreuzen):
| Typ | Erhoben | Zweck | Pflicht? |
|---|---|---|---|
| Name | Ja | App-Funktion (Zuordnung Schüler/Lehrer) | Ja |
| E-Mail-Adresse | Ja | Konto/Login | Ja |
| Nutzer-IDs | Ja | App-Funktion | Ja |
| App-Aktivität (Lernfortschritt, Aufgaben, Noten) | Ja | App-Funktion | Ja |
| In-App-Nachrichten | Ja | App-Funktion (Kommunikation Schule) | Ja |
| Fotos (Hausaufgaben-Scan, optional) | Ja | App-Funktion | Nein |
| Absturz-/Diagnosedaten | nur wenn ihr Logging nutzt → ehrlich angeben | Analyse | Nein |

Kein Standort, keine Kontakte, keine Werbe-IDs → alles auf „Nein".

---

## 4. ⚖️ Zielgruppe & Kinder (der kritische Punkt)

**Play Console → App-Inhalte → Zielgruppe und Inhalte.**

**Gewählt: „Auch für Kinder (unter 13)" → Googles Programm „Für Familien".**
(⚖️ finale Bestätigung durch DSB vor dem Absenden.)

Daraus folgende Pflichten, die technisch/organisatorisch erfüllt sein müssen:
- **Keine personalisierte Werbung, keine Werbe-IDs, kein Ad-Tracking.** (Habt
  ihr nicht — muss so bleiben, auch in Data Safety auf „Nein".)
- **Datensparsamkeit:** nur erheben, was die Schulfunktion braucht.
- **Elterliche Einwilligung / Schulträger-Einwilligung** muss dokumentiert
  sein. Da MasterMind über die Schule bereitgestellt wird (AVV mit Schule,
  Einwilligung über Schulträger/Eltern), läuft die Rechtsgrundlage darüber –
  das muss in der Datenschutzerklärung sauber stehen.
- **Family-Policy-Konformität:** keine externen Links/Käufe, die Kinder aus dem
  geschützten Rahmen führen; In-App-Käufe (Münzen-Echtgeld) wurden bereits
  entfernt – das ist hier wichtig und muss so bleiben.
- Google verlangt ggf. einen zusätzlichen **Families-Review** – längere
  Prüfzeit einplanen.

Für App Store (iOS) das Pendant: **Kids Category** mit vergleichbaren Auflagen.

**Content-Rating-Fragebogen:** ehrlich ausfüllen (keine Gewalt, kein
nutzergenerierter öffentlicher Content außer moderierten Schul-Nachrichten) →
ergibt USK 0/6.

---

## 5. ⚠ Review-Zugang (sonst sichere Ablehnung)

Die App hat eine Login-Wall. Google/Apple müssen rein können:
**App-Freigabe → „App-Zugriff" → Anmeldedaten angeben:**
```
E-Mail:   demo.schueler@konvertis.de
Passwort: (euer Demo-Passwort)
```
Am besten je einen Demo-Zugang für Schüler und Lehrer hinterlegen, plus kurzer
Hinweis „Zugang wird normalerweise von der Schule vergeben".

---

## 6. Wichtige Gotchas
- **versionCode** muss bei JEDEM neuen Upload höher sein (aktuell `1`).
  Vor dem nächsten Build in `android/app/build.gradle` `versionCode 2` usw.
- Data Safety und Datenschutzerklärung dürfen sich **nicht widersprechen** –
  das ist der häufigste Ablehnungsgrund bei Schul-/Kinder-Apps.
