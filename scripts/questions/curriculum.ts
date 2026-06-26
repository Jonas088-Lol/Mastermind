/**
 * Lehrplan-Taxonomie: Bundesland → Schulart → Jahrgangsstufe → Fach → Thema.
 *
 * WICHTIG: Das hier ist ein REPRÄSENTATIVER SEED, kein vollständiger Lehrplan.
 * Themenlisten unterscheiden sich je Bundesland. Pflege die echten Themen
 * aus dem offiziellen Lehrplan (z. B. LehrplanPLUS Bayern: lehrplanplus.bayern.de)
 * und ergänze weitere Schularten / Stufen / Fächer nach demselben Muster.
 *
 * Der Generator multipliziert jedes Thema automatisch mit 5 Schwierigkeitsstufen.
 */

export interface ThemaDef {
  thema: string;
  /** Optional: feinere Schwerpunkte, die der Generator als Hinweis nutzt. */
  unterthemen?: string[];
}

export interface FachDef {
  fach: string;
  themen: ThemaDef[];
}

export interface JahrgangsDef {
  jahrgangsstufe: number;
  faecher: FachDef[];
}

export interface SchulartDef {
  schulart: string;
  jahrgaenge: JahrgangsDef[];
}

export interface CurriculumDef {
  bundesland: string;
  schularten: SchulartDef[];
}

const t = (thema: string, unterthemen?: string[]): ThemaDef => ({ thema, unterthemen });

export const CURRICULUM_BAYERN: CurriculumDef = {
  bundesland: "bayern",
  schularten: [
    {
      schulart: "gymnasium",
      jahrgaenge: [
        {
          jahrgangsstufe: 5,
          faecher: [
            {
              fach: "mathematik",
              themen: [
                t("Natürliche Zahlen", ["Stellenwertsystem", "Runden", "Zahlenstrahl"]),
                t("Rechnen mit natürlichen Zahlen", ["Addition/Subtraktion", "Multiplikation/Division", "Rechengesetze"]),
                t("Größen und Einheiten", ["Länge", "Masse", "Zeit", "Geld"]),
                t("Geometrische Grundbegriffe", ["Strecke/Gerade", "Winkelarten", "Koordinatensystem"]),
              ],
            },
            {
              fach: "deutsch",
              themen: [
                t("Wortarten", ["Nomen", "Verben", "Adjektive", "Pronomen"]),
                t("Satzglieder", ["Subjekt", "Prädikat", "Objekte"]),
                t("Rechtschreibung Grundlagen", ["Groß-/Kleinschreibung", "s-Laute", "Dehnung/Schärfung"]),
                t("Erzählende Texte", ["Märchen", "Erlebniserzählung", "Spannungsbogen"]),
              ],
            },
            {
              fach: "englisch",
              themen: [
                t("Personal pronouns and to be", ["I/you/he/she", "am/is/are"]),
                t("Simple present", ["Aussagesatz", "Verneinung", "Fragen mit do/does"]),
                t("Plural and articles", ["regular/irregular plurals", "a/an/the"]),
                t("Wortschatz Alltag", ["family", "school", "numbers and time"]),
              ],
            },
          ],
        },
        {
          jahrgangsstufe: 6,
          faecher: [
            {
              fach: "mathematik",
              themen: [
                t("Bruchrechnung", ["Kürzen/Erweitern", "Addition/Subtraktion", "Multiplikation/Division"]),
                t("Dezimalzahlen", ["Stellenwert", "Runden", "Grundrechenarten"]),
                t("Teilbarkeit", ["Teilbarkeitsregeln", "ggT/kgV", "Primzahlen"]),
                t("Flächeninhalt und Umfang", ["Rechteck", "Dreieck", "zusammengesetzte Figuren"]),
              ],
            },
            {
              fach: "deutsch",
              themen: [
                t("Zeitformen des Verbs", ["Präsens/Präteritum", "Perfekt/Plusquamperfekt", "Futur"]),
                t("Adverbiale Bestimmungen", ["Ort", "Zeit", "Art und Weise", "Grund"]),
                t("Berichten", ["Sachlichkeit", "W-Fragen", "Tempus"]),
                t("Argumentieren Grundlagen", ["These", "Argument", "Beispiel"]),
              ],
            },
            {
              fach: "englisch",
              themen: [
                t("Simple past", ["regular verbs", "irregular verbs", "questions/negation"]),
                t("Present progressive", ["form", "simple present vs progressive"]),
                t("Comparison of adjectives", ["comparative", "superlative", "as ... as"]),
                t("going-to future", ["plans", "predictions"]),
              ],
            },
          ],
        },
        {
          jahrgangsstufe: 7,
          faecher: [
            {
              fach: "mathematik",
              themen: [
                t("Prozentrechnung", ["Grundwert/Prozentwert/Prozentsatz", "Zinsrechnung"]),
                t("Rationale Zahlen", ["Zahlengerade", "Addition/Subtraktion", "Multiplikation/Division"]),
                t("Terme und Variablen", ["Aufstellen", "Zusammenfassen", "Ausmultiplizieren"]),
                t("Winkel und Dreiecke", ["Winkelsummen", "Dreiecksarten", "Kongruenz"]),
              ],
            },
          ],
        },
      ],
    },
    {
      schulart: "realschule",
      jahrgaenge: [
        {
          jahrgangsstufe: 6,
          faecher: [
            {
              fach: "mathematik",
              themen: [
                t("Bruchrechnung", ["Kürzen/Erweitern", "Grundrechenarten mit Brüchen"]),
                t("Dezimalzahlen", ["Umwandeln", "Grundrechenarten"]),
                t("Flächen und Umfang", ["Rechteck", "Dreieck"]),
              ],
            },
            {
              fach: "deutsch",
              themen: [
                t("Satzglieder und Satzarten", ["Subjekt/Prädikat/Objekt", "Haupt-/Nebensatz"]),
                t("Rechtschreibung", ["Groß-/Kleinschreibung", "das/dass"]),
                t("Inhaltsangabe", ["Kern erfassen", "sachlicher Stil"]),
              ],
            },
          ],
        },
        {
          jahrgangsstufe: 7,
          faecher: [
            {
              fach: "mathematik",
              themen: [
                t("Prozent- und Zinsrechnung", ["Grundaufgaben", "Jahreszins"]),
                t("Rationale Zahlen", ["Vorzeichenregeln", "Grundrechenarten"]),
                t("Zuordnungen", ["proportional", "antiproportional", "Dreisatz"]),
              ],
            },
          ],
        },
      ],
    },
    {
      schulart: "mittelschule",
      jahrgaenge: [
        {
          jahrgangsstufe: 7,
          faecher: [
            {
              fach: "mathematik",
              themen: [
                t("Prozentrechnung im Alltag", ["Rabatt", "Mehrwertsteuer"]),
                t("Dreisatz", ["proportional", "antiproportional"]),
                t("Flächenberechnung", ["Rechteck", "Dreieck"]),
              ],
            },
            {
              fach: "deutsch",
              themen: [
                t("Bewerbung", ["Anschreiben", "Lebenslauf"]),
                t("Rechtschreibung sichern", ["Groß-/Kleinschreibung", "das/dass"]),
                t("Sachtexte verstehen", ["Schlüsselwörter", "Kernaussage"]),
              ],
            },
          ],
        },
      ],
    },
  ],
};

/** Hier weitere Bundesländer ergänzen und in den Generator einhängen. */
export const ALLE_CURRICULA: CurriculumDef[] = [CURRICULUM_BAYERN];
