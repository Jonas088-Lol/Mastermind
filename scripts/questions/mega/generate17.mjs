/* Copyright 2026 Elian Schock, Jonas Schwenk */
/**
 * MEGA-Fragen-Generator RUNDE 17 für MasterMind.
 *
 * Ergänzt die Fragenbank im GLEICHEN Format
 *   scripts/questions/mega/data/<fach>-klasse<k>.json
 * mit [{ topic, question, options[4], correct(Index), explanation }].
 *
 * Fächer/Umfang (nur NEUE Dateien mit Präfix philosophie-/psychologie-/
 * erdkunde3-/physik4-):
 *   1) philosophie  Klasse 11–13, >= 400/Klasse
 *      (Philosophen↔Werke↔Kernthesen: Faktenbank >= 60 Einträge,
 *       Erkenntnistheorie-Begriffe, logische Fehlschlüsse mit Beispielen,
 *       Ethik-Positionen zuordnen)
 *   2) psychologie  Klasse 11–13, >= 350/Klasse
 *      (Lerntheorien mit eindeutigen Szenarien, Piaget-Stadien,
 *       Wahrnehmung/Gedächtnis-Begriffe, berühmte Experimente↔Forscher)
 *   3) erdkunde3    Klasse 5–8, >= 400/Klasse
 *      (Welt-Hauptstädte Asien/Afrika/Amerika >= 80 Paare, längste Flüsse/
 *       höchste Berge im Vergleich, Zeitzonen-Rechnungen berechnet,
 *       Kontinente-Rekorde)
 *   4) physik4     Klasse 7–10, >= 400/Klasse
 *      (U = R·I inkl. Reihen-/Parallelschaltung berechnet, Arbeit W = F·s,
 *       Leistung P = W/t, Wirkungsgrad, km/h↔m/s — alles berechnet)
 *
 * Deterministisch (mulberry32-Seed). Keine Abhängigkeiten, reines Node.
 *
 * Aufruf (vom Repo-Root):
 *   node scripts/questions/mega/generate17.mjs
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), "data");

/* ────────────────────────── PRNG & Helfer ────────────────────────── */

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeRng(seed) {
  const next = mulberry32(seed);
  return {
    next,
    int(min, max) { return min + Math.floor(next() * (max - min + 1)); },
    pick(arr) { return arr[Math.floor(next() * arr.length)]; },
    shuffle(arr) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },
  };
}

function mc(rng, topic, question, correct, distractors, explanation) {
  const correctStr = String(correct);
  const opts = [];
  const seen = new Set([correctStr]);
  for (const d of distractors) {
    const s = String(d);
    if (!seen.has(s)) { seen.add(s); opts.push(s); }
    if (opts.length === 3) break;
  }
  if (opts.length < 3) return null;
  const all = rng.shuffle([correctStr, ...opts]);
  return { topic, question, options: all, correct: all.indexOf(correctStr), explanation };
}

/** n eindeutige Distraktoren aus einem Pool (ohne die Lösung). */
function pickN(rng, pool, exclude, n) {
  const out = [];
  const seen = new Set([String(exclude)]);
  for (const x of rng.shuffle(pool)) {
    const s = String(x);
    if (!seen.has(s)) { seen.add(s); out.push(s); }
    if (out.length === n) break;
  }
  return out;
}

/** Zahlen-Distraktoren in der Nähe (nie negativ, nie gleich der Lösung). */
function nearNum(rng, correct, steps, fmt = (x) => String(x)) {
  const set = new Set([fmt(correct)]);
  const out = [];
  let guard = 0;
  while (out.length < 3 && guard < 300) {
    guard++;
    const delta = rng.pick(steps) * (rng.next() < 0.5 ? -1 : 1);
    const cand = Math.round((correct + delta) * 100) / 100;
    if (cand <= 0) continue;
    const s = fmt(cand);
    if (set.has(s)) continue;
    set.add(s);
    out.push(s);
  }
  let up = correct;
  while (out.length < 3) {
    up += Math.abs(steps[0]) || 1;
    const s = fmt(Math.round(up * 100) / 100);
    if (!set.has(s)) { set.add(s); out.push(s); }
  }
  return out;
}

const de = (n) => String(Math.round(n * 100) / 100).replace(".", ",");

function generateBank(seed, count, generators) {
  const rng = makeRng(seed);
  const out = [];
  const texts = new Set();
  let attempts = 0;
  const maxAttempts = count * 600;
  while (out.length < count && attempts < maxAttempts) {
    attempts++;
    const gen = rng.pick(generators);
    let q;
    try { q = gen(rng); } catch { continue; }
    if (!q || texts.has(q.question)) continue;
    if (new Set(q.options).size !== 4) continue;
    texts.add(q.question);
    out.push(q);
  }
  return out;
}

const LEADS = ["", "Wähle die richtige Antwort. ", "Aufgabe: ", "Teste dein Wissen: ", "Quizfrage: ", "Überlege genau: "];

/* ══════════════════ 1) PHILOSOPHIE Klasse 11–13 ══════════════════ */

