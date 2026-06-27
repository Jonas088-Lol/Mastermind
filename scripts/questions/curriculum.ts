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
            {
              fach: "biologie",
              themen: [
                t("Pflanzenorgane", ["Wurzel", "Stängel", "Blatt", "Blüte"]),
                t("Tiere und Lebensräume", ["Wirbeltiere", "Wirbellose", "Anpassung"]),
                t("Ökosystem Grundlagen", ["Produzenten/Konsumenten", "Nahrungsketten"]),
              ],
            },
            {
              fach: "chemie",
              themen: [
                t("Stoffe und ihre Eigenschaften", ["Aggregatzustände", "Löslichkeit", "Dichte"]),
                t("Stoffgemische und Trennverfahren", ["Filtrieren", "Destillation", "Chromatographie"]),
              ],
            },
            {
              fach: "geschichte",
              themen: [
                t("Vorgeschichte und Steinzeit", ["Altsteinzeit", "Jungsteinzeit", "Metallzeiten"]),
                t("Altes Ägypten", ["Pharaonen", "Hieroglyphen", "Nilkultur"]),
                t("Antikes Griechenland", ["Stadtstaaten", "Demokratie", "Olympische Spiele"]),
              ],
            },
            {
              fach: "informatik",
              themen: [
                t("Grundlagen des Computers", ["Hardware", "Software", "Betriebssystem"]),
                t("Binärsystem", ["Umrechnung Dezimal/Binär", "Bits und Bytes"]),
                t("Internet und Datenschutz", ["WWW", "Sicherheit", "Datenschutz"]),
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
            {
              fach: "biologie",
              themen: [
                t("Zelle Grundlagen", ["Zellkern", "Zellmembran", "Pflanzenzelle vs Tierzelle"]),
                t("Wirbeltierklassen", ["Säugetiere", "Vögel", "Reptilien", "Amphibien", "Fische"]),
                t("Sinnesorgane", ["Auge", "Ohr", "Haut", "Reiz-Reaktion"]),
              ],
            },
            {
              fach: "physik",
              themen: [
                t("Mechanik Grundlagen", ["Kraft", "Gewicht", "Hebel"]),
                t("Optik Grundlagen", ["Lichtausbreitung", "Reflexion", "Brechung"]),
                t("Wärmelehre Grundlagen", ["Temperatur", "Wärmeausdehnung", "Wärmeleitung"]),
              ],
            },
            {
              fach: "chemie",
              themen: [
                t("Atombau Grundlagen", ["Kern-Hülle-Modell", "Protonen/Elektronen/Neutronen"]),
                t("Chemische Reaktionen", ["Reaktionsgleichungen", "Edukte/Produkte"]),
                t("Verbrennung und Oxidation", ["Sauerstoff", "Oxide", "Brandschutz"]),
              ],
            },
            {
              fach: "geschichte",
              themen: [
                t("Römisches Reich", ["Republik", "Kaiserzeit", "Romanisierung"]),
                t("Frühes Mittelalter", ["Völkerwanderung", "Frankenreich", "Karolinger"]),
              ],
            },
            {
              fach: "informatik",
              themen: [
                t("Algorithmen Grundlagen", ["Sequenz", "Verzweigung", "Schleife"]),
                t("Scratch Programmierung", ["Skripte", "Objekte", "Variablen"]),
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
            {
              fach: "deutsch",
              themen: [
                t("Erörterung", ["These", "Argumente", "Gegenargumente", "Schluss"]),
                t("Epik und Kurzprosa", ["Erzählperspektive", "Handlung", "Charakterisierung"]),
                t("Sprachliche Gestaltungsmittel", ["Metapher", "Vergleich", "Personifikation"]),
              ],
            },
            {
              fach: "englisch",
              themen: [
                t("Present perfect", ["have/has + past participle", "since/for", "yet/already"]),
                t("Conditional I", ["if-clause", "main clause", "will-future"]),
                t("Passive voice", ["present/past passive", "agent with by"]),
              ],
            },
            {
              fach: "biologie",
              themen: [
                t("Genetik Grundlagen", ["DNA", "Chromosomen", "Gene"]),
                t("Evolution Grundlagen", ["Natürliche Selektion", "Anpassung", "Darwin"]),
                t("Ökologie und Nahrungsnetze", ["Produzenten/Konsumenten", "Destruenten", "Energiefluss"]),
              ],
            },
            {
              fach: "physik",
              themen: [
                t("Kräfte und Bewegung", ["Newton'sche Gesetze", "Reibung", "freier Fall"]),
                t("Dichte und Auftrieb", ["Archimedisches Prinzip", "Schwimmen/Sinken"]),
                t("Elektrischer Strom Grundlagen", ["Stromkreis", "Spannung", "Widerstand"]),
              ],
            },
            {
              fach: "chemie",
              themen: [
                t("Periodensystem der Elemente", ["Perioden", "Gruppen", "Metalle/Nichtmetalle"]),
                t("Ionenbindung und Salze", ["Ionenbildung", "Ionengitter", "Löslichkeit"]),
                t("Metalle und ihre Eigenschaften", ["Metallbindung", "Legierungen", "Korrosion"]),
              ],
            },
            {
              fach: "geschichte",
              themen: [
                t("Hochmittelalter", ["Kreuzzüge", "Städte", "Ritterordnung"]),
                t("Reformation und Renaissance", ["Luther", "Buchdruck", "Humanismus"]),
                t("Absolutismus", ["Sonnenkönig", "Merkantilismus", "Ständegesellschaft"]),
              ],
            },
            {
              fach: "informatik",
              themen: [
                t("Python Grundlagen", ["Variablen", "Datentypen", "Ein-/Ausgabe"]),
                t("Datenstrukturen", ["Listen", "Wörterbücher", "Tupel"]),
                t("Netzwerke", ["IP-Adressen", "TCP/IP", "HTTP/HTTPS"]),
              ],
            },
          ],
        },
        {
          jahrgangsstufe: 8,
          faecher: [
            {
              fach: "mathematik",
              themen: [
                t("Lineare Gleichungssysteme", ["Gleichsetzungsverfahren", "Einsetzungsverfahren", "Additionsverfahren"]),
                t("Lineare Funktionen", ["y=mx+b", "Steigung", "Schnittpunkte"]),
                t("Körperberechnungen", ["Prisma", "Zylinder", "Pyramide"]),
              ],
            },
            {
              fach: "deutsch",
              themen: [
                t("Argumentation und Rhetorik", ["Argumentationstypen", "rhetorische Mittel", "Debatte"]),
                t("Gedichtanalyse", ["Metrum", "Reimschema", "Strophenform"]),
                t("Inhaltsangabe und Textanalyse", ["Struktur", "Hauptgedanke", "Sprache"]),
              ],
            },
            {
              fach: "englisch",
              themen: [
                t("Reported speech", ["say/tell", "Zeitverschiebung", "Pronomenänderung"]),
                t("Relative clauses", ["defining/non-defining", "who/which/that"]),
                t("Conditional II and III", ["would", "würde-haben", "Irrealis"]),
              ],
            },
            {
              fach: "biologie",
              themen: [
                t("Fotosynthese und Zellatmung", ["Gleichungen", "Chloroplasten", "Mitochondrien"]),
                t("Neurobiologie Grundlagen", ["Nervenzelle", "Synapse", "Reflexbogen"]),
                t("Hormonsystem", ["Hormone", "Regelkreis", "Pubertät"]),
              ],
            },
            {
              fach: "physik",
              themen: [
                t("Elektrischer Strom und Widerstand", ["Ohm'sches Gesetz", "Reihen-/Parallelschaltung"]),
                t("Magnetismus", ["Elektromagnet", "Lorentzkraft", "Induktion"]),
                t("Schall und Wellen", ["Schallgeschwindigkeit", "Frequenz", "Lautstärke"]),
              ],
            },
            {
              fach: "chemie",
              themen: [
                t("Säuren und Basen", ["pH-Wert", "Indikatoren", "Neutralisation"]),
                t("Redoxreaktionen", ["Oxidation/Reduktion", "Elektronenübertragung", "Oxidationszahl"]),
                t("Elektrochemie Grundlagen", ["Galvanisches Element", "Elektrolyse"]),
              ],
            },
            {
              fach: "geschichte",
              themen: [
                t("Amerikanische Revolution", ["Unabhängigkeitserklärung", "Ursachen", "Auswirkungen"]),
                t("Französische Revolution", ["Ständegesellschaft", "Terror", "Napoleon"]),
                t("Industrialisierung", ["Dampfmaschine", "Fabriksystem", "soziale Frage"]),
              ],
            },
            {
              fach: "informatik",
              themen: [
                t("Objektorientierte Programmierung", ["Klassen", "Objekte", "Methoden", "Vererbung"]),
                t("Rekursion", ["Rekursive Funktionen", "Basisfall", "Fibonacci"]),
                t("Datenbankgrundlagen SQL", ["SELECT", "WHERE", "JOIN", "Datenmodell"]),
              ],
            },
          ],
        },
        {
          jahrgangsstufe: 9,
          faecher: [
            {
              fach: "mathematik",
              themen: [
                t("Quadratische Gleichungen", ["Lösungsformeln", "pq-Formel", "Diskriminante"]),
                t("Quadratische Funktionen", ["Parabel", "Scheitelpunkt", "Nullstellen"]),
                t("Ähnlichkeit und Trigonometrie", ["Strahlensatz", "sin/cos/tan", "Anwendungen"]),
                t("Stochastik Grundlagen", ["Laplace-Wahrscheinlichkeit", "Baumdiagramme"]),
              ],
            },
            {
              fach: "deutsch",
              themen: [
                t("Dramen und Dramatik", ["Akte", "Konflikte", "Figurenanalyse"]),
                t("Rhetorische Mittel vertieft", ["Anaphora", "Chiasmus", "Ironie"]),
                t("Sprachgeschichte", ["Althochdeutsch", "Lehnwörter", "Sprachwandel"]),
              ],
            },
            {
              fach: "englisch",
              themen: [
                t("Modal verbs advanced", ["must/have to", "needn't/mustn't", "should have"]),
                t("Gerund and infinitive", ["verb + ing", "verb + to", "Bedeutungsunterschied"]),
                t("Text types", ["article", "letter", "speech", "essay"]),
              ],
            },
            {
              fach: "biologie",
              themen: [
                t("DNA und Proteinbiosynthese", ["Replikation", "Transkription", "Translation"]),
                t("Immunsystem", ["Antikörper", "Lymphozyten", "Impfung"]),
                t("Ökosysteme vertieft", ["Stoffkreisläufe", "Energiepyramide", "Klimawandel"]),
              ],
            },
            {
              fach: "physik",
              themen: [
                t("Energie und Arbeit", ["kinetische/potenzielle Energie", "Energieerhaltung"]),
                t("Mechanische Schwingungen", ["Frequenz", "Amplitude", "Resonanz"]),
                t("Radioaktivität", ["Zerfallsarten", "Halbwertszeit", "Strahlenarten"]),
              ],
            },
            {
              fach: "chemie",
              themen: [
                t("Organische Chemie Grundlagen", ["Kohlenstoff", "Alkane", "Nomenklatur"]),
                t("Kohlenwasserstoffe", ["Alkene", "Alkine", "Aromaten"]),
                t("Kunststoffe und Polymere", ["Polymerisation", "Eigenschaften", "Recycling"]),
              ],
            },
            {
              fach: "geschichte",
              themen: [
                t("Erster Weltkrieg", ["Ursachen", "Kriegsverlauf", "Versailler Vertrag"]),
                t("Weimarer Republik", ["Verfassung", "Krisen", "Ende der Republik"]),
                t("Nationalsozialismus", ["Machtergreifung", "Ideologie", "Terror"]),
              ],
            },
            {
              fach: "informatik",
              themen: [
                t("Sortier- und Suchalgorithmen", ["Bubble Sort", "Binäre Suche", "Komplexität"]),
                t("Kryptographie Grundlagen", ["Caesar-Chiffre", "RSA-Grundlagen", "Hash-Funktionen"]),
                t("Automaten und formale Sprachen", ["DEA", "NEA", "reguläre Ausdrücke"]),
              ],
            },
          ],
        },
        {
          jahrgangsstufe: 10,
          faecher: [
            {
              fach: "mathematik",
              themen: [
                t("Logarithmen und Exponentialfunktionen", ["log-Gesetze", "e-Funktion", "Wachstum/Zerfall"]),
                t("Vektoren in der Ebene", ["Vektoroperationen", "Skalarprodukt", "Orthogonalität"]),
                t("Stochastik vertieft", ["Bernoulli", "Binomialverteilung", "Erwartungswert"]),
              ],
            },
            {
              fach: "deutsch",
              themen: [
                t("Literaturepochen Überblick", ["Klassik", "Romantik", "Realismus"]),
                t("Textinterpretation vertieft", ["Intention", "Symbole", "Deutungshypothese"]),
                t("Komplexe Grammatik", ["Satzgefüge", "Funktionalstile", "Modalpartikeln"]),
              ],
            },
            {
              fach: "englisch",
              themen: [
                t("Advanced grammar structures", ["cleft sentences", "inversion", "participle clauses"]),
                t("Idioms and phrasal verbs", ["collocations", "context clues", "word formation"]),
                t("Literary analysis", ["characterisation", "narrative perspective", "themes"]),
              ],
            },
            {
              fach: "biologie",
              themen: [
                t("Genetik vertieft und Mendel-Gesetze", ["Dominanz", "Spaltungsregel", "Kreuzungsschema"]),
                t("Evolution vertieft", ["Artbildung", "Stammbäume", "Fossilien"]),
                t("Verhaltensbiologie", ["angeboren/erlernt", "Ethologie", "Kommunikation"]),
              ],
            },
            {
              fach: "physik",
              themen: [
                t("Elektrodynamik Grundlagen", ["Induktionsgesetz", "Generatoren", "Transformatoren"]),
                t("Elektromagnetismus", ["Maxwell-Gleichungen Grundlagen", "elektromagnetische Wellen"]),
                t("Thermodynamik", ["Hauptsätze", "Wärmekraftmaschinen", "Entropie"]),
              ],
            },
            {
              fach: "chemie",
              themen: [
                t("Elektrochemie vertieft", ["Standardpotenzial", "Nernst-Gleichung", "Akkumulatoren"]),
                t("Chemische Gleichgewichte", ["Massenwirkungsgesetz", "Le-Chatelier-Prinzip"]),
                t("Reaktionskinetik", ["Aktivierungsenergie", "Katalyse", "Reaktionsgeschwindigkeit"]),
              ],
            },
            {
              fach: "geschichte",
              themen: [
                t("Zweiter Weltkrieg", ["Ursachen", "Kriegsverlauf", "Wendepunkte"]),
                t("Holocaust und Erinnerungskultur", ["Vernichtungspolitik", "Erinnerung", "Verantwortung"]),
                t("Nachkriegsordnung", ["Potsdamer Abkommen", "UNO", "Marshallplan"]),
              ],
            },
            {
              fach: "informatik",
              themen: [
                t("Betriebssysteme", ["Prozessverwaltung", "Dateisysteme", "Parallelverarbeitung"]),
                t("Komplexitätstheorie", ["O-Notation", "P vs NP", "NP-vollständige Probleme"]),
                t("Graphen und Baumstrukturen", ["Breitensuche", "Tiefensuche", "Dijkstra"]),
              ],
            },
          ],
        },
        {
          jahrgangsstufe: 11,
          faecher: [
            {
              fach: "mathematik",
              themen: [
                t("Differentialrechnung", ["Ableitungsregeln", "Produkt-/Kettenregel", "Tangentengleichung"]),
                t("Kurvendiskussion", ["Extremstellen", "Wendepunkte", "Monotonie"]),
                t("Vektorrechnung im Raum", ["Ebenengleichungen", "Schnittmengen", "Abstand"]),
              ],
            },
            {
              fach: "deutsch",
              themen: [
                t("Literaturgeschichte 18./19. Jahrhundert", ["Aufklärung", "Sturm und Drang", "Romantik"]),
                t("Analyse literarischer Texte", ["Epik", "Lyrik", "Dramatik"]),
                t("Sprachkritik und Sprachwandel", ["Politische Sprache", "Mediensprache", "Anglizismen"]),
              ],
            },
            {
              fach: "englisch",
              themen: [
                t("Advanced writing skills", ["essay structure", "cohesion", "register"]),
                t("Debate language", ["conceding", "refuting", "hedging"]),
                t("American and British English", ["differences", "sociolects", "history"]),
              ],
            },
            {
              fach: "biologie",
              themen: [
                t("Biochemie Grundlagen", ["Enzyme", "Stoffwechsel", "ATP"]),
                t("Neurobiologie vertieft", ["Aktionspotenzial", "synaptische Übertragung", "Lernvorgänge"]),
                t("Ökologie und Klimawandel", ["Treibhauseffekt", "Biodiversität", "Schutzmaßnahmen"]),
              ],
            },
            {
              fach: "physik",
              themen: [
                t("Mechanik vertieft", ["Impuls und Impulserhaltung", "Rotation", "Trägheitsmoment"]),
                t("Elektrodynamik vertieft", ["Wechselstrom", "Kondensator", "Spule"]),
                t("Optik vertieft", ["Wellenoptik", "Beugung", "Interferenz"]),
              ],
            },
            {
              fach: "chemie",
              themen: [
                t("Organische Chemie vertieft", ["Alkohole", "Carbonsäuren", "Ester"]),
                t("Naturstoffe", ["Kohlenhydrate", "Proteine", "Fette", "Nucleinsäuren"]),
                t("Technische Chemie", ["Haber-Bosch", "Kontaktverfahren", "Industrieprozesse"]),
              ],
            },
            {
              fach: "geschichte",
              themen: [
                t("Kalter Krieg", ["Blockbildung", "Kubakrise", "Wettrüsten"]),
                t("BRD und DDR", ["Gründung", "Wirtschaftswunder", "Teilung"]),
                t("Dekolonialisierung", ["Unabhängigkeitsbewegungen", "Dritte Welt", "Neokolonialismus"]),
              ],
            },
            {
              fach: "informatik",
              themen: [
                t("Künstliche Intelligenz Grundlagen", ["Neuronale Netze", "Machine Learning", "Algorithmen"]),
                t("Maschinelles Lernen", ["überwacht/unüberwacht", "Klassifikation", "Regression"]),
                t("Parallelprogrammierung", ["Threads", "Synchronisation", "Deadlocks"]),
              ],
            },
          ],
        },
        {
          jahrgangsstufe: 12,
          faecher: [
            {
              fach: "mathematik",
              themen: [
                t("Integralrechnung", ["Stammfunktion", "bestimmtes Integral", "Flächen"]),
                t("Stochastik Abiturniveau", ["Normalverteilung", "Hypothesentest", "Konfidenzintervall"]),
                t("Analytische Geometrie", ["Geraden/Ebenen", "Lagebeziehungen", "Schnittwinkel"]),
              ],
            },
            {
              fach: "deutsch",
              themen: [
                t("Literatur des 20. Jahrhunderts", ["Expressionismus", "Exilliteratur", "Nachkriegsliteratur"]),
                t("Komplexe Erörterung", ["dialektisch/linear", "Abwägung", "Fazit"]),
                t("Literaturtheorien", ["Strukturalismus", "Rezeptionsästhetik", "Dekonstruktion"]),
              ],
            },
            {
              fach: "englisch",
              themen: [
                t("C1 Grammar", ["subjunctive", "advanced conditionals", "complex nominal phrases"]),
                t("Global topics vocabulary", ["globalisation", "migration", "digital society"]),
                t("Mediation skills", ["text summary", "cultural mediation", "paraphrasing"]),
              ],
            },
            {
              fach: "biologie",
              themen: [
                t("Molekularbiologie", ["PCR", "Gentechnik", "CRISPR"]),
                t("Populationsbiologie", ["Wachstumsmodelle", "Populationsdynamik"]),
                t("Bioethik", ["Gentechnik", "Stammzellen", "Klonen"]),
              ],
            },
            {
              fach: "physik",
              themen: [
                t("Quantenphysik", ["Photoeffekt", "Welle-Teilchen-Dualismus", "Unschärferelation"]),
                t("Spezielle Relativitätstheorie", ["Zeitdilatation", "Längenkontraktion", "E=mc²"]),
                t("Kernphysik", ["Kernspaltung", "Kernfusion", "Radioaktivität"]),
              ],
            },
            {
              fach: "chemie",
              themen: [
                t("Komplexchemie", ["Komplexverbindungen", "Liganden", "HSAB-Konzept"]),
                t("Biochemie Grundlagen", ["Enzymkinetik", "Stoffwechselwege", "Biokatalyse"]),
                t("Polymerchemie", ["Additons-/Kondensationspolymerisation", "Eigenschaften", "Biopolymere"]),
              ],
            },
            {
              fach: "informatik",
              themen: [
                t("Theoretische Informatik", ["Turing-Maschine", "Entscheidbarkeit", "Halteproblem"]),
                t("Compiler und formale Grammatiken", ["Chomsky-Hierarchie", "Parser", "Lexer"]),
                t("Verteilte Systeme", ["CAP-Theorem", "Konsistenz", "Microservices"]),
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