// [Philosoph, Werk, Kernthese, Epoche/Strömung]
const PHILOSOPHEN = [
  ["Platon", "Politeia (Der Staat)", "Die sinnliche Welt ist nur ein Abbild der ewigen Ideen (Ideenlehre, Höhlengleichnis).", "Antike"],
  ["Aristoteles", "Nikomachische Ethik", "Das höchste Gut ist die Eudaimonie; Tugend ist die Mitte zwischen zwei Extremen (Mesotes).", "Antike"],
  ["Sokrates", "keine eigenen Schriften (überliefert durch Platon)", "„Ich weiß, dass ich nichts weiß“ – Wahrheitssuche im prüfenden Dialog (Mäeutik).", "Antike"],
  ["Epikur", "Brief an Menoikeus", "Ziel des Lebens ist die Lust als Schmerzfreiheit und Seelenruhe (Ataraxie).", "Antike"],
  ["Seneca", "Briefe an Lucilius", "Gelassenheit durch Vernunft: Nur was in unserer Macht steht, soll uns bewegen (Stoa).", "Antike"],
  ["Marc Aurel", "Selbstbetrachtungen", "Der Mensch soll im Einklang mit der vernünftigen Weltordnung leben (Stoa).", "Antike"],
  ["Diogenes von Sinope", "keine erhaltenen Schriften", "Bedürfnislosigkeit macht frei – radikale Kritik an Konventionen (Kynismus).", "Antike"],
  ["Heraklit", "Über die Natur (Fragmente)", "Alles fließt (panta rhei) – die Welt ist ständiger Wandel im Streit der Gegensätze.", "Antike"],
  ["Parmenides", "Über die Natur (Lehrgedicht)", "Nur das unveränderliche Sein ist; Werden und Vielheit sind Schein.", "Antike"],
  ["Pythagoras", "keine erhaltenen Schriften", "Die Zahl ist das Prinzip aller Dinge; die Welt ist mathematisch geordnet.", "Antike"],
  ["Augustinus", "Confessiones (Bekenntnisse)", "Der Mensch findet Wahrheit und Ruhe nur in der Hinwendung zu Gott; Zeit ist Ausdehnung der Seele.", "Spätantike/Mittelalter"],
  ["Thomas von Aquin", "Summa theologica", "Glaube und Vernunft widersprechen sich nicht; fünf Wege führen zum Gottesbeweis.", "Mittelalter"],
  ["Anselm von Canterbury", "Proslogion", "Gott ist das, worüber hinaus nichts Größeres gedacht werden kann (ontologischer Gottesbeweis).", "Mittelalter"],
  ["Wilhelm von Ockham", "Summa logicae", "Erklärungen sollen ohne unnötige Annahmen auskommen (Ockhams Rasiermesser).", "Mittelalter"],
  ["Niccolò Machiavelli", "Der Fürst (Il Principe)", "Machterhalt rechtfertigt notfalls moralisch fragwürdige Mittel des Herrschers.", "Renaissance"],
  ["Thomas Morus", "Utopia", "Entwurf einer idealen Gesellschaft ohne Privateigentum als Kritik am realen Staat.", "Renaissance"],
  ["Michel de Montaigne", "Essais", "Skeptische Selbstprüfung: „Que sais-je?“ – Was weiß ich schon?", "Renaissance"],
  ["Francis Bacon", "Novum Organum", "Wissen ist Macht – Erkenntnis entsteht durch methodische Beobachtung und Induktion.", "Frühe Neuzeit"],
  ["René Descartes", "Meditationen über die Erste Philosophie", "„Cogito ergo sum“ – im methodischen Zweifel bleibt das denkende Ich gewiss (Dualismus).", "Rationalismus"],
  ["Baruch de Spinoza", "Ethik (Ethica)", "Gott und Natur sind eins (Deus sive natura); alles folgt notwendig aus der einen Substanz.", "Rationalismus"],
  ["Gottfried Wilhelm Leibniz", "Monadologie", "Die Welt besteht aus Monaden und ist die beste aller möglichen Welten.", "Rationalismus"],
  ["Blaise Pascal", "Pensées (Gedanken)", "Der Mensch ist ein „denkendes Schilfrohr“ – Größe und Elend zugleich; Wette auf Gott.", "Frühe Neuzeit"],
  ["Thomas Hobbes", "Leviathan", "Im Naturzustand herrscht der Krieg aller gegen alle; nur ein starker Staat sichert Frieden.", "Vertragstheorie"],
  ["John Locke", "Zwei Abhandlungen über die Regierung", "Der Mensch hat natürliche Rechte auf Leben, Freiheit und Eigentum; Herrschaft braucht Zustimmung.", "Empirismus/Liberalismus"],
  ["John Locke ", "Versuch über den menschlichen Verstand", "Der Geist ist bei Geburt ein unbeschriebenes Blatt (tabula rasa); alle Ideen stammen aus Erfahrung.", "Empirismus"],
  ["George Berkeley", "Prinzipien der menschlichen Erkenntnis", "Sein ist Wahrgenommenwerden (esse est percipi) – es gibt nur Geister und Ideen.", "Empirismus/Idealismus"],
  ["David Hume", "Eine Untersuchung über den menschlichen Verstand", "Kausalität ist keine beobachtbare Notwendigkeit, sondern Gewohnheit unseres Denkens.", "Empirismus/Skeptizismus"],
  ["Jean-Jacques Rousseau", "Vom Gesellschaftsvertrag (Du contrat social)", "Der Mensch ist von Natur aus gut; legitime Herrschaft gründet im Gemeinwillen (volonté générale).", "Aufklärung"],
  ["Montesquieu", "Vom Geist der Gesetze", "Freiheit braucht Gewaltenteilung in Legislative, Exekutive und Judikative.", "Aufklärung"],
  ["Voltaire", "Candide oder der Optimismus", "Spott über den Leibniz'schen Optimismus; Plädoyer für Toleranz und Vernunft.", "Aufklärung"],
  ["Immanuel Kant", "Kritik der reinen Vernunft", "Erkenntnis richtet sich nicht nach den Gegenständen, sondern die Gegenstände nach unserer Erkenntnis (kopernikanische Wende).", "Deutscher Idealismus/Aufklärung"],
  ["Immanuel Kant ", "Grundlegung zur Metaphysik der Sitten", "Handle nur nach derjenigen Maxime, von der du wollen kannst, dass sie allgemeines Gesetz werde (kategorischer Imperativ).", "Aufklärung"],
  ["Georg Wilhelm Friedrich Hegel", "Phänomenologie des Geistes", "Die Geschichte ist die dialektische Selbstentfaltung des Geistes zur Freiheit.", "Deutscher Idealismus"],
  ["Johann Gottlieb Fichte", "Wissenschaftslehre", "Das Ich setzt sich selbst und bringt das Nicht-Ich hervor – radikale Philosophie der Freiheit.", "Deutscher Idealismus"],
  ["Friedrich Wilhelm Joseph Schelling", "System des transzendentalen Idealismus", "Natur und Geist sind zwei Seiten desselben Absoluten (Identitätsphilosophie).", "Deutscher Idealismus"],
  ["Arthur Schopenhauer", "Die Welt als Wille und Vorstellung", "Hinter der Welt der Erscheinungen steht ein blinder Wille; das Leben ist Leiden.", "19. Jahrhundert"],
  ["Ludwig Feuerbach", "Das Wesen des Christentums", "Nicht Gott schuf den Menschen, sondern der Mensch schuf Gott nach seinem Bild (Projektionsthese).", "19. Jahrhundert"],
  ["Karl Marx", "Das Kapital", "Das Sein bestimmt das Bewusstsein; die Geschichte ist eine Geschichte von Klassenkämpfen.", "19. Jahrhundert/Materialismus"],
  ["John Stuart Mill", "Utilitarianism (Der Utilitarismus)", "Richtig ist, was das größte Glück der größten Zahl befördert – Qualität der Freuden zählt.", "Utilitarismus"],
  ["Jeremy Bentham", "Einführung in die Prinzipien der Moral und Gesetzgebung", "Der Nutzen einer Handlung bemisst sich am erzeugten Glück – quantitativ berechenbar (hedonistisches Kalkül).", "Utilitarismus"],
  ["Friedrich Nietzsche", "Also sprach Zarathustra", "„Gott ist tot“ – der Mensch soll alle Werte umwerten und zum Übermenschen werden.", "19. Jahrhundert"],
  ["Sören Kierkegaard", "Entweder – Oder", "Existenz heißt wählen: Der Einzelne muss sich in Angst und Freiheit selbst entscheiden.", "Existenzphilosophie"],
  ["Edmund Husserl", "Ideen zu einer reinen Phänomenologie", "Zurück zu den Sachen selbst – Beschreibung der Phänomene, wie sie dem Bewusstsein erscheinen.", "Phänomenologie"],
  ["Martin Heidegger", "Sein und Zeit", "Der Mensch ist ein „Sein zum Tode“ – nur wer seine Endlichkeit annimmt, existiert eigentlich.", "Existenzphilosophie/Phänomenologie"],
  ["Jean-Paul Sartre", "Das Sein und das Nichts", "Die Existenz geht der Essenz voraus – der Mensch ist zur Freiheit verurteilt.", "Existenzialismus"],
  ["Simone de Beauvoir", "Das andere Geschlecht", "Man kommt nicht als Frau zur Welt, man wird es – Geschlechterrollen sind gesellschaftlich gemacht.", "Existenzialismus/Feminismus"],
  ["Albert Camus", "Der Mythos des Sisyphos", "Das Leben ist absurd – doch man muss sich Sisyphos als glücklichen Menschen vorstellen (Revolte).", "Existenzialismus/Absurdismus"],
  ["Ludwig Wittgenstein", "Tractatus logico-philosophicus", "Die Grenzen meiner Sprache bedeuten die Grenzen meiner Welt; worüber man nicht sprechen kann, darüber muss man schweigen.", "Analytische Philosophie"],
  ["Ludwig Wittgenstein ", "Philosophische Untersuchungen", "Die Bedeutung eines Wortes ist sein Gebrauch in der Sprache (Sprachspiele).", "Analytische Philosophie"],
  ["Karl Popper", "Logik der Forschung", "Wissenschaftliche Theorien lassen sich nie endgültig verifizieren, nur falsifizieren.", "Kritischer Rationalismus"],
  ["Theodor W. Adorno", "Dialektik der Aufklärung (mit Horkheimer)", "Aufklärung kann in Herrschaft und Barbarei umschlagen; Kritik an der Kulturindustrie.", "Kritische Theorie"],
  ["Max Horkheimer", "Kritik der instrumentellen Vernunft", "Vernunft verkommt zum bloßen Werkzeug der Zwecke – kritische Theorie der Gesellschaft.", "Kritische Theorie"],
  ["Hannah Arendt", "Eichmann in Jerusalem", "These von der „Banalität des Bösen“: Gedankenlosigkeit ermöglicht monströse Verbrechen.", "20. Jahrhundert"],
  ["Hannah Arendt ", "Vita activa oder Vom tätigen Leben", "Handeln in der Öffentlichkeit ist die höchste Form menschlicher Tätigkeit.", "20. Jahrhundert"],
  ["Jürgen Habermas", "Theorie des kommunikativen Handelns", "Im herrschaftsfreien Diskurs zählt nur der zwanglose Zwang des besseren Arguments.", "Kritische Theorie/Diskursethik"],
  ["John Rawls", "Eine Theorie der Gerechtigkeit", "Gerechte Regeln wählt man hinter einem „Schleier des Nichtwissens“ (Urzustand).", "Politische Philosophie"],
  ["Hans Jonas", "Das Prinzip Verantwortung", "Handle so, dass die Wirkungen deiner Handlung verträglich sind mit dem dauerhaften Bestand echten menschlichen Lebens.", "Ethik der Technik/Ökologie"],
  ["Michel Foucault", "Überwachen und Strafen", "Macht wirkt nicht nur durch Verbote, sondern durch Disziplinierung und Normierung der Körper.", "Poststrukturalismus"],
  ["Ernst Bloch", "Das Prinzip Hoffnung", "Der Mensch ist ein utopisches Wesen – Hoffnung auf das Noch-Nicht treibt die Geschichte an.", "20. Jahrhundert"],
  ["Peter Singer", "Praktische Ethik", "Interessen aller empfindungsfähigen Wesen zählen gleich – auch die der Tiere (Präferenzutilitarismus).", "Gegenwart/Utilitarismus"],
  ["Judith Butler", "Das Unbehagen der Geschlechter (Gender Trouble)", "Geschlecht ist performativ – es wird durch wiederholte Handlungen erzeugt.", "Gegenwart"],
  ["Thomas Nagel", "What is it like to be a bat? (Wie ist es, eine Fledermaus zu sein?)", "Subjektives Erleben lässt sich nicht vollständig objektiv-naturwissenschaftlich beschreiben.", "Analytische Philosophie"],
];

// [Begriff, Definition]
const ERKENNTNIS_BEGRIFFE = [
  ["Empirismus", "die Auffassung, dass alle Erkenntnis aus der Sinneserfahrung stammt"],
  ["Rationalismus", "die Auffassung, dass Erkenntnis vor allem aus der Vernunft und angeborenen Ideen stammt"],
  ["Skeptizismus", "die Position, die die Möglichkeit sicherer Erkenntnis grundsätzlich bezweifelt"],
  ["a priori", "Erkenntnis, die unabhängig von aller Erfahrung gültig ist"],
  ["a posteriori", "Erkenntnis, die auf Erfahrung beruht"],
  ["Induktion", "der Schluss von einzelnen Beobachtungen auf eine allgemeine Regel"],
  ["Deduktion", "der logisch zwingende Schluss vom Allgemeinen auf das Besondere"],
  ["Solipsismus", "die Position, dass nur das eigene Ich sicher existiert"],
  ["Idealismus", "die Auffassung, dass die Wirklichkeit wesentlich geistig bzw. durch das Bewusstsein bestimmt ist"],
  ["Materialismus", "die Auffassung, dass alles Wirkliche letztlich Materie ist"],
  ["Dualismus", "die Lehre, dass Geist und Körper zwei verschiedene Substanzen sind"],
  ["Transzendentalphilosophie", "die Untersuchung der Bedingungen der Möglichkeit von Erkenntnis (Kant)"],
  ["Ding an sich", "bei Kant: die Wirklichkeit unabhängig von unserer Erkenntnis, die uns nicht zugänglich ist"],
  ["Phänomen", "die Erscheinung, wie sich ein Gegenstand unserem Bewusstsein zeigt"],
  ["Kategorien (bei Kant)", "reine Verstandesbegriffe wie Kausalität, die unsere Erfahrung strukturieren"],
  ["Korrespondenztheorie der Wahrheit", "wahr ist eine Aussage, wenn sie mit der Wirklichkeit übereinstimmt"],
  ["Kohärenztheorie der Wahrheit", "wahr ist eine Aussage, wenn sie widerspruchsfrei zu einem System anderer Aussagen passt"],
  ["Konsenstheorie der Wahrheit", "wahr ist, worauf sich alle in einem idealen Diskurs vernünftig einigen könnten"],
  ["Falsifikation", "die Widerlegung einer Theorie durch ein Gegenbeispiel (Popper)"],
  ["Verifikation", "der (nach Popper unmögliche endgültige) Nachweis der Wahrheit einer Allaussage"],
  ["Paradigma (Kuhn)", "das in einer Epoche herrschende Grundmuster wissenschaftlichen Denkens"],
  ["tabula rasa", "das Bild vom Geist als unbeschriebenem Blatt vor aller Erfahrung (Locke)"],
  ["Mäeutik", "die sokratische „Hebammenkunst“: Erkenntnis durch geschicktes Fragen hervorbringen"],
  ["Ideenlehre", "Platons Lehre, dass die ewigen Ideen die eigentliche Wirklichkeit hinter den Sinnendingen sind"],
  ["Konstruktivismus", "die Auffassung, dass Wirklichkeit vom erkennenden Subjekt aktiv konstruiert wird"],
  ["Evidenz", "die unmittelbare Einsichtigkeit einer Erkenntnis"],
  ["Apriorismus", "die Annahme, dass es erfahrungsunabhängige Erkenntnisquellen gibt"],
  ["Agnostizismus", "die Position, dass sich die Existenz Gottes weder beweisen noch widerlegen lässt"],
];

// [Name des Fehlschlusses, Beispiel, Erklärung]
const FEHLSCHLUESSE = [
  ["Argumentum ad hominem", "„Deine Kritik am Gesetz ist wertlos – du hast ja nicht einmal studiert.“", "Statt des Arguments wird die Person angegriffen – das Argument selbst bleibt unwiderlegt."],
  ["Argumentum ad hominem", "„Auf Herrn Meier muss man nicht hören, der ist doch sowieso immer schlecht gelaunt.“", "Die Eigenschaften der Person sagen nichts über die Wahrheit ihrer Aussage."],
  ["Strohmann-Argument", "A: „Wir sollten weniger Fleisch essen.“ B: „Du willst also, dass alle Bauern arbeitslos werden!“", "Die Position des Gegners wird verzerrt wiedergegeben und dann die Verzerrung angegriffen."],
  ["Strohmann-Argument", "A: „Die Hausaufgaben könnten kürzer sein.“ B: „Aha, du willst also gar nichts mehr lernen!“", "Es wird eine übertriebene Version der Aussage bekämpft, nicht die Aussage selbst."],
  ["Falsches Dilemma", "„Entweder du bist für totale Videoüberwachung, oder dir ist Sicherheit egal.“", "Es werden nur zwei Alternativen präsentiert, obwohl es viele Zwischenpositionen gibt."],
  ["Falsches Dilemma", "„Wer nicht jeden Tag trainiert, dem ist Gesundheit völlig gleichgültig.“", "Zwischen den beiden Extremen liegen zahlreiche weitere Möglichkeiten."],
  ["Dammbruch-Argument (slippery slope)", "„Wenn wir eine Ausnahme bei der Abgabefrist machen, gibt bald niemand mehr irgendetwas pünktlich ab.“", "Aus einem ersten Schritt wird ohne Beleg eine unaufhaltsame Kette immer schlimmerer Folgen konstruiert."],
  ["Dammbruch-Argument (slippery slope)", "„Erlauben wir E-Scooter in der Fußgängerzone, fahren dort bald auch Autos.“", "Die behauptete Eskalationskette ist nicht begründet – ein klassischer Dammbruch-Fehlschluss."],
  ["Autoritätsargument (argumentum ad verecundiam)", "„Das Medikament wirkt sicher – ein berühmter Schauspieler empfiehlt es.“", "Die Autorität ist auf dem fraglichen Gebiet gar nicht kompetent; Prominenz ersetzt keinen Beleg."],
  ["Autoritätsargument (argumentum ad verecundiam)", "„Es muss stimmen, mein Trainer hat es gesagt.“", "Eine Aussage wird nur wegen der Autorität der Quelle akzeptiert, nicht wegen ihrer Begründung."],
  ["Zirkelschluss (petitio principii)", "„Die Zeitung schreibt die Wahrheit, denn das steht so in der Zeitung.“", "Die Behauptung wird mit sich selbst begründet – die Schlussfolgerung steckt schon in der Prämisse."],
  ["Zirkelschluss (petitio principii)", "„Er ist vertrauenswürdig, weil man ihm vertrauen kann.“", "Begründung und Behauptung sagen dasselbe – es wird nichts bewiesen."],
  ["Post hoc ergo propter hoc", "„Seit die neue Bürgermeisterin im Amt ist, regnet es mehr – sie ist schuld am Wetter.“", "Aus zeitlicher Abfolge wird fälschlich eine Ursache-Wirkungs-Beziehung gemacht."],
  ["Post hoc ergo propter hoc", "„Ich habe meine Glückssocken getragen und wir haben gewonnen – die Socken haben das Spiel entschieden.“", "Zeitliches Aufeinanderfolgen beweist keine Verursachung."],
  ["Argumentum ad populum", "„Millionen Menschen nutzen diese App – also muss sie sicher sein.“", "Die Beliebtheit einer Ansicht ist kein Beleg für ihre Wahrheit."],
  ["Argumentum ad populum", "„Das glauben doch alle, also stimmt es.“", "Mehrheitsmeinung ersetzt keine Begründung – auch Mehrheiten können irren."],
  ["Tu quoque (Du-auch-Fehlschluss)", "„Du sagst, Rauchen sei ungesund? Du hast doch früher selbst geraucht!“", "Ein möglicher Widerspruch im Verhalten der Person widerlegt nicht ihre Aussage."],
  ["Naturalistischer Fehlschluss", "„Aggression kommt in der Natur vor, also ist aggressives Verhalten moralisch in Ordnung.“", "Vom Sein wird unzulässig auf das Sollen geschlossen – aus Fakten folgen keine Normen."],
  ["Naturalistischer Fehlschluss", "„Menschen haben schon immer Kriege geführt, also ist Krieg moralisch akzeptabel.“", "Dass etwas so ist oder war, begründet nicht, dass es so sein soll (Humes Gesetz)."],
  ["Argumentum ad ignorantiam", "„Niemand hat bewiesen, dass es keine Geister gibt – also gibt es sie.“", "Fehlende Widerlegung ist kein Beweis für die Wahrheit einer Behauptung."],
  ["Argumentum ad ignorantiam", "„Es gibt keinen Beweis, dass der Nachbar unschuldig ist – also ist er schuldig.“", "Aus Unwissenheit lässt sich weder Wahrheit noch Falschheit ableiten."],
  ["Falsche Analogie", "„Ein Staat ist wie eine Familie – also braucht er einen strengen Vater als Alleinherrscher.“", "Die verglichenen Dinge unterscheiden sich in genau den entscheidenden Punkten."],
  ["Ablenkungsmanöver (red herring)", "„Zur Kritik an meinen Ausgaben sage ich nur: Denken Sie an die Erfolge unserer Fußballmannschaft!“", "Vom eigentlichen Thema wird gezielt auf ein anderes, irrelevantes Thema abgelenkt."],
  ["Verallgemeinerung aus Einzelfällen (hasty generalization)", "„Mein Opa hat geraucht und wurde 95 – Rauchen ist also harmlos.“", "Aus einem einzelnen Fall wird unzulässig auf eine allgemeine Regel geschlossen."],
  ["Verallgemeinerung aus Einzelfällen (hasty generalization)", "„Zwei unfreundliche Verkäufer in dieser Stadt – hier sind alle Menschen unhöflich.“", "Eine winzige Stichprobe trägt keine Aussage über alle Fälle."],
];

// [Position, Kurzbeschreibung, typischer Vertreter, Beispielurteil]
const ETHIK_POSITIONEN = [
  ["Utilitarismus", "Eine Handlung ist richtig, wenn sie den Gesamtnutzen bzw. das Glück aller Betroffenen maximiert.", "Jeremy Bentham / John Stuart Mill", "„Die Notlüge ist erlaubt, weil sie insgesamt mehr Leid verhindert als anrichtet.“"],
  ["Deontologische Ethik (Pflichtethik)", "Eine Handlung ist richtig, wenn sie aus Pflicht einer verallgemeinerbaren Maxime folgt – unabhängig von den Folgen.", "Immanuel Kant", "„Lügen ist immer falsch, denn Lügen kann kein allgemeines Gesetz sein – egal welche Folgen drohen.“"],
  ["Tugendethik", "Im Zentrum steht der gute Charakter: Richtig handelt, wer tugendhaft ist und das rechte Maß findet.", "Aristoteles", "„Entscheidend ist, ob die Handlung Ausdruck von Mut, Mäßigung und Klugheit ist.“"],
  ["Verantwortungsethik", "Der Handelnde muss die absehbaren Folgen seines Tuns verantworten und in die Entscheidung einbeziehen.", "Max Weber / Hans Jonas", "„Ein Politiker darf nicht nur nach reiner Gesinnung handeln, er muss die realen Folgen bedenken.“"],
  ["Gesinnungsethik", "Entscheidend ist die gute Absicht bzw. Überzeugung – nicht die tatsächlichen Folgen der Handlung.", "Max Weber (als Gegenbegriff geprägt)", "„Hauptsache, ich habe nach meinem Gewissen gehandelt – was daraus folgt, liegt nicht in meiner Hand.“"],
  ["Diskursethik", "Normen sind gültig, wenn ihnen alle Betroffenen in einem herrschaftsfreien Diskurs zustimmen könnten.", "Jürgen Habermas / Karl-Otto Apel", "„Ob die Regel gerecht ist, entscheidet der zwanglose Dialog aller Betroffenen.“"],
  ["Vertragstheorie (Kontraktualismus)", "Moralische und politische Regeln beruhen auf einem (gedachten) Vertrag freier, vernünftiger Personen.", "Thomas Hobbes / John Rawls", "„Gerecht ist, was rationale Personen hinter dem Schleier des Nichtwissens vereinbaren würden.“"],
  ["Hedonismus", "Lust bzw. Freude ist das höchste Gut und Maßstab des guten Lebens.", "Epikur (maßvoll verstanden)", "„Gut ist, was Lust mehrt und Schmerz vermeidet.“"],
  ["Ethischer Egoismus", "Jeder soll so handeln, dass es seinem eigenen wohlverstandenen Interesse am besten dient.", "in Anlehnung an Max Stirner", "„Richtig ist die Handlung, die mir selbst langfristig am meisten nützt.“"],
  ["Mitleidsethik", "Grundlage der Moral ist das Mitleid mit anderen leidensfähigen Wesen.", "Arthur Schopenhauer", "„Nur die Handlung, die aus echtem Mitgefühl geschieht, hat moralischen Wert.“"],
  ["Präferenzutilitarismus", "Zu berücksichtigen sind die Interessen (Präferenzen) aller betroffenen empfindungsfähigen Wesen.", "Peter Singer", "„Auch die Interessen von Tieren zählen, weil sie leiden können.“"],
  ["Naturrechtsethik", "Es gibt eine vorstaatliche, in der Natur bzw. Vernunft gründende Ordnung von Rechten und Pflichten.", "Thomas von Aquin / John Locke", "„Bestimmte Rechte hat der Mensch von Natur aus – kein Gesetz darf sie aufheben.“"],
];

function philosophieGenerators(klasse) {
  const namen = PHILOSOPHEN.map((p) => p[0].trim());
  const werke = PHILOSOPHEN.map((p) => p[1]);
  const begriffe = ERKENNTNIS_BEGRIFFE.map((b) => b[0]);
  const defs = ERKENNTNIS_BEGRIFFE.map((b) => b[1]);
  const fnamen = [...new Set(FEHLSCHLUESSE.map((f) => f[0]))];
  const positionen = ETHIK_POSITIONEN.map((p) => p[0]);
  const gens = [];

  // Philosoph -> Werk
  gens.push((r) => {
    const [name, werk, , epoche] = r.pick(PHILOSOPHEN);
    if (werk.startsWith("keine")) return null;
    return mc(r, "Philosophen & Werke",
      `${r.pick(LEADS)}Welches Werk stammt von ${name.trim()} (${epoche})?`,
      werk, pickN(r, werke.filter((w) => !w.startsWith("keine")), werk, 3),
      `${name.trim()} verfasste „${werk}“.`);
  });
  // Werk -> Philosoph
  gens.push((r) => {
    const [name, werk] = r.pick(PHILOSOPHEN);
    if (werk.startsWith("keine")) return null;
    return mc(r, "Philosophen & Werke",
      `${r.pick(LEADS)}Von wem stammt das Werk „${werk}“?`,
      name.trim(), pickN(r, namen, name.trim(), 3),
      `„${werk}“ stammt von ${name.trim()}.`);
  });
  // Philosoph -> Kernthese
  gens.push((r) => {
    const [name, , these] = r.pick(PHILOSOPHEN);
    const other = PHILOSOPHEN.map((p) => p[2]);
    return mc(r, "Kernthesen",
      `${r.pick(LEADS)}Welche Kernthese wird ${name.trim()} zugeschrieben?`,
      these, pickN(r, other, these, 3),
      `Zentrale Position von ${name.trim()}: ${these}`);
  });
  // Kernthese -> Philosoph
  gens.push((r) => {
    const [name, , these] = r.pick(PHILOSOPHEN);
    return mc(r, "Kernthesen",
      `${r.pick(LEADS)}Wer vertrat die folgende Position? – ${these}`,
      name.trim(), pickN(r, namen, name.trim(), 3),
      `Diese These stammt von ${name.trim()}.`);
  });
  // Erkenntnistheorie: Begriff -> Definition
  gens.push((r) => {
    const [begriff, def] = r.pick(ERKENNTNIS_BEGRIFFE);
    return mc(r, "Erkenntnistheorie",
      `${r.pick(LEADS)}Was bedeutet der Begriff „${begriff}“ in der Erkenntnistheorie?`,
      def, pickN(r, defs, def, 3),
      `„${begriff}“ bezeichnet: ${def}.`);
  });
  // Definition -> Begriff
  gens.push((r) => {
    const [begriff, def] = r.pick(ERKENNTNIS_BEGRIFFE);
    return mc(r, "Erkenntnistheorie",
      `${r.pick(LEADS)}Welcher Fachbegriff bezeichnet: ${def}?`,
      begriff, pickN(r, begriffe, begriff, 3),
      `Gesucht war „${begriff}“: ${def}.`);
  });
  // Fehlschluss erkennen
  gens.push((r) => {
    const [fname, beispiel, erkl] = r.pick(FEHLSCHLUESSE);
    return mc(r, "Logische Fehlschlüsse",
      `${r.pick(LEADS)}Welcher logische Fehlschluss liegt hier vor? ${beispiel}`,
      fname, pickN(r, fnamen, fname, 3),
      `${erkl} Das ist der Fehlschluss „${fname}“.`);
  });
  // Ethik-Position: Beschreibung -> Position
  gens.push((r) => {
    const [pos, beschr, vertreter] = r.pick(ETHIK_POSITIONEN);
    return mc(r, "Ethik-Positionen",
      `${r.pick(LEADS)}Welche ethische Position wird hier beschrieben? „${beschr}“`,
      pos, pickN(r, positionen, pos, 3),
      `Das ist der ${pos} (klassisch vertreten von ${vertreter}).`);
  });
  // Ethik-Position: Urteil -> Position
  gens.push((r) => {
    const [pos, , vertreter, urteil] = r.pick(ETHIK_POSITIONEN);
    return mc(r, "Ethik-Positionen",
      `${r.pick(LEADS)}Aus welcher ethischen Position stammt am ehesten dieses Urteil? ${urteil}`,
      pos, pickN(r, positionen, pos, 3),
      `Diese Argumentation ist typisch für den ${pos} (${vertreter}).`);
  });
  // Ethik-Position -> Vertreter
  gens.push((r) => {
    const [pos, , vertreter] = r.pick(ETHIK_POSITIONEN);
    const alle = ETHIK_POSITIONEN.map((p) => p[2]);
    return mc(r, "Ethik-Positionen",
      `${r.pick(LEADS)}Wer gilt als klassischer Vertreter der Position „${pos}“?`,
      vertreter, pickN(r, alle, vertreter, 3),
      `${vertreter} steht klassisch für den ${pos}.`);
  });
  // Oberstufen-Vertiefung ab Kl. 12: Epoche zuordnen
  if (klasse >= 12) {
    gens.push((r) => {
      const [name, , , epoche] = r.pick(PHILOSOPHEN);
      const epochen = [...new Set(PHILOSOPHEN.map((p) => p[3]))];
      return mc(r, "Philosophiegeschichte",
        `${r.pick(LEADS)}Welcher Epoche bzw. Strömung wird ${name.trim()} zugeordnet?`,
        epoche, pickN(r, epochen, epoche, 3),
        `${name.trim()} zählt zur Strömung/Epoche: ${epoche}.`);
    });
  }
  return gens;
}

/* ══════════════════ 2) PSYCHOLOGIE Klasse 11–13 ══════════════════ */

const LERNTHEORIEN = ["klassische Konditionierung", "operante Konditionierung", "Modelllernen (Lernen am Modell)"];

// [Szenario, Theorie, Erklärung]
const LERN_SZENARIEN = [
  ["Ein Hund speichelt schon beim Klang der Futterdose, weil dieser Klang immer dem Füttern vorausging.", "klassische Konditionierung", "Ein neutraler Reiz (Klang) wird mit einem unbedingten Reiz (Futter) gekoppelt und löst nun selbst die Reaktion aus."],
  ["Eine Schülerin bekommt Herzklopfen, sobald sie das Klingeln vor einer Klassenarbeit hört – auch ohne Arbeit.", "klassische Konditionierung", "Das Klingeln wurde durch wiederholte Kopplung mit der Prüfungssituation zum bedingten Angstauslöser."],
  ["Nach einer Lebensmittelvergiftung mit Fischsuppe wird jemandem allein beim Geruch von Fisch übel.", "klassische Konditionierung", "Geruch (vorher neutral) wurde mit Übelkeit gekoppelt – eine klassisch konditionierte Geschmacksaversion."],
  ["Ein Kind fürchtet sich vor weißen Kaninchen, nachdem beim Anblick eines Kaninchens mehrfach ein lauter Knall ertönte.", "klassische Konditionierung", "Wie im Little-Albert-Experiment: Kopplung von neutralem Reiz (Kaninchen) und Angstauslöser (Knall)."],
  ["Beim Zahnarztgeruch im Wartezimmer steigt bei Herrn K. sofort die Anspannung.", "klassische Konditionierung", "Der Geruch wurde durch frühere schmerzhafte Behandlungen zum bedingten Reiz für Angst."],
  ["Ein Schüler räumt sein Zimmer häufiger auf, seit er dafür jedes Mal Taschengeld extra erhält.", "operante Konditionierung", "Positive Verstärkung: Auf das Verhalten folgt eine angenehme Konsequenz, die Auftretenshäufigkeit steigt."],
  ["Eine Ratte drückt immer öfter den Hebel, weil danach Futter in den Käfig fällt.", "operante Konditionierung", "Klassisches Skinner-Box-Beispiel: Verhalten wird durch seine Konsequenz (Futter = Verstärker) geformt."],
  ["Lena nimmt Kopfschmerztabletten immer früher, weil das unangenehme Pochen danach verschwindet.", "operante Konditionierung", "Negative Verstärkung: Das Verhalten wird häufiger, weil ein unangenehmer Zustand entfällt."],
  ["Tim prahlt im Unterricht nicht mehr, seit die Klasse ihn dafür konsequent ignoriert.", "operante Konditionierung", "Löschung/Extinktion: Bleibt die Verstärkung (Aufmerksamkeit) aus, nimmt das Verhalten ab."],
  ["Ein Autofahrer schnallt sich sofort an, damit das nervige Warnpiepsen aufhört.", "operante Konditionierung", "Negative Verstärkung: Anschnallen beendet den unangenehmen Ton und wird dadurch wahrscheinlicher."],
  ["Weil sie für Zuspätkommen Strafarbeiten schreiben musste, kommt Mia nun pünktlich.", "operante Konditionierung", "Bestrafung: Eine unangenehme Konsequenz senkt die Auftretenswahrscheinlichkeit des Verhaltens."],
  ["Der kleine Bruder imitiert genau die Torjubel-Pose, die er bei seinem Fußballidol im Fernsehen gesehen hat.", "Modelllernen (Lernen am Modell)", "Verhalten wird durch Beobachtung eines (attraktiven) Modells übernommen – ohne eigene Verstärkung nötig."],
  ["Nachdem Kinder im Film Erwachsene sahen, die eine Puppe schlugen, schlugen viele die Puppe ebenfalls.", "Modelllernen (Lernen am Modell)", "Banduras Bobo-Doll-Experiment: Beobachtetes aggressives Verhalten wird nachgeahmt."],
  ["Eine neue Auszubildende übernimmt den Begrüßungsstil ihrer beliebten Chefin.", "Modelllernen (Lernen am Modell)", "Beobachtungslernen: Ein als erfolgreich/sympathisch erlebtes Modell wird imitiert."],
  ["Ein Kind wäscht sich die Hände genau so umständlich wie sein großer Bruder – es hat nie eine Anleitung bekommen.", "Modelllernen (Lernen am Modell)", "Das Verhalten wurde allein durch Beobachtung des Modells erworben."],
  ["Schüler sehen, dass Mitschülerin Ayla fürs Melden gelobt wird, und melden sich daraufhin selbst öfter.", "Modelllernen (Lernen am Modell)", "Stellvertretende Verstärkung: Die beobachtete Belohnung des Modells erhöht die eigene Imitationsbereitschaft."],
  ["Ein Kater kommt angerannt, sobald der Dosenöffner surrt – das Geräusch kündigte bisher stets Futter an.", "klassische Konditionierung", "Das Surren ist zum bedingten Reiz für die Futtererwartung geworden."],
  ["Jonas übt täglich Gitarre, seit ihn seine Freunde nach jedem kleinen Auftritt begeistert feiern.", "operante Konditionierung", "Soziale Anerkennung wirkt als positiver Verstärker und erhöht die Übungsfrequenz."],
  ["Nach mehreren Fahrstuhl-Steckenbleiben bekommt Frau B. schon beim Anblick einer Fahrstuhltür Schweißausbrüche.", "klassische Konditionierung", "Die Fahrstuhltür wurde mit dem Angsterlebnis gekoppelt und löst die Reaktion nun allein aus."],
  ["Ein Lehrling schaut dem Meister beim Schweißen genau zu und führt die Handgriffe anschließend ebenso aus.", "Modelllernen (Lernen am Modell)", "Aufmerksamkeit, Behalten, Reproduktion, Motivation – die vier Prozesse des Modelllernens nach Bandura."],
  ["Ein Papagei bekommt nur dann einen Nusskern, wenn er auf die Stange fliegt – bald fliegt er ständig dorthin.", "operante Konditionierung", "Verhalten wird durch kontingente Belohnung (Verstärkerplan) aufgebaut."],
  ["Sturmangst: Schon das Geräusch von Wind lässt den Hund zittern, weil Stürme früher mit Donnerknallen einhergingen.", "klassische Konditionierung", "Wind (neutral) wurde mit dem Schreckreiz Donner gekoppelt."],
];

// [Stadium, Alter, Kennzeichen, Beispiel]
const PIAGET_STADIEN = [
  ["sensomotorisches Stadium", "0–2 Jahre", "Erkenntnis über Sinne und Bewegung; Aufbau der Objektpermanenz", "Ein Baby sucht ein verstecktes Spielzeug – es weiß nun, dass Dinge weiterexistieren, auch wenn man sie nicht sieht."],
  ["präoperationales Stadium", "2–7 Jahre", "symbolisches/anschauliches Denken, Egozentrismus, noch keine Mengeninvarianz", "Ein Kind meint, im hohen schmalen Glas sei „mehr“ Saft als im breiten – obwohl umgeschüttet wurde."],
  ["konkret-operationales Stadium", "7–11 Jahre", "logische Operationen an konkreten Inhalten; Invarianz und Reversibilität werden verstanden", "Das Kind versteht: Umschütten ändert die Saftmenge nicht – man könnte es ja zurückschütten."],
  ["formal-operationales Stadium", "ab ca. 11–12 Jahren", "abstraktes, hypothetisch-deduktives Denken; Denken über Mögliches und Ideen", "Ein Jugendlicher prüft systematisch Hypothesen: „Wenn X gilt, müsste Y folgen …“"],
];

// [Begriff, Definition]
const WAHRNEHMUNG_GEDAECHTNIS = [
  ["selektive Wahrnehmung", "die Tendenz, nur bestimmte, z. B. erwartungskonforme Reize zu beachten und andere auszublenden"],
  ["Wahrnehmungskonstanz", "Objekte werden trotz wechselnder Reizbedingungen (Entfernung, Licht) als gleichbleibend wahrgenommen"],
  ["Figur-Grund-Wahrnehmung", "die Gliederung des Wahrnehmungsfeldes in eine hervortretende Figur und einen Hintergrund"],
  ["Gestaltgesetz der Nähe", "nahe beieinanderliegende Elemente werden als zusammengehörig wahrgenommen"],
  ["Gestaltgesetz der Ähnlichkeit", "einander ähnliche Elemente werden als Gruppe wahrgenommen"],
  ["Kontrasteffekt", "ein Reiz wird je nach Umgebung bzw. Vergleichsreiz unterschiedlich wahrgenommen"],
  ["Halo-Effekt", "ein hervorstechendes Merkmal einer Person überstrahlt die Beurteilung ihrer übrigen Eigenschaften"],
  ["Priming", "die unbewusste Bahnung: Ein vorangehender Reiz beeinflusst die Verarbeitung des folgenden"],
  ["sensorisches Register (Ultrakurzzeitgedächtnis)", "der Speicher, der Sinneseindrücke für Sekundenbruchteile bis wenige Sekunden festhält"],
  ["Kurzzeit-/Arbeitsgedächtnis", "der Speicher mit begrenzter Kapazität (ca. 7±2 Einheiten), der Informationen kurzzeitig verfügbar hält"],
  ["Langzeitgedächtnis", "der dauerhafte Speicher mit praktisch unbegrenzter Kapazität"],
  ["Chunking", "das Bündeln von Einzelinformationen zu größeren Sinneinheiten, um das Arbeitsgedächtnis zu entlasten"],
  ["episodisches Gedächtnis", "das Gedächtnis für persönlich erlebte Ereignisse mit Ort- und Zeitbezug"],
  ["semantisches Gedächtnis", "das Gedächtnis für Fakten- und Weltwissen ohne persönlichen Erlebnisbezug"],
  ["prozedurales Gedächtnis", "das Gedächtnis für automatisierte Handlungsabläufe wie Radfahren oder Schwimmen"],
  ["Primacy-Effekt", "die ersten Elemente einer Reihe werden besser erinnert als die mittleren"],
  ["Recency-Effekt", "die letzten Elemente einer Reihe werden besser erinnert als die mittleren"],
  ["proaktive Interferenz", "früher Gelerntes stört das Behalten von neu Gelerntem"],
  ["retroaktive Interferenz", "neu Gelerntes stört das Erinnern von früher Gelerntem"],
  ["Mnemotechnik", "eine Merkstrategie (z. B. Loci-Methode), die Behalten durch Strukturierung und Bilder erleichtert"],
  ["Vergessenskurve (Ebbinghaus)", "der Befund, dass Neugelerntes ohne Wiederholung anfangs sehr schnell vergessen wird"],
  ["Abrufhinweis (retrieval cue)", "ein Reiz, der den Zugriff auf gespeicherte Gedächtnisinhalte erleichtert"],
  ["falsche Erinnerung", "eine subjektiv echte Erinnerung an ein Ereignis, das so nicht stattgefunden hat"],
  ["Konfabulation", "das unbewusste Auffüllen von Gedächtnislücken mit erfundenen Inhalten"],
  ["Aufmerksamkeit", "die Ausrichtung der begrenzten Verarbeitungskapazität auf ausgewählte Reize"],
  ["Cocktailparty-Effekt", "die Fähigkeit, aus vielen Stimmen gezielt einer zu folgen – und z. B. den eigenen Namen herauszuhören"],
];

// [Experiment, Forscher, Kernbefund]
const EXPERIMENTE = [
  ["Hunde-Speichel-Experimente zur Signalkopplung (Glocke/Futter)", "Iwan Pawlow", "Ein neutraler Reiz kann durch Kopplung eine Reflexreaktion auslösen – klassische Konditionierung."],
  ["Skinner-Box (Hebeldruck bei Ratten und Tauben)", "B. F. Skinner", "Verhalten wird durch seine Konsequenzen geformt – operante Konditionierung, Verstärkerpläne."],
  ["Bobo-Doll-Experiment (Puppe wird nach Beobachtung geschlagen)", "Albert Bandura", "Aggressives Verhalten wird durch bloße Beobachtung eines Modells gelernt."],
  ["Little-Albert-Experiment (konditionierte Angst vor der Ratte)", "John B. Watson", "Emotionale Reaktionen wie Angst können klassisch konditioniert werden."],
  ["Stanford-Prison-Experiment (Studenten als Wärter und Gefangene)", "Philip Zimbardo", "Soziale Rollen und Situationen können normales Verhalten drastisch verändern."],
  ["Gehorsams-Experiment mit vermeintlichen Elektroschocks", "Stanley Milgram", "Ein Großteil der Versuchspersonen gehorcht Autoritäten selbst gegen das eigene Gewissen."],
  ["Konformitäts-Experiment mit Linienlängen", "Solomon Asch", "Gruppendruck bringt viele Menschen dazu, offensichtlich falsche Urteile zu übernehmen."],
  ["Marshmallow-Test (Belohnungsaufschub bei Kindern)", "Walter Mischel", "Die Fähigkeit zum Belohnungsaufschub hängt mit späterer Selbstregulation zusammen."],
  ["Vergessenskurven-Studien mit sinnlosen Silben", "Hermann Ebbinghaus", "Vergessen verläuft anfangs sehr schnell und flacht dann ab."],
  ["Umschütt- und Mengenversuche mit Kindern", "Jean Piaget", "Kinder durchlaufen qualitativ unterschiedliche Stadien der Denkentwicklung."],
  ["„Verlorene-im-Einkaufszentrum“-Studien zu falschen Erinnerungen", "Elizabeth Loftus", "Erinnerungen sind konstruktiv und lassen sich durch Suggestion verändern."],
  ["Fremde-Situations-Test (Trennung und Wiedervereinigung mit der Mutter)", "Mary Ainsworth", "Kleinkinder zeigen unterscheidbare Bindungstypen (sicher, unsicher-vermeidend, ambivalent)."],
  ["Drahtmutter-Stoffmutter-Versuche mit Rhesusaffen", "Harry Harlow", "Körperkontakt und Geborgenheit sind für Bindung wichtiger als bloße Nahrung."],
  ["Unsichtbarer-Gorilla-Experiment (Basketball-Video)", "Daniel Simons & Christopher Chabris", "Unaufmerksamkeitsblindheit: Was wir nicht beachten, sehen wir oft gar nicht."],
  ["Erwartungseffekt im Klassenzimmer („Pygmalion-Effekt“)", "Robert Rosenthal & Lenore Jacobson", "Erwartungen von Lehrkräften können die Leistung der Schüler tatsächlich beeinflussen."],
];

function psychologieGenerators(klasse) {
  const gens = [];
  const begriffe = WAHRNEHMUNG_GEDAECHTNIS.map((b) => b[0]);
  const defs = WAHRNEHMUNG_GEDAECHTNIS.map((b) => b[1]);
  const forscher = EXPERIMENTE.map((e) => e[1]);
  const stadien = PIAGET_STADIEN.map((s) => s[0]);

  // Lerntheorie zum Szenario
  gens.push((r) => {
    const [szenario, theorie, erkl] = r.pick(LERN_SZENARIEN);
    return mc(r, "Lerntheorien",
      `${r.pick(LEADS)}Welche Lerntheorie erklärt dieses Szenario am besten? ${szenario}`,
      theorie, LERNTHEORIEN.filter((t) => t !== theorie).concat(["Reifung (kein Lernprozess)"]),
      erkl);
  });
  // Piaget: Beispiel -> Stadium
  gens.push((r) => {
    const [stadium, alter, , beispiel] = r.pick(PIAGET_STADIEN);
    return mc(r, "Entwicklungspsychologie (Piaget)",
      `${r.pick(LEADS)}Welchem Piaget-Stadium ist dieses Verhalten zuzuordnen? ${beispiel}`,
      stadium, pickN(r, stadien, stadium, 3),
      `Typisch für das ${stadium} (${alter}).`);
  });
  // Piaget: Stadium -> Alter
  gens.push((r) => {
    const [stadium, alter] = r.pick(PIAGET_STADIEN);
    const alle = PIAGET_STADIEN.map((s) => s[1]);
    return mc(r, "Entwicklungspsychologie (Piaget)",
      `${r.pick(LEADS)}In welchem Altersbereich liegt nach Piaget das ${stadium}?`,
      alter, pickN(r, alle, alter, 3),
      `Das ${stadium} umfasst nach Piaget etwa den Bereich ${alter}.`);
  });
  // Piaget: Stadium -> Kennzeichen
  gens.push((r) => {
    const [stadium, alter, kennz] = r.pick(PIAGET_STADIEN);
    const alle = PIAGET_STADIEN.map((s) => s[2]);
    return mc(r, "Entwicklungspsychologie (Piaget)",
      `${r.pick(LEADS)}Was kennzeichnet nach Piaget das ${stadium} (${alter})?`,
      kennz, pickN(r, alle, kennz, 3),
      `Kennzeichen des Stadiums: ${kennz}.`);
  });
  // Begriff -> Definition
  gens.push((r) => {
    const [begriff, def] = r.pick(WAHRNEHMUNG_GEDAECHTNIS);
    return mc(r, "Wahrnehmung & Gedächtnis",
      `${r.pick(LEADS)}Was versteht man unter „${begriff}“?`,
      def, pickN(r, defs, def, 3),
      `„${begriff}“ bedeutet: ${def}.`);
  });
  // Definition -> Begriff
  gens.push((r) => {
    const [begriff, def] = r.pick(WAHRNEHMUNG_GEDAECHTNIS);
    return mc(r, "Wahrnehmung & Gedächtnis",
      `${r.pick(LEADS)}Welcher Fachbegriff passt zu dieser Beschreibung? ${def[0].toUpperCase()}${def.slice(1)}.`,
      begriff, pickN(r, begriffe, begriff, 3),
      `Gesucht war „${begriff}“.`);
  });
  // Experiment -> Forscher
  gens.push((r) => {
    const [exp, name, befund] = r.pick(EXPERIMENTE);
    return mc(r, "Berühmte Experimente",
      `${r.pick(LEADS)}Wer führte dieses berühmte Experiment durch: ${exp}?`,
      name, pickN(r, forscher, name, 3),
      `${name}: ${befund}`);
  });
  // Forscher -> Experiment
  gens.push((r) => {
    const [exp, name] = r.pick(EXPERIMENTE);
    const alle = EXPERIMENTE.map((e) => e[0]);
    return mc(r, "Berühmte Experimente",
      `${r.pick(LEADS)}Welches Experiment ist mit dem Namen ${name} verbunden?`,
      exp, pickN(r, alle, exp, 3),
      `${name} ist berühmt für: ${exp}.`);
  });
  // Experiment -> Kernbefund (ab Kl. 12)
  if (klasse >= 12) {
    gens.push((r) => {
      const [exp, name, befund] = r.pick(EXPERIMENTE);
      const alle = EXPERIMENTE.map((e) => e[2]);
      return mc(r, "Berühmte Experimente",
        `${r.pick(LEADS)}Was ist der zentrale Befund des Experiments „${exp}“ (${name})?`,
        befund, pickN(r, alle, befund, 3),
        `Kernbefund: ${befund}`);
    });
  }
  return gens;
}

/* ══════════════════ 3) ERDKUNDE Klasse 5–8 ══════════════════ */

// [Land, Hauptstadt, Kontinent] — >= 80 Paare (Asien/Afrika/Amerika + Basis)
const HAUPTSTAEDTE = [
  ["China", "Peking", "Asien"], ["Japan", "Tokio", "Asien"], ["Indien", "Neu-Delhi", "Asien"],
  ["Südkorea", "Seoul", "Asien"], ["Nordkorea", "Pjöngjang", "Asien"], ["Vietnam", "Hanoi", "Asien"],
  ["Thailand", "Bangkok", "Asien"], ["Indonesien", "Jakarta", "Asien"], ["Malaysia", "Kuala Lumpur", "Asien"],
  ["Philippinen", "Manila", "Asien"], ["Kambodscha", "Phnom Penh", "Asien"], ["Laos", "Vientiane", "Asien"],
  ["Myanmar", "Naypyidaw", "Asien"], ["Bangladesch", "Dhaka", "Asien"], ["Pakistan", "Islamabad", "Asien"],
  ["Afghanistan", "Kabul", "Asien"], ["Iran", "Teheran", "Asien"], ["Irak", "Bagdad", "Asien"],
  ["Saudi-Arabien", "Riad", "Asien"], ["Israel", "Jerusalem", "Asien"], ["Jordanien", "Amman", "Asien"],
  ["Libanon", "Beirut", "Asien"], ["Syrien", "Damaskus", "Asien"], ["Türkei", "Ankara", "Asien"],
  ["Kasachstan", "Astana", "Asien"], ["Usbekistan", "Taschkent", "Asien"], ["Mongolei", "Ulaanbaatar", "Asien"],
  ["Nepal", "Kathmandu", "Asien"], ["Sri Lanka", "Colombo", "Asien"], ["Singapur", "Singapur", "Asien"],
  ["Katar", "Doha", "Asien"], ["Vereinigte Arabische Emirate", "Abu Dhabi", "Asien"], ["Kuwait", "Kuwait-Stadt", "Asien"],
  ["Oman", "Maskat", "Asien"], ["Jemen", "Sanaa", "Asien"], ["Georgien", "Tiflis", "Asien"],
  ["Armenien", "Eriwan", "Asien"], ["Aserbaidschan", "Baku", "Asien"],
  ["Ägypten", "Kairo", "Afrika"], ["Nigeria", "Abuja", "Afrika"], ["Südafrika", "Pretoria (Regierungssitz)", "Afrika"],
  ["Kenia", "Nairobi", "Afrika"], ["Äthiopien", "Addis Abeba", "Afrika"], ["Marokko", "Rabat", "Afrika"],
  ["Algerien", "Algier", "Afrika"], ["Tunesien", "Tunis", "Afrika"], ["Libyen", "Tripolis", "Afrika"],
  ["Ghana", "Accra", "Afrika"], ["Senegal", "Dakar", "Afrika"], ["Mali", "Bamako", "Afrika"],
  ["Elfenbeinküste", "Yamoussoukro", "Afrika"], ["Kamerun", "Jaunde", "Afrika"],
  ["Demokratische Republik Kongo", "Kinshasa", "Afrika"], ["Angola", "Luanda", "Afrika"],
  ["Tansania", "Dodoma", "Afrika"], ["Uganda", "Kampala", "Afrika"], ["Sudan", "Khartum", "Afrika"],
  ["Simbabwe", "Harare", "Afrika"], ["Sambia", "Lusaka", "Afrika"], ["Mosambik", "Maputo", "Afrika"],
  ["Namibia", "Windhoek", "Afrika"], ["Botswana", "Gaborone", "Afrika"], ["Madagaskar", "Antananarivo", "Afrika"],
  ["Ruanda", "Kigali", "Afrika"], ["Somalia", "Mogadischu", "Afrika"], ["Niger", "Niamey", "Afrika"],
  ["Tschad", "N'Djamena", "Afrika"], ["Burkina Faso", "Ouagadougou", "Afrika"],
  ["USA", "Washington, D.C.", "Nordamerika"], ["Kanada", "Ottawa", "Nordamerika"], ["Mexiko", "Mexiko-Stadt", "Nordamerika"],
  ["Kuba", "Havanna", "Nordamerika"], ["Guatemala", "Guatemala-Stadt", "Nordamerika"], ["Panama", "Panama-Stadt", "Nordamerika"],
  ["Costa Rica", "San José", "Nordamerika"], ["Jamaika", "Kingston", "Nordamerika"],
  ["Honduras", "Tegucigalpa", "Nordamerika"], ["Nicaragua", "Managua", "Nordamerika"],
  ["Brasilien", "Brasília", "Südamerika"], ["Argentinien", "Buenos Aires", "Südamerika"], ["Chile", "Santiago de Chile", "Südamerika"],
  ["Peru", "Lima", "Südamerika"], ["Kolumbien", "Bogotá", "Südamerika"], ["Venezuela", "Caracas", "Südamerika"],
  ["Ecuador", "Quito", "Südamerika"], ["Bolivien", "Sucre (verfassungsmäßig)", "Südamerika"],
  ["Paraguay", "Asunción", "Südamerika"], ["Uruguay", "Montevideo", "Südamerika"],
];

// [Fluss, Länge km, Kontinent/Region]
const FLUESSE = [
  ["Nil", 6650, "Afrika"], ["Amazonas", 6400, "Südamerika"], ["Jangtsekiang", 6300, "Asien"],
  ["Mississippi-Missouri", 6275, "Nordamerika"], ["Jenissei", 5539, "Asien"], ["Gelber Fluss (Huang He)", 5464, "Asien"],
  ["Ob", 5410, "Asien"], ["Paraná", 4880, "Südamerika"], ["Kongo", 4700, "Afrika"],
  ["Amur", 4444, "Asien"], ["Lena", 4400, "Asien"], ["Mekong", 4350, "Asien"],
  ["Mackenzie", 4241, "Nordamerika"], ["Niger", 4184, "Afrika"], ["Wolga", 3531, "Europa"],
  ["Indus", 3180, "Asien"], ["Donau", 2857, "Europa"], ["Ganges", 2620, "Asien"],
  ["Sambesi", 2574, "Afrika"], ["Rhein", 1233, "Europa"],
];

// [Berg, Höhe m, Gebirge/Kontinent]
const BERGE = [
  ["Mount Everest", 8849, "Himalaya (Asien)"], ["K2", 8611, "Karakorum (Asien)"],
  ["Kangchendzönga", 8586, "Himalaya (Asien)"], ["Lhotse", 8516, "Himalaya (Asien)"],
  ["Makalu", 8485, "Himalaya (Asien)"], ["Cho Oyu", 8188, "Himalaya (Asien)"],
  ["Dhaulagiri", 8167, "Himalaya (Asien)"], ["Manaslu", 8163, "Himalaya (Asien)"],
  ["Nanga Parbat", 8126, "Himalaya (Asien)"], ["Annapurna", 8091, "Himalaya (Asien)"],
  ["Aconcagua", 6961, "Anden (Südamerika)"], ["Denali", 6190, "Alaskakette (Nordamerika)"],
  ["Kilimandscharo", 5895, "Afrika"], ["Elbrus", 5642, "Kaukasus (Europa)"],
  ["Mont Blanc", 4810, "Alpen (Europa)"], ["Matterhorn", 4478, "Alpen (Europa)"],
  ["Zugspitze", 2962, "Alpen (Deutschland)"], ["Mount Kosciuszko", 2228, "Australien"],
];

// [Stadt, UTC-Offset (vereinfacht, ohne Sommerzeit)]
const ZEITZONEN_STAEDTE = [
  ["London", 0], ["Berlin", 1], ["Kairo", 2], ["Moskau", 3], ["Dubai", 4],
  ["Karatschi", 5], ["Dhaka", 6], ["Bangkok", 7], ["Peking", 8], ["Tokio", 9],
  ["Sydney", 10], ["Auckland", 12], ["Rio de Janeiro", -3], ["New York", -5],
  ["Chicago", -6], ["Denver", -7], ["Los Angeles", -8],
];

// [Frage, Antwort, Distraktoren, Erklärung]
const KONTINENT_REKORDE = [
  ["Welcher ist der größte Kontinent der Erde?", "Asien", ["Afrika", "Nordamerika", "Europa"], "Asien ist mit rund 44,6 Mio. km² der mit Abstand größte Kontinent."],
  ["Welcher ist der kleinste Kontinent?", "Australien/Ozeanien", ["Europa", "Antarktika", "Südamerika"], "Australien ist mit ca. 8,5 Mio. km² der kleinste Kontinent."],
  ["Auf welchem Kontinent leben die meisten Menschen?", "Asien", ["Afrika", "Europa", "Nordamerika"], "In Asien leben über 4,7 Milliarden Menschen – mehr als auf allen anderen Kontinenten zusammen."],
  ["Welcher Kontinent ist am kältesten?", "Antarktika", ["Asien", "Europa", "Nordamerika"], "In der Antarktis wurden unter −89 °C gemessen – Kälterekord der Erde."],
  ["Auf welchem Kontinent liegt die größte Wüste außerhalb der Polargebiete?", "Afrika (Sahara)", ["Asien (Gobi)", "Australien (Outback)", "Südamerika (Atacama)"], "Die Sahara in Afrika ist mit ca. 9 Mio. km² die größte heiße Wüste."],
  ["Welcher Kontinent hat die meisten Staaten?", "Afrika", ["Asien", "Europa", "Südamerika"], "Afrika zählt 54 anerkannte Staaten – mehr als jeder andere Kontinent."],
  ["Auf welchem Kontinent liegt der längste Fluss der Erde (Nil)?", "Afrika", ["Asien", "Südamerika", "Nordamerika"], "Der Nil fließt durch Nordostafrika und ist rund 6650 km lang."],
  ["Auf welchem Kontinent liegt der höchste Berg der Erde?", "Asien", ["Südamerika", "Afrika", "Europa"], "Der Mount Everest (8849 m) liegt im Himalaya in Asien."],
  ["Welcher Kontinent hat keine dauerhafte Bevölkerung?", "Antarktika", ["Australien/Ozeanien", "Südamerika", "Afrika"], "In der Antarktis leben nur Forscher auf Zeit – keine ständige Bevölkerung."],
  ["Auf welchem Kontinent liegt der wasserreichste Fluss der Erde (Amazonas)?", "Südamerika", ["Afrika", "Asien", "Nordamerika"], "Der Amazonas in Südamerika führt mehr Wasser als jeder andere Fluss."],
  ["Auf welchem Kontinent liegt der größte Regenwald der Erde?", "Südamerika", ["Afrika", "Asien", "Australien/Ozeanien"], "Der Amazonas-Regenwald in Südamerika ist der größte tropische Regenwald."],
  ["Welcher Kontinent wird vom Äquator, dem nördlichen und dem südlichen Wendekreis durchzogen?", "Afrika", ["Asien", "Südamerika", "Australien/Ozeanien"], "Nur Afrika wird von allen drei Breitenkreisen geschnitten."],
  ["Auf welchem Kontinent liegt der tiefste See der Erde (Baikalsee)?", "Asien", ["Nordamerika", "Afrika", "Europa"], "Der Baikalsee in Sibirien (Asien) ist mit ca. 1642 m der tiefste See."],
  ["Auf welchem Kontinent liegt das Tote Meer, der tiefste zugängliche Punkt der Landoberfläche?", "Asien", ["Afrika", "Europa", "Australien/Ozeanien"], "Das Ufer des Toten Meeres liegt gut 430 m unter dem Meeresspiegel – in Vorderasien."],
  ["Welcher Kontinent hat den größten Anteil an Wüstenfläche Australiens? (Achtung: Kontinent gesucht!)", "Australien/Ozeanien", ["Afrika", "Asien", "Südamerika"], "Das trockene „Outback“ bedeckt große Teile des australischen Kontinents."],
  ["Auf welchem Kontinent liegen die Anden, das längste Gebirge der Welt?", "Südamerika", ["Nordamerika", "Asien", "Afrika"], "Die Anden erstrecken sich über rund 7500 km entlang Südamerikas Westküste."],
  ["Auf welchem Kontinent liegt der Grand Canyon?", "Nordamerika", ["Südamerika", "Afrika", "Australien/Ozeanien"], "Der Grand Canyon liegt in den USA, also in Nordamerika."],
  ["Auf welchem Kontinent liegt das größte Korallenriff der Erde (Great Barrier Reef)?", "Australien/Ozeanien", ["Asien", "Afrika", "Südamerika"], "Das Great Barrier Reef liegt vor der Nordostküste Australiens."],
  ["Welcher Kontinent enthält rund 70 % des Süßwassers der Erde – gebunden als Eis?", "Antarktika", ["Asien", "Nordamerika", "Europa"], "Der antarktische Eisschild speichert den Großteil des Süßwassers der Erde."],
  ["Auf welchem Kontinent liegt der Victoriasee, der größte See Afrikas?", "Afrika", ["Asien", "Südamerika", "Nordamerika"], "Der Victoriasee liegt in Ostafrika zwischen Uganda, Kenia und Tansania."],
];

function erdkunde3Generators(klasse) {
  const gens = [];
  const staedte = HAUPTSTAEDTE.map((h) => h[1]);
  const laender = HAUPTSTAEDTE.map((h) => h[0]);

  // Land -> Hauptstadt
  gens.push((r) => {
    const [land, stadt, kontinent] = r.pick(HAUPTSTAEDTE);
    const pool = HAUPTSTAEDTE.filter((h) => h[2] === kontinent).map((h) => h[1]);
    return mc(r, "Hauptstädte der Welt",
      `${r.pick(LEADS)}Wie heißt die Hauptstadt von ${land}?`,
      stadt, pickN(r, pool.length >= 4 ? pool : staedte, stadt, 3),
      `Die Hauptstadt von ${land} (${kontinent}) ist ${stadt}.`);
  });
  // Hauptstadt -> Land
  gens.push((r) => {
    const [land, stadt, kontinent] = r.pick(HAUPTSTAEDTE);
    const pool = HAUPTSTAEDTE.filter((h) => h[2] === kontinent).map((h) => h[0]);
    return mc(r, "Hauptstädte der Welt",
      `${r.pick(LEADS)}${stadt} ist die Hauptstadt welches Landes?`,
      land, pickN(r, pool.length >= 4 ? pool : laender, land, 3),
      `${stadt} ist die Hauptstadt von ${land} (${kontinent}).`);
  });
  // Land -> Kontinent
  gens.push((r) => {
    const [land, stadt, kontinent] = r.pick(HAUPTSTAEDTE);
    const alle = [...new Set(HAUPTSTAEDTE.map((h) => h[2]))].concat(["Europa", "Australien/Ozeanien"]);
    return mc(r, "Kontinente",
      `${r.pick(LEADS)}Auf welchem Kontinent liegt ${land} (Hauptstadt: ${stadt})?`,
      kontinent, pickN(r, alle, kontinent, 3),
      `${land} liegt in ${kontinent}.`);
  });
  // Längster Fluss aus 4
  gens.push((r) => {
    const vier = r.shuffle(FLUESSE).slice(0, 4);
    const max = vier.reduce((a, b) => (b[1] > a[1] ? b : a));
    const namen = vier.map((f) => f[0]);
    const opts = r.shuffle(namen);
    return {
      topic: "Flüsse der Welt",
      question: `${r.pick(LEADS)}Welcher dieser Flüsse ist am längsten: ${namen.join(", ")}?`,
      options: opts,
      correct: opts.indexOf(max[0]),
      explanation: `Der ${max[0]} (${max[2]}) ist mit rund ${max[1]} km der längste der vier.`,
    };
  });
  // Fluss-Länge
  gens.push((r) => {
    const [fluss, laenge, region] = r.pick(FLUESSE);
    return mc(r, "Flüsse der Welt",
      `${r.pick(LEADS)}Wie lang ist der ${fluss} (${region}) ungefähr?`,
      `ca. ${laenge} km`,
      nearNum(r, laenge, [400, 800, 1200, 1600], (x) => `ca. ${Math.round(x)} km`),
      `Der ${fluss} ist rund ${laenge} km lang.`);
  });
  // Höchster Berg aus 4
  gens.push((r) => {
    const vier = r.shuffle(BERGE).slice(0, 4);
    const max = vier.reduce((a, b) => (b[1] > a[1] ? b : a));
    const namen = vier.map((b) => b[0]);
    const opts = r.shuffle(namen);
    return {
      topic: "Berge der Welt",
      question: `${r.pick(LEADS)}Welcher dieser Berge ist am höchsten: ${namen.join(", ")}?`,
      options: opts,
      correct: opts.indexOf(max[0]),
      explanation: `Der ${max[0]} (${max[2]}) ist mit ${max[1]} m der höchste der vier.`,
    };
  });
  // Berg-Höhe
  gens.push((r) => {
    const [berg, hoehe, region] = r.pick(BERGE);
    return mc(r, "Berge der Welt",
      `${r.pick(LEADS)}Wie hoch ist der ${berg} (${region})?`,
      `${hoehe} m`,
      nearNum(r, hoehe, [150, 300, 500, 800], (x) => `${Math.round(x)} m`),
      `Der ${berg} ist ${hoehe} m hoch.`);
  });
  // Zeitzonen-Rechnung (ab Kl. 6 etwas größere Differenzen)
  gens.push((r) => {
    const a = r.pick(ZEITZONEN_STAEDTE);
    let b = r.pick(ZEITZONEN_STAEDTE);
    let guard = 0;
    while ((b[0] === a[0] || Math.abs(b[1] - a[1]) === 0 || (klasse <= 5 && Math.abs(b[1] - a[1]) > 8)) && guard++ < 30)
      b = r.pick(ZEITZONEN_STAEDTE);
    if (b[0] === a[0] || b[1] === a[1]) return null;
    const stunde = r.int(6, 20);
    const diff = b[1] - a[1];
    const ziel = ((stunde + diff) % 24 + 24) % 24;
    const fmt = (h) => `${String(((Math.round(h) % 24) + 24) % 24).padStart(2, "0")}:00 Uhr`;
    return mc(r, "Zeitzonen",
      `${r.pick(LEADS)}In ${a[0]} (UTC${a[1] >= 0 ? "+" : ""}${a[1]}) ist es ${fmt(stunde)}. Wie spät ist es dann in ${b[0]} (UTC${b[1] >= 0 ? "+" : ""}${b[1]})?`,
      fmt(ziel),
      [fmt(ziel + 1), fmt(ziel - 1), fmt(ziel + 2)],
      `Zeitunterschied: ${diff > 0 ? "+" : ""}${diff} Stunden. ${stunde}:00 Uhr ${diff > 0 ? "+" : "−"} ${Math.abs(diff)} h = ${fmt(ziel)} in ${b[0]}.`);
  });
  // Kontinente-Rekorde
  gens.push((r) => {
    const [q, a, d, e] = r.pick(KONTINENT_REKORDE);
    return mc(r, "Kontinente-Rekorde", `${r.pick(LEADS)}${q}`, a, r.shuffle(d), e);
  });
  return gens;
}

/* ══════════════════ 4) PHYSIK Klasse 7–10 ══════════════════ */

function physik4Generators(klasse) {
  const gens = [];
  const hard = klasse >= 9;

  // U = R * I (Grundform, alle drei Varianten)
  gens.push((r) => {
    const R = r.pick(hard ? [5, 10, 12, 15, 20, 22, 25, 40, 50, 60, 100] : [2, 4, 5, 10, 20, 25, 50]);
    const I = r.pick(hard ? [0.2, 0.4, 0.5, 1, 1.5, 2, 2.5, 3] : [0.5, 1, 2, 3]);
    const U = Math.round(R * I * 100) / 100;
    const variante = r.int(1, 3);
    if (variante === 1)
      return mc(r, "Ohmsches Gesetz",
        `${r.pick(LEADS)}Durch einen Widerstand von ${de(R)} Ω fließt ein Strom von ${de(I)} A. Wie groß ist die Spannung U?`,
        `${de(U)} V`, nearNum(r, U, [U * 0.5, U * 0.25, U * 0.1].map((x) => Math.max(1, Math.round(x))), (x) => `${de(x)} V`),
        `U = R · I = ${de(R)} Ω · ${de(I)} A = ${de(U)} V.`);
    if (variante === 2)
      return mc(r, "Ohmsches Gesetz",
        `${r.pick(LEADS)}An einem Widerstand von ${de(R)} Ω liegt die Spannung ${de(U)} V an. Wie groß ist die Stromstärke I?`,
        `${de(I)} A`, nearNum(r, I, [0.1, 0.2, 0.5, 1], (x) => `${de(x)} A`),
        `I = U / R = ${de(U)} V / ${de(R)} Ω = ${de(I)} A.`);
    return mc(r, "Ohmsches Gesetz",
      `${r.pick(LEADS)}Bei einer Spannung von ${de(U)} V fließt ein Strom von ${de(I)} A. Wie groß ist der Widerstand R?`,
      `${de(R)} Ω`, nearNum(r, R, [2, 5, 10, 20], (x) => `${de(x)} Ω`),
      `R = U / I = ${de(U)} V / ${de(I)} A = ${de(R)} Ω.`);
  });

  // Reihenschaltung zweier Widerstände
  gens.push((r) => {
    const R1 = r.pick([5, 10, 15, 20, 25, 30, 40, 50, 60, 80, 100]);
    const R2 = r.pick([5, 10, 15, 20, 25, 30, 40, 50, 60, 80, 100]);
    const Rg = R1 + R2;
    if (r.next() < 0.5) {
      return mc(r, "Reihenschaltung",
        `${r.pick(LEADS)}Zwei Widerstände R₁ = ${R1} Ω und R₂ = ${R2} Ω sind in Reihe geschaltet. Wie groß ist der Gesamtwiderstand?`,
        `${Rg} Ω`, nearNum(r, Rg, [5, 10, 15, 20], (x) => `${Math.round(x)} Ω`),
        `In Reihe addieren sich die Widerstände: Rges = R₁ + R₂ = ${R1} Ω + ${R2} Ω = ${Rg} Ω.`);
    }
    const I = r.pick([0.1, 0.2, 0.5, 1, 2]);
    const U = Math.round(Rg * I * 100) / 100;
    return mc(r, "Reihenschaltung",
      `${r.pick(LEADS)}R₁ = ${R1} Ω und R₂ = ${R2} Ω sind in Reihe geschaltet, es fließt I = ${de(I)} A. Welche Gesamtspannung liegt an?`,
      `${de(U)} V`, nearNum(r, U, [Math.max(1, U * 0.2), Math.max(2, U * 0.4)], (x) => `${de(Math.round(x * 100) / 100)} V`),
      `Rges = ${R1} + ${R2} = ${Rg} Ω; U = Rges · I = ${Rg} Ω · ${de(I)} A = ${de(U)} V.`);
  });

  // Parallelschaltung zweier Widerstände (Paare mit "schönem" Ergebnis)
  gens.push((r) => {
    const paare = [[2, 2], [4, 4], [6, 6], [10, 10], [20, 20], [3, 6], [6, 3], [4, 12], [12, 4], [10, 40], [40, 10], [12, 6], [6, 12], [20, 5], [5, 20], [15, 30], [30, 15], [8, 8], [12, 24], [24, 12], [100, 100], [50, 50], [30, 60], [60, 30]];
    const [R1, R2] = r.pick(paare);
    const Rg = Math.round((R1 * R2) / (R1 + R2) * 100) / 100;
    return mc(r, "Parallelschaltung",
      `${r.pick(LEADS)}Zwei Widerstände R₁ = ${R1} Ω und R₂ = ${R2} Ω sind parallel geschaltet. Wie groß ist der Gesamtwiderstand?`,
      `${de(Rg)} Ω`, nearNum(r, Rg, [Math.max(1, Rg * 0.25), Math.max(2, Rg * 0.5), R1], (x) => `${de(Math.round(x * 100) / 100)} Ω`),
      `Parallel: Rges = (R₁ · R₂) / (R₁ + R₂) = (${R1} · ${R2}) / (${R1} + ${R2}) = ${de(Rg)} Ω — immer kleiner als der kleinste Einzelwiderstand.`);
  });

  // Arbeit W = F * s
  gens.push((r) => {
    const F = r.pick(hard ? [15, 25, 40, 50, 75, 120, 150, 200, 250] : [10, 20, 50, 100, 200]);
    const s = r.pick(hard ? [1.5, 2.5, 4, 6, 8, 12] : [2, 3, 5, 10]);
    const W = Math.round(F * s * 100) / 100;
    return mc(r, "Mechanische Arbeit",
      `${r.pick(LEADS)}Eine Kiste wird mit der Kraft F = ${de(F)} N über eine Strecke von s = ${de(s)} m gezogen. Welche Arbeit wird verrichtet?`,
      `${de(W)} J`, nearNum(r, W, [Math.max(5, W * 0.1), Math.max(10, W * 0.25), Math.max(20, W * 0.5)], (x) => `${de(Math.round(x * 100) / 100)} J`),
      `W = F · s = ${de(F)} N · ${de(s)} m = ${de(W)} J (Joule).`);
  });

  // Leistung P = W / t
  gens.push((r) => {
    const P = r.pick(hard ? [25, 40, 60, 75, 120, 150, 250, 500] : [20, 50, 100, 200]);
    const t = r.pick([2, 4, 5, 10, 20, 30, 60]);
    const W = P * t;
    if (r.next() < 0.5)
      return mc(r, "Leistung",
        `${r.pick(LEADS)}In t = ${t} s wird die Arbeit W = ${W} J verrichtet. Wie groß ist die Leistung P?`,
        `${P} W`, nearNum(r, P, [Math.max(5, P * 0.2), Math.max(10, P * 0.5)], (x) => `${Math.round(x)} W`),
        `P = W / t = ${W} J / ${t} s = ${P} W (Watt).`);
    return mc(r, "Leistung",
      `${r.pick(LEADS)}Ein Motor hat die Leistung P = ${P} W. Welche Arbeit verrichtet er in t = ${t} s?`,
      `${W} J`, nearNum(r, W, [Math.max(20, W * 0.1), Math.max(50, W * 0.25)], (x) => `${Math.round(x)} J`),
      `W = P · t = ${P} W · ${t} s = ${W} J.`);
  });

  // Wirkungsgrad
  gens.push((r) => {
    const eta = r.pick([20, 25, 30, 40, 50, 60, 75, 80, 90]);
    const Wzu = r.pick([200, 400, 500, 800, 1000, 2000]);
    const Wnutz = Math.round(Wzu * eta / 100);
    if (r.next() < 0.5)
      return mc(r, "Wirkungsgrad",
        `${r.pick(LEADS)}Einer Maschine werden ${Wzu} J zugeführt, sie gibt ${Wnutz} J nutzbare Arbeit ab. Wie groß ist der Wirkungsgrad?`,
        `${eta} %`, nearNum(r, eta, [5, 10, 15, 20], (x) => `${Math.round(x)} %`),
        `η = Wnutz / Wzu = ${Wnutz} J / ${Wzu} J = ${de(eta / 100)} = ${eta} %.`);
    return mc(r, "Wirkungsgrad",
      `${r.pick(LEADS)}Eine Maschine hat den Wirkungsgrad ${eta} % und erhält ${Wzu} J Energie. Wie viel nutzbare Arbeit gibt sie ab?`,
      `${Wnutz} J`, nearNum(r, Wnutz, [Math.max(10, Wnutz * 0.1), Math.max(25, Wnutz * 0.25)], (x) => `${Math.round(x)} J`),
      `Wnutz = η · Wzu = ${de(eta / 100)} · ${Wzu} J = ${Wnutz} J. Der Rest geht als Wärme verloren.`);
  });

  // km/h <-> m/s (Faktor 3,6)
  gens.push((r) => {
    if (r.next() < 0.5) {
      const ms = r.pick([5, 10, 15, 20, 25, 30, 40, 50]);
      const kmh = Math.round(ms * 3.6 * 100) / 100;
      return mc(r, "Geschwindigkeit umrechnen",
        `${r.pick(LEADS)}Ein Fahrzeug fährt ${ms} m/s. Wie viel km/h sind das?`,
        `${de(kmh)} km/h`, nearNum(r, kmh, [3.6, 7.2, 18], (x) => `${de(Math.round(x * 100) / 100)} km/h`),
        `Umrechnung: ${ms} m/s · 3,6 = ${de(kmh)} km/h.`);
    }
    const kmh = r.pick([18, 36, 54, 72, 90, 108, 126, 144, 180]);
    const ms = Math.round(kmh / 3.6 * 100) / 100;
    return mc(r, "Geschwindigkeit umrechnen",
      `${r.pick(LEADS)}Ein Auto fährt ${kmh} km/h. Wie viel m/s sind das?`,
      `${de(ms)} m/s`, nearNum(r, ms, [2, 5, 10], (x) => `${de(Math.round(x * 100) / 100)} m/s`),
      `Umrechnung: ${kmh} km/h : 3,6 = ${de(ms)} m/s.`);
  });

  return gens;
}

/* ────────────────────────── Hauptprogramm ────────────────────────── */

function writeBank(fileBase, klasse, questions, minCount) {
  const file = join(DATA_DIR, `${fileBase}-klasse${klasse}.json`);
  writeFileSync(file, JSON.stringify(questions, null, 1) + "\n");
  const warn = questions.length < minCount ? `  ⚠ unter Soll (${minCount})` : "";
  console.log(`  ${fileBase} Klasse ${klasse}: ${questions.length} Fragen → ${file}${warn}`);
  return questions.length;
}

function main() {
  mkdirSync(DATA_DIR, { recursive: true });
  let total = 0;

  console.log("Philosophie (Klasse 11–13, je >= 400):");
  for (let k = 11; k <= 13; k++)
    total += writeBank("philosophie", k, generateBank(171000 + k, 400, philosophieGenerators(k)), 400);

  console.log("Psychologie (Klasse 11–13, je >= 350):");
  for (let k = 11; k <= 13; k++)
    total += writeBank("psychologie", k, generateBank(172000 + k, 350, psychologieGenerators(k)), 350);

  console.log("Erdkunde Welt (Klasse 5–8, je >= 400):");
  for (let k = 5; k <= 8; k++)
    total += writeBank("erdkunde3", k, generateBank(173000 + k, 400, erdkunde3Generators(k)), 400);

  console.log("Physik Berechnungen (Klasse 7–10, je >= 400):");
  for (let k = 7; k <= 10; k++)
    total += writeBank("physik4", k, generateBank(174000 + k, 400, physik4Generators(k)), 400);

  console.log(`\nGesamt (Runde 17): ${total} Fragen.`);
}

main();
