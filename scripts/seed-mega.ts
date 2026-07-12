/* Copyright 2026 Elian Schock, Jonas Schwenk */
/**
 * MEGA curriculum seed — 150+ topics, 900+ questions
 * Run: DATABASE_URL="file:./prisma/prisma/dev.db" npx tsx scripts/seed-mega.ts
 */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

type QDef = { type: "mc"|"fill_blank"|"true_false"|"order"|"match"; question: string; options: string|null; correct: string; explanation: string; order: number };
type TopicDef = { id: string; subject: string; grade: number; order: number; title: string; description: string; lesson: string; questions: QDef[] };

const mc  = (q: string, opts: string[], c: number, ex: string, o: number): QDef => ({ type:"mc", question:q, options:JSON.stringify(opts), correct:String(c), explanation:ex, order:o });
const tf  = (q: string, c: boolean, ex: string, o: number): QDef => ({ type:"true_false", question:q, options:null, correct:String(c), explanation:ex, order:o });
const fb  = (q: string, ans: string[], ex: string, o: number): QDef => ({ type:"fill_blank", question:q, options:null, correct:JSON.stringify(ans), explanation:ex, order:o });

const topics: TopicDef[] = [

// ══════════════════════════════════════════════════════
// MATHEMATIK — extra topics per grade
// ══════════════════════════════════════════════════════
{
  id:"cur-mathe-5-zuordnungen", subject:"mathematik", grade:5, order:5,
  title:"Proportionale Zuordnungen", description:"Proportionale Zusammenhänge erkennen und berechnen.",
  lesson:"## Proportionale Zuordnungen\n\nZwei Größen sind **proportional**, wenn ihr Quotient konstant ist.\n\n**Dreisatz:**\n1. Was ist gegeben?\n2. Einheitswert bestimmen\n3. Gesuchte berechnen\n\nBeispiel: 3 kg kosten 6 €. Was kosten 7 kg?\n→ 1 kg = 2 € → 7 kg = 14 €",
  questions:[
    mc("3 Äpfel kosten 1,50 €. Was kosten 10 Äpfel?",["3,00 €","5,00 €","4,50 €","2,00 €"],1,"1 Apfel = 0,50 €; 10 × 0,50 = 5,00 €.",1),
    fb("4 Stunden → 120 km. Wie viele km in 7 Stunden? ___",["210"],"30 km/h → 7×30=210.",2),
    tf("Bei proportionaler Zuordnung verdoppelt sich der Ausgangswert, verdoppelt sich auch der Ergebniswert.",true,"Das ist genau das Wesen der Proportionalität.",3),
    mc("Welche ist KEINE proportionale Zuordnung?",["Weg und Zeit bei konstanter Geschwindigkeit","Preis und Menge","Alter und Körpergröße","Benzinverbrauch und Kilometeranzahl"],2,"Körpergröße wächst nicht proportional zum Alter.",4),
    fb("Wenn x und y proportional sind und y=15 für x=3, dann ist y=___ für x=7.",["35"],"y/x=5 → 7×5=35.",5),
    mc("Welche Tabelle zeigt eine proportionale Zuordnung?",["x:1,2,3 y:2,5,7","x:1,2,3 y:3,6,9","x:1,2,3 y:1,4,9","x:1,2,3 y:2,3,4"],1,"3,6,9: Faktor 3 konstant.",6),
  ],
},
{
  id:"cur-mathe-8-gleichungssysteme", subject:"mathematik", grade:8, order:2,
  title:"Lineare Gleichungssysteme", description:"Zwei Gleichungen mit zwei Unbekannten — Einsetzungs- und Additionsverfahren.",
  lesson:"## LGS\n\n**Einsetzungsverfahren:**\n1. Eine Gleichung nach einer Variablen auflösen\n2. In die andere einsetzen\n\n**Additionsverfahren:**\nGleichungen so multiplizieren, dass eine Variable eliminiert wird.\n\nBeispiel: 2x+y=7 und x-y=2 → Addition: 3x=9 → x=3 → y=1",
  questions:[
    fb("2x+y=7 und x-y=2. Additionsverfahren: 3x=___ → x=___",["9","3"],"3x=9 → x=3.",1),
    mc("Wie viele Lösungen hat ein LGS mit zwei parallelen Geraden?",["Genau eine","Unendlich viele","Keine","Zwei"],2,"Parallele Geraden schneiden sich nicht → keine Lösung.",2),
    fb("x+y=5 und x-y=1. Lösung: x=___, y=___",["3","2"],"Addition: 2x=6 → x=3; y=5-3=2.",3),
    tf("Beim Additionsverfahren addiert man beide Gleichungen so, dass eine Variable wegfällt.",true,"Ziel: eine Variable eliminieren.",4),
    mc("x=2y und x+y=9. Einsetzung liefert:",["y=1","y=2","y=3","y=4"],2,"2y+y=9 → 3y=9 → y=3 → x=6.",5),
    fb("3x+2y=12 und x=2. Dann ist y=___",["3"],"3×2+2y=12 → 2y=6 → y=3.",6),
  ],
},
{
  id:"cur-mathe-9-quadratische", subject:"mathematik", grade:9, order:3,
  title:"Quadratische Gleichungen", description:"Lösungsformel (pq-Formel), Faktorisieren, Diskriminante.",
  lesson:"## Quadratische Gleichungen\n\n**Normalform:** x² + px + q = 0\n\n**pq-Formel:** x = -p/2 ± √((p/2)² - q)\n\n**Diskriminante D = (p/2)² - q:**\n- D > 0: zwei Lösungen\n- D = 0: eine Lösung\n- D < 0: keine reelle Lösung\n\nBeispiel: x²-5x+6=0 → x=(-(-5)/2)±√(6.25-6) → x=2 oder x=3",
  questions:[
    fb("x²-5x+6=0: p=___,  q=___",["−5","6"],"Normalform x²+px+q=0 → p=-5, q=6.",1),
    mc("Diskriminante D=0 bedeutet:",["Zwei verschiedene Lösungen","Genau eine Lösung","Keine reelle Lösung","Unendlich viele Lösungen"],1,"D=0 → eine Doppellösung.",2),
    fb("x²-5x+6=0: Lösungen x₁=___ und x₂=___",["2","3"],"(x-2)(x-3)=0.",3),
    mc("x²+2x+5=0: Diskriminante D=",["4-20=-16","1-5=-4","4+20=24","1+5=6"],1,"D=(2/2)²-5=1-5=-4 → keine reelle Lösung.",4),
    tf("x²-4=0 hat die Lösungen x=+2 und x=-2.",true,"x²=4 → x=±2.",5),
    fb("(x-3)(x+1)=0 → x=___ oder x=___",["3","-1"],"Nullstellen bei x=3 und x=-1.",6),
  ],
},
{
  id:"cur-mathe-10-exponential", subject:"mathematik", grade:10, order:2,
  title:"Exponentialfunktionen", description:"f(x)=aˣ — Wachstum, Zerfall, Eigenschaften.",
  lesson:"## Exponentialfunktionen\n\n**Form:** f(x) = a · bˣ (b > 0, b ≠ 1)\n\n- b > 1: **exponentielles Wachstum** (Bevölkerung, Zinsen)\n- 0 < b < 1: **exponentieller Zerfall** (Radioaktivität)\n\n**Eigenschaften:**\n- Immer positiv\n- Schneidet y-Achse bei (0, a)\n- Keine Nullstellen\n\n**Euler'sche Zahl:** e ≈ 2,718",
  questions:[
    mc("f(x)=2ˣ: Welchen Wert hat f(0)?",["0","1","2","−1"],1,"2⁰=1.",1),
    tf("Eine Exponentialfunktion mit Basis b>1 wächst unbegrenzt.",true,"Exponentielles Wachstum → keine obere Schranke.",2),
    fb("f(x)=3·2ˣ: f(3)=___",["24"],"3·2³=3·8=24.",3),
    mc("Welche Funktion beschreibt Zerfall?",["f(x)=1,5ˣ","f(x)=2ˣ","f(x)=0,5ˣ","f(x)=3ˣ"],2,"0,5<1 → Zerfall.",4),
    fb("e ist eine irrationale Zahl mit e≈___",["2,718"],"Euler'sche Zahl e≈2,71828...",5),
    mc("Verdopplungszeit bei f(t)=100·2^(t/3): Nach wie vielen Jahren hat f verdoppelt?",["1 Jahr","3 Jahre","6 Jahre","2 Jahre"],1,"2^(t/3)=2 → t/3=1 → t=3.",6),
  ],
},
{
  id:"cur-mathe-11-trigono-erw", subject:"mathematik", grade:11, order:2,
  title:"Trigonometrie — Einheitskreis & Graphen", description:"sin/cos am Einheitskreis, Periodizität, Amplitude, Phasenverschiebung.",
  lesson:"## Trigonometrie erweitert\n\n**Einheitskreis:** sin(α) = y-Koordinate, cos(α) = x-Koordinate\n\n**Periodizität:** sin und cos sind periodisch mit Periode 2π\n\n**Allgemeine Form:** f(x) = A · sin(B·x + C) + D\n- A = Amplitude\n- 2π/B = Periode\n- C = Phasenverschiebung\n- D = vertikale Verschiebung",
  questions:[
    fb("sin(90°)=___ und cos(90°)=___",["1","0"],"Einheitskreis: (0,1) bei 90°.",1),
    mc("Die Periode von sin(2x) ist:",["2π","π","4π","π/2"],1,"2π/B=2π/2=π.",2),
    tf("cos(-x)=cos(x) für alle x.",true,"Kosinus ist eine gerade Funktion.",3),
    fb("Amplitude von f(x)=3·sin(x) ist ___",["3"],"Amplitude=|A|=3.",4),
    mc("sin(0°)=",["1","0","−1","0,5"],1,"sin(0°)=0.",5),
    fb("Die Periode von f(x)=sin(x) beträgt ___ Grad oder ___ Radiant.",["360","2π"],"Volle Umdrehung.",6),
  ],
},
{
  id:"cur-mathe-12-ableitung-erw", subject:"mathematik", grade:12, order:2,
  title:"Ableitungsanwendungen", description:"Monotonie, Extrema, Wendepunkte — Kurvendiskussion.",
  lesson:"## Kurvendiskussion\n\n**Extremstellen:** f'(x)=0 und f''(x)≠0\n- f''(x) < 0 → Maximum\n- f''(x) > 0 → Minimum\n\n**Wendepunkte:** f''(x)=0 und f'''(x)≠0\n\n**Monotonie:**\n- f'(x) > 0 → streng monoton steigend\n- f'(x) < 0 → streng monoton fallend",
  questions:[
    mc("f'(x)=0 und f''(x)<0 → ?",["Minimum","Maximum","Wendepunkt","Sattelpunkt"],1,"Negatives zweites Ableitungszeichen = lokales Maximum.",1),
    fb("f(x)=x³-3x: f'(x)=___",["3x²−3"],"Potenzregel: 3x²-3.",2),
    tf("Ist f''(x)>0 bei einem kritischen Punkt, liegt ein Minimum vor.",true,"Positive zweite Ableitung → Minimalstelle.",3),
    fb("Wendepunkte haben f''(x)=___",["0"],"Zweite Ableitung verschwindet.",4),
    mc("f(x)=x² hat bei x=0:",["Ein Maximum","Einen Wendepunkt","Ein Minimum","Keine Extremstelle"],2,"f'(0)=0, f''(0)=2>0 → Minimum.",5),
    fb("f'(x)=6x²−6x. Kritische Punkte: x=___ und x=___",["0","1"],"6x(x-1)=0.",6),
  ],
},
{
  id:"cur-mathe-13-integral-erw", subject:"mathematik", grade:13, order:2,
  title:"Integralrechnung — Flächeninhalt und Anwendungen", description:"Bestimmtes Integral, Stammfunktion, Fläche zwischen Kurven.",
  lesson:"## Integralanwendungen\n\n**Fläche unter Kurve:** A = ∫[a→b] f(x) dx (wenn f(x)≥0)\n\n**Fläche zwischen Kurven:** A = ∫[a→b] |f(x)-g(x)| dx\n\n**Mittelwert:** f̄ = (1/(b-a)) · ∫[a→b] f(x) dx\n\n**Stammfunktionen:**\n- ∫xⁿ dx = xⁿ⁺¹/(n+1)\n- ∫eˣ dx = eˣ\n- ∫sin(x) dx = -cos(x)",
  questions:[
    fb("∫eˣ dx = ___",["eˣ + C"],"Exponentialfunktion ist Stammfunktion von sich selbst.",1),
    mc("∫₀¹ x² dx = ?",["1/3","1/2","1","2/3"],0,"[x³/3]₀¹=1/3.",2),
    fb("∫sin(x) dx = ___",["−cos(x) + C"],"Ableitung von -cos(x) ist sin(x).",3),
    tf("Das bestimmte Integral kann negativ sein.",true,"Wenn f(x)<0, ist das Integral negativ.",4),
    fb("Fläche unter f(x)=2 von x=0 bis x=5 ist ___",["10"],"Rechteck: 2×5=10.",5),
    mc("∫[0→π] sin(x) dx = ?",["0","2","−2","π"],1,"[-cos(x)]₀ᵖⁱ=-cos(π)+cos(0)=1+1=2.",6),
  ],
},

// ══════════════════════════════════════════════════════
// DEUTSCH — mehr Themen
// ══════════════════════════════════════════════════════
{
  id:"cur-deutsch-8-stilmittel", subject:"deutsch", grade:8, order:2,
  title:"Stilmittel und sprachliche Gestaltung", description:"Metapher, Vergleich, Personifikation, Alliteration, Anapher.",
  lesson:"## Stilmittel\n\n| Mittel | Erklärung | Beispiel |\n|--------|-----------|----------|\n| Metapher | Bildhafte Übertragung | 'Er ist ein Löwe' |\n| Vergleich | mit 'wie' | 'stark wie ein Löwe' |\n| Personifikation | Mensch. Eigenschaft | 'Der Wind flüstert' |\n| Alliteration | gleicher Anlaut | 'Milch macht müde Männer munter' |\n| Anapher | Wiederholung am Anfang | 'Ich will... Ich werde...' |\n| Hyperbel | Übertreibung | 'tausend Mal gesagt' |",
  questions:[
    mc("'Das Leben ist eine Reise' — welches Stilmittel?",["Vergleich","Metapher","Personifikation","Alliteration"],1,"Metapher: kein 'wie', direkte Übertragung.",1),
    tf("Ein Vergleich verwendet immer das Wort 'wie'.",true,"'Stark wie ein Löwe' — der Vergleich nutzt 'wie'.",2),
    fb("'Der Herbst weint goldene Blätter' ist ein Beispiel für eine ___.",["Personifikation"],"Der Herbst erhält menschliche Eigenschaft (weinen).",3),
    mc("'Fischers Fritz fischt frische Fische' ist:",["Metapher","Anapher","Alliteration","Hyperbel"],2,"Gleicher Anlaut F → Alliteration.",4),
    fb("Eine Übertreibung als Stilmittel heißt ___.",["Hyperbel"],"Hyperbel = Übertreibung.",5),
    mc("'Ich habe das dir tausend Mal gesagt!' ist:",["Personifikation","Metapher","Hyperbel","Antithese"],2,"Tausend Mal → offensichtliche Übertreibung = Hyperbel.",6),
  ],
},
{
  id:"cur-deutsch-6-wortschatz", subject:"deutsch", grade:6, order:2,
  title:"Fremdwörter und Wortschatz erweitern", description:"Fremdwörter erkennen, Vorsilben und Wortfamilien.",
  lesson:"## Wortschatz\n\n**Vorsilben verändern die Bedeutung:**\n- un- → Verneinung: unglücklich\n- ver- → Veränderung: verbessern\n- mis- → falsch: missverstehen\n\n**Fremdwörter aus dem Lateinischen/Griechischen:**\n- bio = Leben (Biologie)\n- geo = Erde (Geografie)\n- auto = selbst (Automobil)\n- tele = fern (Telefon)",
  questions:[
    mc("Was bedeutet die Vorsilbe 'un-'?",["zusammen","groß","nicht/gegen","besonders"],2,"un-glücklich, un-möglich → Verneinung.",1),
    fb("'tele' kommt aus dem Griechischen und bedeutet ___.",["fern"],"Telefon = Fernklang, Teleskop = Fernsehen.",2),
    tf("'bio' bedeutet 'Leben'.",true,"Biologie = Wissenschaft vom Leben.",3),
    mc("Welches Wort enthält die Wurzel 'geo' (Erde)?",["Biologie","Geographie","Telefon","Autobahn"],1,"Geo-graphie = Erdbeschreibung.",4),
    fb("'auto' bedeutet ___.",["selbst"],"Autobiografie = Selbstbeschreibung des Lebens.",5),
    mc("Was ist eine Wortfamilie?",["Wörter mit gleichem Klang","Wörter mit gleicher Herkunft/Stamm","Zufällig ähnliche Wörter","Alle Nomen"],1,"Wortfamilien teilen einen Wortstamm: fahren, Fahrt, Fahrer.",6),
  ],
},
{
  id:"cur-deutsch-11-kafka", subject:"deutsch", grade:11, order:2,
  title:"Kafka und die Moderne", description:"Franz Kafka, absurde Literatur, 'Die Verwandlung'.",
  lesson:"## Franz Kafka (1883–1924)\n\n**Merkmale Kafka'scher Literatur:**\n- Das Absurde als normal dargestellt\n- Bürokratie und Entfremdung\n- Ängste und Hilflosigkeit\n- Traumhaft-logische Handlung\n\n**'Die Verwandlung' (1915):** Gregor Samsa erwacht als riesiges Ungeziefer. Familie reagiert mit Entfremdung.\n\n**Interpretation:** Entfremdung durch Arbeit, Vereinsamung des modernen Menschen",
  questions:[
    mc("Wer ist die Hauptfigur in Kafkas 'Die Verwandlung'?",["Josef K.","Gregor Samsa","Georg Bendemann","Karl Rossmann"],1,"Gregor Samsa verwandelt sich in ein Ungeziefer.",1),
    tf("Kafkas Werke wurden größtenteils erst nach seinem Tod veröffentlicht.",true,"Kafka wollte die meisten Werke vernichten; sein Freund Max Brod rettete sie.",2),
    fb("Das zentrale Thema in Kafkas Werk ist die ___ des modernen Menschen.",["Entfremdung"],"Entfremdung durch Bürokratie, Arbeit, Familie.",3),
    mc("Welches Merkmal ist NICHT typisch für Kafka?",["Das Absurde","Bürokratie","Romantische Liebe","Hilflosigkeit des Individuums"],2,"Romantische Liebe ist kein Kafka-Merkmal.",4),
    fb("Kafkas bekanntestes unvollendetes Werk heißt 'Der ___'.",["Prozess","Process"],"Josef K. wird verhaftet, ohne den Grund zu kennen.",5),
    mc("In welchem Jahr wurde 'Die Verwandlung' veröffentlicht?",["1905","1915","1924","1933"],1,"1915 erschien 'Die Verwandlung'.",6),
  ],
},
{
  id:"cur-deutsch-10-medien", subject:"deutsch", grade:10, order:2,
  title:"Medienkritik und Informationskompetenz", description:"Nachrichten analysieren, Fake News erkennen, Quellenkritik.",
  lesson:"## Medienkompetenz\n\n**Quellenkritik:**\n- Wer ist der Absender?\n- Welches Interesse hat er?\n- Gibt es Belege?\n\n**Fake News erkennen:**\n1. Quelle prüfen\n2. Andere Quellen vergleichen\n3. Bilder rückwärts suchen\n4. Datum prüfen\n\n**Meinungsartikel vs. Bericht:** Bericht = Fakten; Meinung = Wertungen\n\n**Echo-Kammer:** Algorithmen zeigen nur Inhalte, die Meinung bestätigen",
  questions:[
    mc("Was prüft man zuerst bei einer verdächtigen Nachricht?",["Die Anzahl der Likes","Die Quelle und den Absender","Das Design der Webseite","Wie viele Personen es geteilt haben"],1,"Quellenkritik: Wer schreibt das und warum?",1),
    tf("Ein Nachrichtenbericht sollte keine Wertungen enthalten.",true,"Berichte berichten Fakten; Meinungen sind klar als solche zu kennzeichnen.",2),
    fb("Wenn Algorithmen nur Inhalte zeigen, die unsere Meinung bestätigen, entsteht eine ___-Kammer.",["Echo"],"Echo-Kammer = Meinungsverstärkung durch selektive Informationen.",3),
    mc("Was ist eine zuverlässige Methode um Fake-Bilder zu entlarven?",["Dem Bauchgefühl vertrauen","Rückwärts-Bildersuche","Anzahl der Shares zählen","Nur Bilder von Freunden glauben"],1,"Google Lens / TinEye: Original-Quelle des Bildes finden.",4),
    fb("Ein Artikel, der klar die Meinung des Autors enthält, heißt ___.",["Kommentar","Meinungsartikel"],"Kommentar/Leitartikel = Meinungsformat.",5),
    mc("'Echo-Kammer' bedeutet:",["Schlechte Akustik in Räumen","Man hört nur Meinungen, die die eigene bestätigen","Lauteres Sprechen im Internet","Mehrere Medien berichten gleichzeitig"],1,"Algorithmen filtern: Man sieht, was man sehen will.",6),
  ],
},

// ══════════════════════════════════════════════════════
// ENGLISCH — mehr Themen
// ══════════════════════════════════════════════════════
{
  id:"cur-englisch-6-places", subject:"englisch", grade:6, order:2,
  title:"Places in Town — Prepositions of Place", description:"Ortsbeschreibungen, Präpositionen, Wegbeschreibung.",
  lesson:"## Places and Prepositions\n\n**Places:** bank, post office, supermarket, cinema, park, hospital, school, library\n\n**Prepositions of place:**\n- next to = neben\n- opposite = gegenüber\n- between = zwischen\n- behind = hinter\n- in front of = vor\n- at the corner of = an der Ecke von\n\n**Directions:** turn left/right, go straight on, take the first/second street",
  questions:[
    mc("Where can you borrow books?",["cinema","library","supermarket","bank"],1,"Library = Bibliothek/Bücherei.",1),
    fb("The school is ___ the park. (between the bank and the park)",["opposite","next to"],"Context dependent; 'next to' = neben, 'opposite' = gegenüber.",2),
    tf("'Behind' means 'vor' in German.",false,"Behind = hinter; 'vor' = in front of.",3),
    mc("What does 'turn left' mean?",["Geradeaus gehen","Links abbiegen","Rechts abbiegen","Umdrehen"],1,"turn left = links abbiegen.",4),
    fb("The cinema is ___ the corner of Oak Street and Main Road.",["at"],"'at the corner of' = an der Ecke von.",5),
    mc("You want to buy food. Where do you go?",["Library","Hospital","Supermarket","Post office"],2,"Supermarket = Supermarkt, wo man Essen kauft.",6),
  ],
},
{
  id:"cur-englisch-8-passive", subject:"englisch", grade:8, order:2,
  title:"Passive Voice", description:"Passiv in verschiedenen Zeitformen bilden und verwenden.",
  lesson:"## Passive Voice\n\n**Bildung:** to be (in der richtigen Zeit) + past participle\n\n| Zeitform | Aktiv | Passiv |\n|----------|-------|--------|\n| Present | They make it. | It is made. |\n| Past | They made it. | It was made. |\n| Future | They will make it. | It will be made. |\n| Present Perfect | They have made it. | It has been made. |\n\n**Verwendung:** Wenn der Handelnde unwichtig oder unbekannt ist.",
  questions:[
    mc("'The car is repaired' is in which tense?",["Past Simple","Present Perfect","Present Simple Passive","Future Passive"],2,"is + past participle = Present Simple Passive.",1),
    fb("Active: 'They built the bridge in 1905.' → Passive: 'The bridge ___ ___ in 1905.'",["was","built"],"Past Passive: was + past participle.",2),
    tf("In the passive, the subject is the one doing the action.",false,"Im Passiv ist das Subjekt der Empfänger der Handlung, nicht der Handelnde.",3),
    mc("'The letter has been written.' = which tense?",["Present Simple","Past Simple","Present Perfect Passive","Future Passive"],2,"has been + p.p. = Present Perfect Passive.",4),
    fb("'Will + be + p.p.' bildet das ___ Passiv.",["Future","Futur"],"Future Passive: will be made.",5),
    mc("Why do we use the passive?",["To make sentences shorter","When the agent is unknown or unimportant","To sound informal","To describe feelings"],1,"Passiv verwendet man, wenn der Handelnde unwichtig oder unbekannt ist.",6),
  ],
},
{
  id:"cur-englisch-10-discussion", subject:"englisch", grade:10, order:2,
  title:"Discussion Skills — Agreeing & Disagreeing", description:"Meinungen ausdrücken, zustimmen und widersprechen auf Englisch.",
  lesson:"## Discussion Language\n\n**Agreeing:**\n- I completely agree with you.\n- That's a good point.\n- Exactly! / Absolutely!\n\n**Disagreeing politely:**\n- I see your point, but...\n- I'm afraid I disagree because...\n- That may be true, however...\n\n**Giving opinion:**\n- In my opinion / view...\n- As far as I'm concerned...\n- I believe / think / feel that...\n\n**Asking for opinion:**\n- What do you think about...?\n- How do you feel about...?",
  questions:[
    mc("Which phrase is used to politely disagree?",["Absolutely!","Exactly!","I see your point, but...","That's a great idea!"],2,"Politely disagreeing: acknowledge, then counter.",1),
    tf("'In my opinion' introduces a personal view.",true,"Opinion phrases signal personal perspective.",2),
    fb("'I ___ I disagree' — fill in for polite disagreement.",["'m afraid","am afraid"],"'I'm afraid I disagree' = höflicher Widerspruch.",3),
    mc("To ask someone's opinion, you say:",["I believe that...","What do you think about...?","As far as I'm concerned...","I completely agree!"],1,"Asking opinion: 'What do you think/feel about...?'",4),
    fb("'___ as I'm concerned, social media has negative effects.' = Start an opinion.",["As far"],"'As far as I'm concerned' = soweit es mich betrifft.",5),
    mc("'That's a good point' expresses:",["Disagreement","Surprise","Agreement","Uncertainty"],0,"'That's a good point' = Zustimmung, Anerkennung.",6),
  ],
},
{
  id:"cur-englisch-13-literary", subject:"englisch", grade:13, order:2,
  title:"Literary Analysis — Shakespeare", description:"Shakespeares Sprache, Werke, historischer Kontext.",
  lesson:"## Shakespeare (1564–1616)\n\n**Major Works:**\n- Tragedies: Hamlet, Macbeth, Romeo and Juliet, King Lear\n- Comedies: A Midsummer Night's Dream, Much Ado About Nothing\n- Histories: Richard III, Henry V\n\n**Language features:**\n- Iambic pentameter: 10 syllables per line\n- Soliloquy: character speaks alone to reveal thoughts\n- Aside: spoken to audience, unheard by other characters\n\n**Context:** Elizabethan era, Globe Theatre, London",
  questions:[
    mc("'To be or not to be' is from which play?",["Macbeth","King Lear","Hamlet","Romeo and Juliet"],2,"Hamlet's famous soliloquy.",1),
    tf("Shakespeare wrote only tragedies.",false,"Er schrieb Tragödien, Komödien und Historiendramen.",2),
    fb("A speech delivered alone on stage is called a ___.",["soliloquy"],"Soliloquy = Monolog, bei dem der Charakter allein spricht.",3),
    mc("Iambic pentameter has how many syllables per line?",["8","10","12","14"],1,"10 Silben: da-DUM da-DUM da-DUM da-DUM da-DUM.",4),
    fb("Shakespeare's theatre in London was called the ___ Theatre.",["Globe"],"Das Globe Theatre, erbaut 1599.",5),
    mc("Which is a Shakespearean comedy?",["Hamlet","Macbeth","A Midsummer Night's Dream","King Lear"],2,"A Midsummer Night's Dream = Komödie.",6),
  ],
},

// ══════════════════════════════════════════════════════
// PHYSIK — mehr Themen
// ══════════════════════════════════════════════════════
{
  id:"cur-physik-8-mechanik2", subject:"physik", grade:8, order:2,
  title:"Arbeit, Leistung und Wirkungsgrad", description:"W=F·s, P=W/t, η=Pnutz/Pges.",
  lesson:"## Arbeit und Leistung\n\n**Mechanische Arbeit:** W = F · s\n(F = Kraft in N, s = Weg in m, W = Arbeit in J)\n\n**Leistung:** P = W/t\n(W = Arbeit in J, t = Zeit in s, P = Leistung in W)\n\n**Wirkungsgrad:** η = Pnutz / Pgesamt\nη = 1 (100%) ist ideal — nie erreichbar!\n\n**Beispiel:** F=100N, s=5m → W=500J\nIn t=10s → P=50W",
  questions:[
    fb("W = F · s. F=200N, s=3m → W=___ J",["600"],"200×3=600 J.",1),
    mc("Leistung P hat die Einheit:",["Joule","Newton","Watt","Pascal"],2,"Leistung in Watt (W).",2),
    tf("Ein Wirkungsgrad von 1 (100%) ist in der Realität erreichbar.",false,"Immer gibt es Verluste (Reibung, Wärme) → η < 1.",3),
    fb("P=W/t. W=1000J, t=5s → P=___ W",["200"],"1000/5=200 W.",4),
    mc("Was ist mechanische Arbeit?",["Kraft mal Geschwindigkeit","Kraft mal Zeit","Kraft mal Weg","Masse mal Geschwindigkeit"],2,"W=F·s.",5),
    fb("η=Pnutz/Pgesamt. Wenn η=0,8 und Pgesamt=100W, dann Pnutz=___ W",["80"],"0,8×100=80 W.",6),
  ],
},
{
  id:"cur-physik-9-optik2", subject:"physik", grade:9, order:3,
  title:"Brechung und Linsen", description:"Snellius'sches Brechungsgesetz, Sammel- und Zerstreuungslinse.",
  lesson:"## Brechung\n\n**Snellius:** n₁·sin(α₁) = n₂·sin(α₂)\n\nLicht bricht, wenn es von einem Medium ins andere übergeht.\n\n**Totalreflexion:** Tritt auf, wenn Licht vom dichteren ins dünnere Medium und der Winkel groß genug ist.\n\n**Sammellinse (konvex):** Bündelt Lichtstrahlen → f positiv\n\n**Zerstreuungslinse (konkav):** Streut Lichtstrahlen → f negativ\n\n**Abbildungsgesetz:** 1/f = 1/g + 1/b",
  questions:[
    mc("Was passiert beim Übergang von Luft zu Glas?",["Licht wird schneller","Licht wird langsamer und bricht zum Lot hin","Licht wird abgelenkt weg vom Lot","Nichts ändert sich"],1,"n_Glas > n_Luft → Licht wird verlangsamt und zum Lot hin gebrochen.",1),
    tf("Eine konvexe Linse ist eine Sammellinse.",true,"Konvex = nach außen gewölbt = sammelt Strahlen.",2),
    fb("Eine Zerstreuungslinse hat eine ___ Brennweite.",["negative"],"Konkave Linse: f < 0.",3),
    mc("Wo wird Totalreflexion genutzt?",["Brille","Lichtleiter/Glasfaser","Autofenster","Spiegel"],1,"Glasfaserkabel: Licht wird total reflektiert.",4),
    fb("Abbildungsgesetz: 1/f = 1/g + ___",["1/b"],"Bildweite b und Gegenstandsweite g.",5),
    mc("Was ist die Brennweite f?",["Abstand Linse-Gegenstand","Abstand Linse-Bild bei parallelem Einfall","Dicke der Linse","Brechungsindex"],1,"Parallele Strahlen werden im Brennpunkt F gesammelt.",6),
  ],
},
{
  id:"cur-physik-12-elektromagnet", subject:"physik", grade:12, order:2,
  title:"Elektromagnetische Induktion", description:"Faraday'sches Gesetz, Lenz'sche Regel, Generator.",
  lesson:"## Induktion\n\n**Faraday:** U_ind = -N · ΔΦ/Δt\n(U_ind = Induktionsspannung, N = Windungszahl, Φ = Magnetischer Fluss)\n\n**Lenz'sche Regel:** Der Induktionsstrom erzeugt ein Magnetfeld, das seiner Ursache entgegenwirkt.\n\n**Generator:** Mechanische Rotation → elektrische Spannung\n**Transformator:** Änderung von Wechselspannung durch Induktion",
  questions:[
    fb("Faraday: U_ind = -N · ΔΦ / ___",["Δt"],"Zeitliche Änderung des Flusses.",1),
    mc("Was sagt die Lenz'sche Regel?",["Induktionsstrom fließt immer in Uhrzeigerrichtung","Induktionsstrom wirkt seiner Ursache entgegen","Induktionsstrom hängt von der Frequenz ab","Induktionsstrom ist immer gleich groß"],1,"Lenz: Wirkung = Gegenreaktion.",2),
    tf("Ein Generator wandelt elektrische in mechanische Energie um.",false,"Umgekehrt: mechanisch → elektrisch. (Motor = elektrisch → mechanisch)",3),
    fb("Ein Transformator ändert die ___ einer Wechselspannung.",["Stärke","Größe"],"Transformator erhöht oder erniedrigt Wechselspannung.",4),
    mc("Wovon hängt die Induktionsspannung ab?",["Resistenz","Zeitliche Änderung des Magnetflusses","Temperatur","Farbe der Spule"],1,"U∝ΔΦ/Δt.",5),
    fb("N=100 Windungen, ΔΦ=0,01 Wb in Δt=0,1s → U_ind = ___V (Betrag)",["10"],"U=N·ΔΦ/Δt=100·0,01/0,1=10V.",6),
  ],
},

// ══════════════════════════════════════════════════════
// CHEMIE — mehr Themen
// ══════════════════════════════════════════════════════
{
  id:"cur-chemie-6-stoffe", subject:"chemie", grade:6, order:2,
  title:"Reinstoffe und Gemische", description:"Element, Verbindung, Gemisch, Trennverfahren.",
  lesson:"## Stoffe\n\n**Reinstoff:** Nur eine Substanz (Wasser, Gold, O₂)\n\n**Gemisch:** Mehrere Stoffe gemischt:\n- Homogen (gleichmäßig): Salzwasser, Legierung\n- Heterogen (ungleichmäßig): Granit, Milch\n\n**Trennverfahren:**\n| Gemisch | Trennmethode |\n|---------|-------------|\n| Salzwasser | Destillation / Verdampfen |\n| Sand+Wasser | Filtrieren |\n| Öl+Wasser | Scheiden |\n| Gemisch fester Stoffe | Sieben |\n| Farbige Tinte | Chromatographie |",
  questions:[
    mc("Welches ist ein Reinstoff?",["Salzwasser","Milch","Destilliertes Wasser","Granite"],2,"Destilliertes Wasser = nur H₂O → Reinstoff.",1),
    tf("Salzwasser ist ein homogenes Gemisch.",true,"Gleichmäßig verteilt → homogen.",2),
    fb("Sand + Wasser wird durch ___ getrennt.",["Filtrieren"],"Filter: Sand bleibt zurück, Wasser geht durch.",3),
    mc("Welche Trennmethode trennt zwei Flüssigkeiten mit unterschiedlichem Siedepunkt?",["Filtrieren","Sieben","Destillation","Chromatographie"],2,"Destillation trennt Flüssigkeiten nach Siedepunkt.",4),
    fb("Chromatographie trennt Gemische anhand der unterschiedlichen ___ der Stoffe.",["Löslichkeit","Wanderungsgeschwindigkeit"],"Stoffe wandern unterschiedlich weit in der Trennphase.",5),
    mc("Granit ist:",["Ein Reinstoff","Ein homogenes Gemisch","Ein heterogenes Gemisch","Eine chemische Verbindung"],2,"Granit: verschiedene sichtbare Mineralien → heterogen.",6),
  ],
},
{
  id:"cur-chemie-12-reaktionskinetik", subject:"chemie", grade:12, order:2,
  title:"Reaktionskinetik und Gleichgewicht", description:"Reaktionsgeschwindigkeit, Le Chatelier, Aktivierungsenergie.",
  lesson:"## Reaktionskinetik\n\n**Reaktionsgeschwindigkeit:** Konzentrations-Δ pro Zeit\n\n**Einflüsse auf Reaktionsgeschwindigkeit:**\n- Konzentration (mehr → schneller)\n- Temperatur (höher → schneller; RGT-Regel: +10°C → 2-4× schneller)\n- Katalysator (senkt Aktivierungsenergie)\n- Oberfläche (größer → schneller)\n\n**Chemisches Gleichgewicht:** Hin- und Rückreaktion gleich schnell\n\n**Le Chatelier:** Bei Störung verschiebt sich das GGW in Richtung, die die Störung aufhebt.",
  questions:[
    mc("Was senkt die Aktivierungsenergie?",["Erhöhung der Konzentration","Katalysator","Druck","Kühlung"],1,"Katalysatoren senken Ea und beschleunigen die Reaktion.",1),
    tf("Die RGT-Regel besagt: +10°C → Reaktion etwa doppelt so schnell.",true,"RGT-Regel: Reaktionsgeschwindigkeits-Temperatur-Regel.",2),
    fb("Beim chemischen Gleichgewicht sind Hin- und Rückreaktion gleich ___.",["schnell"],"Gleichgewicht = dynamisch, beide Seiten gleich schnell.",3),
    mc("Le Chatelier: Man erhöht den Druck. Das Gleichgewicht verschiebt sich:",["Zur Seite mit mehr Gasmolekülen","Zur Seite mit weniger Gasmolekülen","Nicht","Nur nach rechts"],1,"Mehr Druck → GGW minimiert Druck = Richtung weniger Mol.",4),
    fb("Je größer die Oberfläche, desto ___ ist die Reaktionsgeschwindigkeit.",["größer","schneller"],"Mehr Kontaktfläche = mehr Reaktionsmöglichkeiten.",5),
    mc("Was ist Aktivierungsenergie?",["Energie die freigesetzt wird","Mindestenergie, um eine Reaktion zu starten","Energie des Produktes","Gleichgewichtsenergie"],1,"Aktivierungsenergie = benötigte Startenergie.",6),
  ],
},

// ══════════════════════════════════════════════════════
// BIOLOGIE — mehr Themen
// ══════════════════════════════════════════════════════
{
  id:"cur-biologie-6-fotosynthese", subject:"biologie", grade:6, order:2,
  title:"Fotosynthese und Zellatmung", description:"6CO₂+6H₂O→C₆H₁₂O₆+6O₂, Gegenreaktion, Chloroplasten.",
  lesson:"## Fotosynthese\n\n**Gleichung:** 6 CO₂ + 6 H₂O → C₆H₁₂O₆ + 6 O₂\n(Licht + Chlorophyll notwendig)\n\n**Ort:** Chloroplasten\n\n**Zellatmung (Gegenreaktion):** C₆H₁₂O₆ + 6 O₂ → 6 CO₂ + 6 H₂O + Energie\nOrt: Mitochondrien\n\n**Merke:** Fotosynthese = Energie speichern; Zellatmung = Energie freisetzen",
  questions:[
    fb("Fotosynthese-Gleichung: 6CO₂ + 6H₂O → C₆H₁₂O₆ + ___",["6O₂"],"Sauerstoff wird als Nebenprodukt freigesetzt.",1),
    mc("Wo findet Fotosynthese statt?",["Mitochondrien","Zellkern","Chloroplasten","Ribosome"],2,"Chloroplasten enthalten das Chlorophyll.",2),
    tf("Zellatmung läuft nur bei Pflanzen ab.",false,"Alle lebenden Organismen betreiben Zellatmung.",3),
    fb("Bei der Zellatmung wird ___ freigesetzt.",["Energie","ATP"],"Energie (ATP) wird für Lebensprozesse bereitgestellt.",4),
    mc("Was wird bei der Fotosynthese verbraucht?",["Sauerstoff und Glucose","Kohlendioxid und Wasser","Nur Wasser","Nur Licht"],1,"Edukte: CO₂ + H₂O.",5),
    fb("Licht wird durch den Farbstoff ___ in Chloroplasten absorbiert.",["Chlorophyll"],"Chlorophyll gibt Pflanzen ihre grüne Farbe.",6),
  ],
},
{
  id:"cur-biologie-11-hormone", subject:"biologie", grade:11, order:2,
  title:"Hormonsystem", description:"Endokrines System, Insulin, Adrenalin, Regelkreise.",
  lesson:"## Hormonsystem\n\n**Hormone:** Chemische Botenstoffe im Blut\n\n**Wichtige Drüsen:**\n- Hypophyse: 'Schaltzentrale' (steuert andere Drüsen)\n- Schilddrüse: Stoffwechsel (Thyroxin)\n- Bauchspeicheldrüse: Blutzucker (Insulin, Glucagon)\n- Nebennierenmark: Stress (Adrenalin)\n\n**Regelkreis Blutzucker:**\nBlutzucker ↑ → Insulin ↑ → Zellen nehmen Glucose auf → Blutzucker ↓\n\n**Diabetes:** Insulin-Mangel (Typ 1) oder Insulin-Resistenz (Typ 2)",
  questions:[
    mc("Welches Hormon senkt den Blutzucker?",["Glucagon","Adrenalin","Insulin","Thyroxin"],2,"Insulin: Zellen nehmen Glucose auf → Blutzucker sinkt.",1),
    tf("Adrenalin wird in Stresssituationen ausgeschüttet.",true,"'Kampf oder Flucht' → Nebennierenmark schüttet Adrenalin aus.",2),
    fb("Die Hypophyse heißt auch ___-Drüse, weil sie andere Drüsen steuert.",["Hirnanhangs","Schaltzentral"],"Hypophyse steuert viele andere endokrine Drüsen.",3),
    mc("Typ-1-Diabetes entsteht durch:",["Zu viel Insulin","Insulin-Resistenz der Zellen","Zerstörung der Insulin-produzierenden Zellen","Zu wenig Glucagon"],2,"Typ 1: Autoimmunerkrankung, β-Zellen der Bauchspeicheldrüse werden zerstört.",4),
    fb("Thyroxin wird von der ___ produziert.",["Schilddrüse"],"Schilddrüse regelt den Grundstoffwechsel.",5),
    mc("Ein Regelkreis im Körper hat immer:",["Nur Sensoren","Sensor, Regler und Efflektor","Nur Hormone","Nur Nerven"],1,"Regelkreis = Sensor (messen) + Regler (verarbeiten) + Effektor (handeln).",6),
  ],
},
{
  id:"cur-biologie-4-sinne", subject:"biologie", grade:4, order:1,
  title:"Die fünf Sinne", description:"Sehen, Hören, Riechen, Schmecken, Fühlen — Sinnesorgane.",
  lesson:"## Unsere Sinne\n\n| Sinn | Organ | Reiz |\n|------|-------|------|\n| Sehen | Auge | Licht |\n| Hören | Ohr | Schall |\n| Riechen | Nase | Gerüche |\n| Schmecken | Zunge | Geschmacksstoffe |\n| Fühlen | Haut | Druck, Temperatur |\n\n**Gehirn:** Verarbeitet alle Sinneseindrücke",
  questions:[
    mc("Welches Organ ist für das Sehen zuständig?",["Nase","Ohr","Auge","Zunge"],2,"Das Auge reagiert auf Lichtreize.",1),
    fb("Das Ohr nimmt ___ wahr.",["Schall","Töne","Geräusche"],"Schallwellen werden im Ohr in Nervensignale umgewandelt.",2),
    tf("Die Haut kann nur Schmerz wahrnehmen.",false,"Die Haut nimmt Druck, Temperatur, Schmerz und Berührung wahr.",3),
    mc("Welcher Sinn ist der Zunge zugeordnet?",["Riechen","Hören","Schmecken","Fühlen"],2,"Zunge = Geschmacksorgan.",4),
    fb("Alle Sinneseindrücke werden im ___ verarbeitet.",["Gehirn"],"Das Gehirn ist die Schaltzentrale.",5),
    mc("Welches Sinnesorgan reagiert auf Gerüche?",["Auge","Ohr","Nase","Haut"],2,"Die Nase enthält Riechrezeptoren.",6),
  ],
},

// ══════════════════════════════════════════════════════
// GESCHICHTE — mehr Themen
// ══════════════════════════════════════════════════════
{
  id:"cur-geschichte-4-aegypten", subject:"geschichte", grade:4, order:1,
  title:"Altes Ägypten", description:"Pharaonen, Pyramiden, Nil, Hieroglyphen.",
  lesson:"## Altes Ägypten\n\n**Zeitraum:** ca. 3000–30 v. Chr.\n\n**Pharaon:** Gottgleicher Herrscher, König\n\n**Nil:** Lebensader Ägyptens — überschwemmt jährlich und hinterlässt fruchtbaren Schlamm\n\n**Pyramiden:** Grabstätten der Pharaonen\n**Sphinx:** Wächterfigur\n\n**Hieroglyphen:** Schriftsystem mit Bildsymbolen\n\n**Bedeutende Pharaonen:** Ramses II, Tutanchamun, Kleopatra",
  questions:[
    mc("Was war der Pharao?",["Ein Gott","Ein König-Gott/gottgleicher Herrscher","Ein Priester","Ein Soldat"],1,"Pharaonen galten als Götter auf Erden.",1),
    fb("Der ___ war der wichtigste Fluss Ägyptens und machte die Landwirtschaft möglich.",["Nil"],"Nil: jährliche Überschwemmung brachte Fruchtbarkeit.",2),
    tf("Die Pyramiden dienten als Tempel für Gottesdienste.",false,"Pyramiden waren Grabstätten (Mausoleen) für Pharaonen.",3),
    mc("Was sind Hieroglyphen?",["Geheimzeichen der Priester","Ägyptische Schrift mit Bildsymbolen","Wandgemälde","Mathematische Zeichen"],1,"Hieroglyphen = Bilderschrift des Alten Ägyptens.",4),
    fb("Eines der bekanntesten Grabmäler der Welt sind die ___ von Gizeh.",["Pyramiden"],"Die Pyramiden von Gizeh gehören zu den 7 Weltwundern.",5),
    mc("Welcher Pharao ist besonders bekannt?",["Alexander der Große","Napoleon","Ramses II.","Julius Caesar"],2,"Ramses II. regierte ca. 1279–1213 v. Chr.",6),
  ],
},
{
  id:"cur-geschichte-12-weimarer", subject:"geschichte", grade:12, order:2,
  title:"Weimarer Republik und Aufstieg der NSDAP", description:"1919–1933: Entstehung, Krisen, Ende der ersten deutschen Demokratie.",
  lesson:"## Weimarer Republik (1919–1933)\n\n**Entstehung:** Nach dem 1. Weltkrieg, Novemberrevolution 1918\n**Verfassung:** 1919 in Weimar verabschiedet\n\n**Krisen:**\n- Hyperinflation 1923\n- Weltwirtschaftskrise ab 1929\n- Politische Instabilität\n\n**Aufstieg der NSDAP:**\n- 1933: Hitler zum Reichskanzler ernannt\n- Ermächtigungsgesetz: Aushebelung der Demokratie\n\n**Ende:** 30. Januar 1933 — Hitlers Ernennung zum Reichskanzler",
  questions:[
    fb("Die Weimarer Republik endete am ___ Januar 1933.",["30"],"30.1.1933: Hitler wird Reichskanzler.",1),
    mc("Was war die Hyperinflation 1923?",["Zu viel Produktion","Extreme Geldentwertung","Bankrott des Staates","Überproduktion von Waren"],1,"1923: Brot kostete Milliarden Mark.",2),
    tf("Das Ermächtigungsgesetz von 1933 gab Hitler diktatorische Vollmachten.",true,"Das Ermächtigungsgesetz ermöglichte Gesetze ohne Parlamentszustimmung.",3),
    mc("In welcher Stadt wurde die Weimarer Verfassung verabschiedet?",["Berlin","München","Hamburg","Weimar"],3,"Wegen Unruhen in Berlin tagten die Abgeordneten in Weimar.",4),
    fb("Die Weltwirtschaftskrise begann mit dem New Yorker Börsencrash im Jahr ___.",["1929"],"1929: 'Schwarzer Freitag' — Beginn der Weltwirtschaftskrise.",5),
    mc("Wie viele Wahlperioden hatte die Weimarer Republik?",["5","8","14","20"],2,"Viele kurzlebige Regierungen — ca. 14 Kanzler in 14 Jahren.",6),
  ],
},

// ══════════════════════════════════════════════════════
// INFORMATIK — Python, JavaScript, mehr
// ══════════════════════════════════════════════════════
{
  id:"cur-informatik-5-grundlagen", subject:"informatik", grade:5, order:1,
  title:"Computer und Betriebssystem", description:"Hardware, Software, Betriebssystem, Eingabe/Ausgabe.",
  lesson:"## Computer-Grundlagen\n\n**Hardware:** Physische Bauteile\n- CPU (Prozessor): 'Gehirn'\n- RAM: Arbeitsspeicher (temporär)\n- Festplatte/SSD: permanenter Speicher\n- Monitor, Tastatur, Maus\n\n**Software:** Programme\n- Betriebssystem (Windows, macOS, Linux)\n- Anwendungen (Word, Chrome, Spiele)\n\n**Eingabe → Verarbeitung → Ausgabe**",
  questions:[
    mc("Was ist die CPU?",["Der Bildschirm","Der Arbeitsspeicher","Der Prozessor (Rechenwerk)","Die Festplatte"],2,"CPU = Central Processing Unit = Prozessor.",1),
    fb("Temporäre Daten werden im ___ gespeichert.",["RAM","Arbeitsspeicher"],"RAM verschwindet beim Ausschalten.",2),
    tf("Eine Festplatte speichert Daten dauerhaft.",true,"Festplatte/SSD = permanenter Speicher.",3),
    mc("Was ist ein Betriebssystem?",["Ein Spiel","Software die Hardware verwaltet","Hardware","Ein Browser"],1,"Windows/macOS/Linux sind Betriebssysteme.",4),
    fb("Das EVA-Prinzip steht für ___, Verarbeitung, Ausgabe.",["Eingabe"],"Eingabe → Verarbeitung → Ausgabe.",5),
    mc("Was ist Hardware?",["Programme","Physische Bauteile des Computers","Das Internet","Ein Betriebssystem"],1,"Hardware = greifbare Komponenten.",6),
  ],
},
{
  id:"cur-informatik-12-python", subject:"informatik", grade:12, order:2,
  title:"Python — Funktionen, Listen, Dictionaries", description:"Funktionen definieren, Listen und Wörterbücher in Python.",
  lesson:"## Python Fortgeschritten\n\n**Funktionen:**\n```python\ndef berechne(x, y):\n    return x + y\n```\n\n**Listen:**\n```python\nzahlen = [1, 2, 3, 4, 5]\nzahlen.append(6)   # hinzufügen\nzahlen[0]          # = 1\nlen(zahlen)        # = 6\n```\n\n**Dictionaries:**\n```python\nperson = {'name': 'Max', 'alter': 16}\nperson['name']   # 'Max'\n```\n\n**List Comprehension:**\n```python\nquadrate = [x**2 for x in range(5)]\n# [0, 1, 4, 9, 16]\n```",
  questions:[
    fb("def add(a,b):\\n    return ___",["a + b"],"Die Funktion gibt die Summe zurück.",1),
    mc("Was macht zahlen.append(7)?",["Löscht 7","Sortiert die Liste","Fügt 7 am Ende hinzu","Gibt Länge zurück"],2,"append() fügt am Ende ein.",2),
    tf("person['name'] greift auf den Wert mit Schlüssel 'name' zu.",true,"Dictionary-Zugriff über Schlüssel.",3),
    fb("len([1,2,3,4]) = ___",["4"],"len() gibt die Länge der Liste zurück.",4),
    mc("Was ist [x**2 for x in range(3)]?",["[0,1,2]","[0,1,4]","[1,4,9]","[1,2,4]"],1,"range(3)=[0,1,2]; 0²=0, 1²=1, 2²=4.",5),
    fb("Um auf dict={\"a\":1} zuzugreifen: dict[___] = 1",["\"a\"","'a'"],"Schlüssel 'a' gibt den Wert 1.",6),
  ],
},
{
  id:"cur-informatik-12-javascript", subject:"informatik", grade:12, order:3,
  title:"JavaScript Grundlagen", description:"DOM-Manipulation, Events, async/await.",
  lesson:"## JavaScript\n\n**DOM-Manipulation:**\n```js\ndocument.getElementById('id').textContent = 'Hallo';\ndocument.querySelector('.klasse').style.color = 'red';\n```\n\n**Events:**\n```js\ndocument.getElementById('btn').addEventListener('click', () => {\n    console.log('Geklickt!');\n});\n```\n\n**Fetch API:**\n```js\nconst data = await fetch('https://api.example.com/data');\nconst json = await data.json();\n```",
  questions:[
    fb("document.getElementById('x').textContent = ___",["'Text'","\"Text\""],"Setzt den Textinhalt des Elements.",1),
    mc("Was macht addEventListener('click', fn)?",["Entfernt den Listener","Führt fn sofort aus","Reagiert auf Klick-Ereignisse","Löscht das Element"],2,"EventListener reagiert wenn das Ereignis auftritt.",2),
    tf("'async/await' ist eine Methode für asynchrone Programmierung.",true,"async/await = syntaktischer Zucker für Promises.",3),
    fb("Um ein Element per Klassen-Selektor zu finden: document.___('.meineKlasse')",["querySelector"],"querySelector('.klasse') = erstes Element mit dieser Klasse.",4),
    mc("Was gibt JSON.parse('{\"a\":1}') zurück?",["String","Objekt","Array","Undefined"],1,"JSON.parse konvertiert JSON-String zu JS-Objekt.",5),
    fb("console.___ ('Test') schreibt in die Browser-Konsole.",["log"],"console.log() für Debugging-Ausgaben.",6),
  ],
},

// ══════════════════════════════════════════════════════
// NEU: GEOGRAFIE
// ══════════════════════════════════════════════════════
{
  id:"cur-geo-5-erdkunde", subject:"geografie", grade:5, order:1,
  title:"Orientierung auf der Erde", description:"Kontinente, Ozeane, Koordinatensystem, Himmelsrichtungen.",
  lesson:"## Orientierung\n\n**7 Kontinente:** Europa, Asien, Afrika, Nordamerika, Südamerika, Australien, Antarktis\n\n**5 Ozeane:** Pazifik, Atlantik, Indik, Arktis, Antarktis\n\n**Koordinatensystem:**\n- Breitengrade (Parallelen): 0°–90° N/S\n- Längengrade (Meridiane): 0°–180° E/W\n- Äquator: 0° Breite\n- Nullmeridian: 0° Länge (Greenwich)\n\n**Himmelsrichtungen:** Nord, Süd, Ost, West",
  questions:[
    mc("Wie viele Kontinente gibt es?",["5","6","7","8"],2,"7 Kontinente.",1),
    fb("Der Äquator liegt bei ___ Grad Breite.",["0"],"Äquator = 0° Breitengrad.",2),
    tf("Europa ist der größte Kontinent.",false,"Asien ist der größte Kontinent.",3),
    mc("Welcher ist der größte Ozean?",["Atlantik","Indik","Pazifik","Arktis"],2,"Pazifik = größter Ozean.",4),
    fb("Der Nullmeridian verläuft durch ___.",["Greenwich"],"0° Längengrad = Royal Observatory Greenwich, London.",5),
    mc("In welche Richtung liegt die Sonne um 12 Uhr in Deutschland?",["Norden","Osten","Süden","Westen"],2,"Deutschland: nördliche Hemisphäre → Sonne im Süden.",6),
  ],
},
{
  id:"cur-geo-6-klima", subject:"geografie", grade:6, order:1,
  title:"Klimazonen der Erde", description:"Tropen, gemäßigte Zone, polare Zone — Merkmale und Verbreitung.",
  lesson:"## Klimazonen\n\n| Zone | Lage | Merkmale |\n|------|------|-----------|\n| Tropen | 0°–23,5° | Heiß, feucht, immer grün |\n| Subtropen | 23,5°–40° | Heiß und trocken oder mediterran |\n| Gemäßigte Zone | 40°–60° | 4 Jahreszeiten |\n| Kaltgemäßigt | 60°–70° | Kurze Sommer, kalte Winter |\n| Polare Zone | 70°–90° | Eisig, kaum Vegetation |\n\n**Deutschland** liegt in der gemäßigten Zone.",
  questions:[
    mc("In welcher Klimazone liegt Deutschland?",["Tropen","Subtropen","Gemäßigte Zone","Polarzone"],2,"Deutschland: 47–55°N → gemäßigte Zone.",1),
    fb("Der Regenwald liegt in den ___.",["Tropen"],"Tropischer Regenwald: 0°–23,5°.",2),
    tf("In der Polarzone gibt es kaum Vegetation.",true,"Zu kalt und trocken für Pflanzenwachstum.",3),
    mc("Welche Klimazone hat 4 deutlich verschiedene Jahreszeiten?",["Tropen","Gemäßigte Zone","Polarzone","Subtropen"],1,"4 Jahreszeiten = Merkmal der gemäßigten Zone.",4),
    fb("Die heißeste Zone der Erde heißt die ___.",["Tropen"],"Tropen = heiße Zone um den Äquator.",5),
    mc("Was charakterisiert die Subtropen?",["Immer Schnee","Trocken oder mediterran, sehr warm","4 Jahreszeiten","Immer Regen"],1,"Subtropen: heiße Sommer, mediterrane oder Wüstenbedingungen.",6),
  ],
},
{
  id:"cur-geo-7-deutschland", subject:"geografie", grade:7, order:1,
  title:"Deutschland — Landschaften und Bundesländer", description:"16 Bundesländer, Naturräume, wichtige Flüsse und Städte.",
  lesson:"## Deutschland\n\n**16 Bundesländer:** Baden-Württemberg, Bayern, Berlin, Brandenburg, Bremen, Hamburg, Hessen, MV, Niedersachsen, NRW, RP, Saarland, Sachsen, Sachsen-Anhalt, SH, Thüringen\n\n**Naturräume (von N→S):**\n1. Norddeutsches Tiefland\n2. Mittelgebirge (Harz, Schwarzwald, Eifel)\n3. Alpenvorland\n4. Alpen (Zugspitze 2962m)\n\n**Wichtige Flüsse:** Rhein, Elbe, Donau, Oder, Weser",
  questions:[
    mc("Wie viele Bundesländer hat Deutschland?",["12","14","16","18"],2,"16 Bundesländer seit der Wiedervereinigung 1990.",1),
    fb("Deutschlands höchster Berg ist die ___ mit 2962m.",["Zugspitze"],"Zugspitze in Bayern, Teil der Alpen.",2),
    mc("Welcher Fluss durchquert Deutschland von Süd nach Nord?",["Donau","Rhein","Oder","Elbe"],1,"Rhein: Alpen → Nordsee.",3),
    tf("Das Norddeutsche Tiefland liegt südlich der Mittelgebirge.",false,"Tiefland liegt im NORDEN, Mittelgebirge darunter, Alpen im Süden.",4),
    fb("Der Schwarzwald liegt im Bundesland ___.",["Baden-Württemberg"],"Schwarzwald: südwestliches Bundesland.",5),
    mc("Welche Stadt ist die Hauptstadt Deutschlands?",["Hamburg","München","Frankfurt","Berlin"],3,"Berlin ist seit 1990 wieder die Hauptstadt.",6),
  ],
},

// ══════════════════════════════════════════════════════
// NEU: WIRTSCHAFT / SOZIALKUNDE
// ══════════════════════════════════════════════════════
{
  id:"cur-wirt-9-wirtschaft", subject:"wirtschaft", grade:9, order:1,
  title:"Grundbegriffe der Wirtschaft", description:"Angebot und Nachfrage, Marktgleichgewicht, BIP.",
  lesson:"## Wirtschaft Grundlagen\n\n**Angebot und Nachfrage:**\n- Preis steigt → Nachfrage sinkt, Angebot steigt\n- Preis sinkt → Nachfrage steigt, Angebot sinkt\n- **Gleichgewichtspreis:** Angebot = Nachfrage\n\n**BIP (Bruttoinlandsprodukt):** Wert aller Güter und Dienstleistungen eines Landes in einem Jahr\n\n**Inflation:** Allgemeiner Anstieg des Preisniveaus\n**Deflation:** Allgemeiner Rückgang der Preise",
  questions:[
    mc("Was passiert mit der Nachfrage, wenn der Preis steigt?",["Steigt auch","Bleibt gleich","Sinkt","Ist unberechenbar"],2,"Gesetz der Nachfrage: Preis↑ → Nachfrage↓.",1),
    fb("Am Gleichgewichtspreis sind Angebot und Nachfrage ___.",["gleich","ausgeglichen"],"Gleichgewicht: Markt räumt sich.",2),
    tf("Inflation bedeutet, dass das allgemeine Preisniveau steigt.",true,"Inflation = Kaufkraft des Geldes sinkt.",3),
    mc("Was misst das BIP?",["Den Gewinn der Unternehmen","Den Wert aller produzierten Güter und Dienstleistungen","Die Staatsausgaben","Den Wert der Importe"],1,"BIP = alle im Inland erzeugten Leistungen.",4),
    fb("Wenn das Angebot größer als die Nachfrage ist, sinkt der ___.",["Preis"],"Überschussangebot → Preissenkung.",5),
    mc("Was versteht man unter Deflation?",["Steigende Preise","Sinkende Preise","Gleichbleibende Preise","Hohe Arbeitslosigkeit"],1,"Deflation = Preise sinken → Nachfrage verschoben.",6),
  ],
},
{
  id:"cur-wirt-10-geld", subject:"wirtschaft", grade:10, order:1,
  title:"Geldsystem und Banken", description:"Entstehung des Geldes, Zentralbank, Kredit, Zinsen.",
  lesson:"## Geldsystem\n\n**Funktionen des Geldes:**\n- Tauschmittel\n- Recheneinheit\n- Wertspeicher\n\n**Zentralbank (EZB in Europa):**\n- Gibt Geld heraus\n- Steuert Leitzins\n- Kontrolliert Inflation\n\n**Kredit:** Geliehenes Geld\n**Zinsen:** 'Preis' für geliehenes Geld\n\n**Leitzins:** Zins zu dem Geschäftsbanken von der EZB leihen\n- Leitzins hoch → Kredite teurer → weniger Konsum → Inflation sinkt",
  questions:[
    mc("Was ist KEINE Funktion des Geldes?",["Tauschmittel","Recheneinheit","Produktionsmittel","Wertspeicher"],2,"Produktionsmittel (Maschinen, Boden) ist keine Geldfunktion.",1),
    fb("Die Europäische Zentralbank heißt ___.",["EZB"],"EZB = Europäische Zentralbank, Sitz in Frankfurt.",2),
    tf("Wenn der Leitzins steigt, werden Kredite teurer.",true,"Geschäftsbanken geben höheren Zinssatz an Kunden weiter.",3),
    mc("Was sind Zinsen?",["Steuern auf Geld","Preis für geliehenes Geld","Staatliche Subventionen","Bankgebühren"],1,"Zinsen = Kosten für die Nutzung von fremdem Kapital.",4),
    fb("Wenn der Leitzins erhöht wird, sinkt die ___ weil Kredite teurer werden.",["Inflation","Kreditvergabe"],"Teurer Kredit → weniger Konsum → Preise steigen langsamer.",5),
    mc("Wer hat das Recht, Euro-Banknoten auszugeben?",["Jede Geschäftsbank","Die EZB","Der Staat","Das Finanzministerium"],1,"EZB hat das Monopol auf Euro-Ausgabe.",6),
  ],
},

// ══════════════════════════════════════════════════════
// NEU: MUSIK
// ══════════════════════════════════════════════════════
{
  id:"cur-musik-6-notenl", subject:"musik", grade:6, order:1,
  title:"Notenlesen Grundlagen", description:"Noten, Pausenzeichen, Notenschlüssel, Takt.",
  lesson:"## Musik-Theorie\n\n**Notenlinien:** 5 Linien im Notensystem\n**Notenschlüssel:** Violinschlüssel (G-Schlüssel) = übliche Tonhöhe\n\n**Noten von unten (Violinschlüssel):**\nLinien: E-G-H-D-F (Eselsbrücke: **E**in **G**utor **H**und **D**arf **F**leisch)\nZwischenräume: F-A-C-E\n\n**Notenwerte:**\n| Note | Wert |\n|------|------|\n| Ganze | 4 Schläge |\n| Halbe | 2 Schläge |\n| Viertel | 1 Schlag |\n| Achtel | 1/2 Schlag |",
  questions:[
    mc("Wie viele Linien hat ein Notensystem?",["3","4","5","6"],2,"5 Notenlinien.",1),
    fb("Eine ganze Note hat ___ Schläge.",["4"],"Ganze Note = 4 Viertelschläge.",2),
    tf("Eine halbe Note hat 2 Schläge.",true,"Halbe Note = 2 Schläge.",3),
    mc("Welcher Schlüssel wird am häufigsten verwendet?",["Bassschlüssel","Violinschlüssel","Altschlüssel","Sopranschlüssel"],1,"Violinschlüssel (G-Schlüssel) = Standard.",4),
    fb("Die Notenlinien von unten im Violinschlüssel: E-G-H-D-___",["F"],"E-G-H-D-F: Ein Guter Hund Darf Fleisch.",5),
    mc("Eine Viertel-Note hat:",["4 Schläge","2 Schläge","1 Schlag","1/2 Schlag"],2,"Viertel = 1 Schlag.",6),
  ],
},

// ══════════════════════════════════════════════════════
// ENGLISCH — Vocabulary by topic
// ══════════════════════════════════════════════════════
{
  id:"cur-englisch-7-health", subject:"englisch", grade:7, order:2,
  title:"Health and Body", description:"Körperteile, Krankheiten, Arztbesuch auf Englisch.",
  lesson:"## Health Vocabulary\n\n**Body Parts:** head, shoulder, arm, elbow, wrist, hand, fingers, chest, stomach, back, leg, knee, ankle, foot\n\n**Illnesses:** headache, stomachache, cold, flu, fever, cough, sore throat\n\n**At the doctor:**\n- What's wrong? / What seems to be the problem?\n- I have a headache. / I feel sick.\n- You should rest and drink plenty of water.\n- Take this medicine three times a day.",
  questions:[
    mc("'I have a headache' means:",["Ich habe Bauchweh","Ich habe Kopfschmerzen","Ich bin krank","Ich habe Fieber"],1,"headache = Kopfschmerzen.",1),
    fb("Das Knie auf Englisch heißt ___.",["knee"],"knee = Knie.",2),
    tf("'Fever' means 'Fieber' in German.",true,"fever = Fieber.",3),
    mc("At the doctor, what does 'What seems to be the problem?' mean?",["Wie heißen Sie?","Was ist das Problem?","Wie alt sind Sie?","Haben Sie Krankenversicherung?"],1,"Arzt fragt nach dem Beschwerdegrund.",4),
    fb("'I feel sick' bedeutet: Ich ___ mich krank.",["fühle"],"to feel = fühlen.",5),
    mc("'Sore throat' means:",["Magenverstimmung","Kopfschmerzen","Halsschmerzen","Husten"],2,"sore throat = Halsschmerzen.",6),
  ],
},
{
  id:"cur-englisch-8-environment", subject:"englisch", grade:8, order:3,
  title:"Environment and Climate Change", description:"Umwelt-Vokabular, Climate Change auf Englisch diskutieren.",
  lesson:"## Environment\n\n**Key Vocabulary:**\n- climate change / global warming\n- pollution (air, water, plastic)\n- renewable energy (solar, wind, hydro)\n- fossil fuels (coal, oil, gas)\n- deforestation / reforestation\n- carbon footprint\n- sustainable / sustainability\n- endangered species\n\n**Phrases:**\n- We need to reduce our carbon footprint.\n- Renewable energy is the key to a sustainable future.\n- Deforestation threatens biodiversity.",
  questions:[
    mc("What is 'renewable energy'?",["Energie aus Kohle","Energie aus erneuerbaren Quellen wie Sonne/Wind","Atomenergie","Öl und Gas"],1,"Renewable = erneuerbar, z.B. Solar, Wind.",1),
    fb("'Carbon footprint' means der ___ eines Menschen.",["CO2-Fußabdruck","Kohlenstoff-Fußabdruck"],"Kohlenstoff-Fußabdruck = CO₂-Ausstoß einer Person/Organisation.",2),
    tf("'Deforestation' means planting new trees.",false,"Deforestation = Abholzung. Reforestation = Wiederaufforstung.",3),
    mc("What are 'fossil fuels'?",["Solar energy","Coal, oil and gas","Wind power","Nuclear energy"],1,"Fossil fuels = Kohle, Öl und Erdgas.",4),
    fb("'___ species' are animals in danger of dying out.",["Endangered"],"Endangered species = bedrohte Tierarten.",5),
    mc("What does 'sustainable' mean?",["Teuer","Umweltschädlich","Nachhaltig","Schnell"],2,"Sustainable = nachhaltig.",6),
  ],
},

// ══════════════════════════════════════════════════════
// MATHEMATIK — Stochastik Klasse 6/7
// ══════════════════════════════════════════════════════
{
  id:"cur-mathe-6-statistik", subject:"mathematik", grade:6, order:3,
  title:"Statistik — Mittelwert, Median, Modalwert", description:"Häufigkeiten, Durchschnitt, Median und Modalwert berechnen.",
  lesson:"## Statistik Grundlagen\n\n**Mittelwert (Durchschnitt):** Summe aller Werte / Anzahl\n\n**Median:** Mittlerer Wert nach Sortierung\n- Gerade Anzahl: Durchschnitt der zwei mittleren Werte\n\n**Modalwert (Modus):** Häufigster Wert\n\nBeispiel: 2, 5, 3, 5, 7\n- Sortiert: 2, 3, 5, 5, 7\n- Mittelwert: (2+3+5+5+7)/5 = 22/5 = 4,4\n- Median: 5 (mittlerer Wert)\n- Modalwert: 5 (kommt 2× vor)",
  questions:[
    fb("Mittelwert von 2,4,6,8,10 = ___",["6"],"(2+4+6+8+10)/5=30/5=6.",1),
    mc("Modalwert von: 3,5,3,7,5,3,9 ist:",["5","7","3","9"],2,"3 kommt 3× vor → Modalwert.",2),
    tf("Der Median ist immer gleich dem Mittelwert.",false,"Median = mittlerer Wert; Mittelwert = Durchschnitt — können verschieden sein.",3),
    fb("Median von: 1,3,5,7,9 = ___",["5"],"Mittlerer Wert der sortierten Reihe: 5.",4),
    mc("Bei einer geraden Anzahl von Werten ist der Median:",["Der größte Wert","Der Durchschnitt der zwei mittleren Werte","Der häufigste Wert","Der kleinste Wert"],1,"Gerade Anzahl: 2 mittlere Werte → Durchschnitt.",5),
    fb("Median von 2,4,6,8 = ___",["5"],"Mittlere zwei: 4 und 6 → (4+6)/2=5.",6),
  ],
},

// ══════════════════════════════════════════════════════
// NEU: SPORT / THEORIE
// ══════════════════════════════════════════════════════
{
  id:"cur-sport-8-ausdauer", subject:"sport", grade:8, order:1,
  title:"Ausdauertraining und Herzfrequenz", description:"Trainingsformen, Herzfrequenzzonen, Erholungspuls.",
  lesson:"## Ausdauertraining\n\n**Herzfrequenz-Zonen:**\n- Ruhepuls Erwachsener: 60–80 Schläge/min\n- Maximalpuls: ca. 220 - Alter\n- Fettverbrennungszone: 60–70% HFmax\n- Ausdauerzone: 70–80% HFmax\n- Leistungszone: 80–90% HFmax\n\n**Trainingsformen:**\n- Dauermethode: konstantes Tempo (Laufen 30 min)\n- Intervallmethode: Belastung + Erholung abwechselnd\n- Wiederholungsmethode: Vollständige Erholung zwischen Belastungen\n\n**Trainingsprinzip:** Superkompensation",
  questions:[
    fb("Maximalpuls = 220 − ___",["Alter"],"Faustformel: HFmax = 220 − Lebensalter.",1),
    mc("Was ist die Dauermethode?",["Kurze intensive Sprints","Konstantes Tempo über längere Zeit","Gewichtheben","Pause zwischen Sätzen"],1,"Dauermethode = kontinuierliche Belastung ohne Pausen.",2),
    tf("In der Fettverbrennungszone trainiert man bei 60–70% der Maximalpulses.",true,"60–70% HFmax = Fettverbrennungszone.",3),
    fb("Ein 16-jähriger hat einen Maximalpuls von ca. ___ Schlägen/min.",["204"],"220 − 16 = 204.",4),
    mc("Was bedeutet Superkompensation?",["Erschöpfung nach dem Sport","Körper wird nach Belastung stärker als zuvor","Verletzung durch Übertraining","Schnelle Erholung"],1,"Superkompensation: Körper passt sich an und wird leistungsfähiger.",5),
    mc("Die Intervallmethode wechselt:",["Zwischen verschiedenen Sportarten","Belastung und aktive Erholung","Laufen und Schwimmen","Training und Schlaf"],1,"Intervall = gezielte Belastungsphasen mit Erholungspausen.",6),
  ],
},

// ══════════════════════════════════════════════════════
// PHYSIK — Thermodynamik Klasse 11
// ══════════════════════════════════════════════════════
{
  id:"cur-physik-11-thermo", subject:"physik", grade:11, order:2,
  title:"Thermodynamik — Wärmelehre", description:"Wärmekapazität, Wärmeübertragung, Hauptsätze der Thermodynamik.",
  lesson:"## Thermodynamik\n\n**Innere Energie U:** Summe aller Teilchenenergien\n\n**1. Hauptsatz:** Energie bleibt erhalten: ΔU = Q + W\n(Q = Wärmezufuhr, W = Arbeit)\n\n**Wärmekapazität:** Q = m · c · ΔT\n(c_Wasser = 4186 J/(kg·K))\n\n**Wärmeübertragung:**\n- Wärmeleitung: in Festkörpern\n- Konvektion: in Flüssigkeiten/Gasen\n- Strahlung: auch im Vakuum (Sonne!)\n\n**2. Hauptsatz:** Wärme fließt spontan nur von warm nach kalt",
  questions:[
    fb("1. Hauptsatz: ΔU = Q + ___",["W"],"Innere Energie = Wärme + Arbeit.",1),
    mc("Was ist Konvektion?",["Wärmeleitung in Metallen","Wärmeübertragung durch Strahlung","Wärmetransport durch Strömung","Wärme im Vakuum"],2,"Konvektion: Wärmetransport durch Materie-Bewegung.",2),
    tf("Wärmestrahlung braucht ein Medium.",false,"Strahlung (z.B. Sonnenlicht) breitet sich auch im Vakuum aus.",3),
    fb("Q = m · c · ΔT. m=2kg, c=4186 J/(kgK), ΔT=10K → Q=___ J",["83720"],"2×4186×10=83720 J.",4),
    mc("Der 2. Hauptsatz sagt:",["Energie ist endlich","Wärme fließt spontan von kalt nach warm","Wärme fließt spontan von warm nach kalt","Energie kann erzeugt werden"],2,"2. HS: Spontane Wärmeübertragung nur von höherer zu niedrigerer Temperatur.",5),
    mc("Welche Wärmeübertragung findet auch in Festkörpern statt?",["Konvektion","Strahlung","Wärmeleitung","Alle gleich"],2,"Wärmeleitung (Konduktion) = Festkörper.",6),
  ],
},

// ══════════════════════════════════════════════════════
// CHEMIE Klasse 5/6 — Aggregatzustände
// ══════════════════════════════════════════════════════
{
  id:"cur-chemie-5-aggregat", subject:"chemie", grade:5, order:1,
  title:"Aggregatzustände und Zustandsänderungen", description:"Fest, flüssig, gasförmig — Schmelzen, Sieden, Kondensieren.",
  lesson:"## Aggregatzustände\n\n**3 Zustände:**\n- **Fest:** Teilchen dicht gepackt, schwingen nur\n- **Flüssig:** Teilchen bewegen sich frei, Abstand etwas größer\n- **Gasförmig:** Teilchen sehr weit auseinander, hohe Bewegung\n\n**Zustandsänderungen:**\n| Übergang | Name | Energie |\n|----------|------|----------|\n| fest→flüssig | Schmelzen | wird aufgenommen |\n| flüssig→gasförmig | Verdampfen/Sieden | wird aufgenommen |\n| gasförmig→flüssig | Kondensieren | wird abgegeben |\n| flüssig→fest | Erstarren | wird abgegeben |",
  questions:[
    mc("Was passiert beim Schmelzen?",["Fest wird gasförmig","Flüssig wird fest","Fest wird flüssig","Gas wird fest"],2,"Schmelzen: fest → flüssig.",1),
    fb("Beim Verdampfen geht Flüssigkeit in den ___ Zustand über.",["gasförmigen","Gas-"],"Flüssig → gasförmig = Verdampfen.",2),
    tf("Beim Kondensieren gibt der Stoff Energie ab.",true,"Gasförmig → flüssig = Kondensation, Energie wird frei.",3),
    mc("In welchem Aggregatzustand haben Teilchen den größten Abstand voneinander?",["Fest","Flüssig","Gasförmig","Plasma"],2,"Gas: Teilchen sehr weit auseinander.",4),
    fb("Wasser siedet bei ___ °C.",["100"],"Siedepunkt von Wasser: 100°C bei Normaldruck.",5),
    mc("Was ist der Übergang von flüssig zu fest?",["Schmelzen","Sieden","Erstarren","Kondensieren"],2,"Flüssig → fest = Erstarren/Gefrieren.",6),
  ],
},

// ══════════════════════════════════════════════════════
// BIOLOGIE — Klasse 3/4
// ══════════════════════════════════════════════════════
{
  id:"cur-biologie-3-jahreszeiten", subject:"biologie", grade:3, order:1,
  title:"Pflanzen und Tiere im Jahreslauf", description:"Sommer, Herbst, Winter, Frühling — Anpassungen der Natur.",
  lesson:"## Jahreszeiten in der Natur\n\n**Frühling:** Pflanzen erwachen, Tiere bekommen Junges\n**Sommer:** Alles blüht und wächst, lange Tage\n**Herbst:** Blätter fallen, Tiere bereiten sich vor\n**Winter:** Viele Pflanzen schlafen (Winterruhe), Tiere:\n- **Winterschlaf:** Igel, Murmeltier (sehr tief, kaum Herzschlag)\n- **Winterruhe:** Bär (leichter Schlaf)\n- **Zugvögel:** Schwalben fliegen in den Süden\n- **Winterkälter:** Fuchs bleibt aktiv",
  questions:[
    mc("Was ist der Unterschied zwischen Winterschlaf und Winterruhe?",["Kein Unterschied","Winterschlaf ist tiefer, kaum Herzschlag","Winterruhe ist tiefer","Winterschlaf dauert kürzer"],1,"Winterschlaf (Igel): sehr tief. Winterruhe (Bär): leichter.",1),
    fb("Schwalben sind ___, die im Winter nach Süden fliegen.",["Zugvögel"],"Zugvögel verlassen im Herbst Deutschland.",2),
    tf("Im Frühling bekommen die meisten Tiere ihre Jungen.",true,"Frühling = Wärme, Nahrung → günstig für Junges.",3),
    mc("Welches Tier hält echten Winterschlaf?",["Bär","Fuchs","Igel","Hase"],2,"Igel = echter Winterschläfer.",4),
    fb("Im ___ fallen die Blätter der Laubbäume.",["Herbst"],"Herbstfärbung und Blattfall.",5),
    mc("Warum verlässt der Laubbaum im Herbst seine Blätter?",["Weil es schön aussieht","Wasser zu sparen und Frost zu überleben","Um schneller zu wachsen","Wegen der Sonne"],1,"Blätter = Wasserverlust; im Winter zu wenig Wasser verfügbar.",6),
  ],
},

// ══════════════════════════════════════════════════════
// HISTOIRE — Antike bis Neuzeit komplett
// ══════════════════════════════════════════════════════
{
  id:"cur-geschichte-4-urgeschichte", subject:"geschichte", grade:4, order:1,
  title:"Steinzeit und Vorgeschichte", description:"Altsteinzeit, Jungsteinzeit, Sesshaftigkeit, Werkzeuge.",
  lesson:"## Vorgeschichte\n\n**Altsteinzeit** (ca. 2,5 Mio – 10.000 v. Chr.):\n- Nomaden, Jäger und Sammler\n- Werkzeuge aus Stein und Knochen\n- Höhlenmalerei (Lascaux)\n\n**Jungsteinzeit** (ca. 10.000 – 2.000 v. Chr.):\n- **Sesshaftwerdung:** Menschen werden zu Bauern\n- Ackerbau und Viehzucht\n- Erste Dörfer\n- Keramik\n\n**Bronzezeit:** Metallbearbeitung beginnt",
  questions:[
    mc("Was ist ein Nomade?",["Ein Bauer","Ein Mensch ohne festen Wohnsitz","Ein Händler","Ein Priester"],1,"Nomaden ziehen umher, folgen der Beute.",1),
    fb("In der Jungsteinzeit begannen Menschen mit ___ und Viehzucht.",["Ackerbau"],"Sesshaftigkeit: Ackerbau + Viehzucht.",2),
    tf("Die ältesten Höhlenzeichnungen wurden in der Jungsteinzeit gemalt.",false,"Höhlenmalerei (Lascaux) stammt aus der ALTSTEINZEIT.",3),
    mc("Was folgte nach der Jungsteinzeit?",["Eiszeit","Bronzezeit","Steinzeit","Neuzeit"],1,"Bronzezeit: Metalle wurden bearbeitet.",4),
    fb("In der Altsteinzeit lebten Menschen als Jäger und ___.",["Sammler"],"Jäger und Sammler = typisch für Altsteinzeit.",5),
    mc("Was bedeutet 'sesshaft werden'?",["Viel sitzen","An einem Ort bleiben und Landwirtschaft betreiben","Größere Gemeinschaft gründen","Mehr Tiere jagen"],1,"Sesshaftwerdung = permanente Siedlung, Landwirtschaft.",6),
  ],
},

// ══════════════════════════════════════════════════════
// INFORMATIK — Binärsystem und Datenstrukturen
// ══════════════════════════════════════════════════════
{
  id:"cur-informatik-7-binaer", subject:"informatik", grade:7, order:2,
  title:"Binärsystem und Datendarstellung", description:"Bit, Byte, Binärzahlen, Umrechnung.",
  lesson:"## Binärsystem\n\n**Bit:** Kleinste Dateneinheit (0 oder 1)\n**Byte:** 8 Bit\n\n**Einheiten:**\n- 1 Kilobyte (KB) = 1.024 Byte\n- 1 Megabyte (MB) = 1.024 KB\n- 1 Gigabyte (GB) = 1.024 MB\n\n**Binär → Dezimal:**\n1011₂ = 1·8 + 0·4 + 1·2 + 1·1 = 11₁₀\n\n**Dezimal → Binär:**\n13 = 8+4+1 = 1101₂",
  questions:[
    fb("1 Byte = ___ Bit",["8"],"8 Bit = 1 Byte.",1),
    mc("Was ist 1010₂ in Dezimal?",["8","10","12","6"],1,"1·8+0·4+1·2+0·1=10.",2),
    tf("1 Kilobyte = 1000 Byte.",false,"1 KB = 1024 Byte (2¹⁰).",3),
    fb("13 in Binär = ___",["1101"],"8+4+1=13 → 1101.",4),
    mc("1 Gigabyte = ?",["1000 MB","1024 MB","512 MB","2048 MB"],1,"1 GB = 1024 MB.",5),
    fb("Das binäre System basiert auf der Basis ___.",["2"],"Binär = Basis 2 (Ziffern 0 und 1).",6),
  ],
},

// ══════════════════════════════════════════════════════
// ENGLISCH — Writing Skills
// ══════════════════════════════════════════════════════
{
  id:"cur-englisch-11-writing", subject:"englisch", grade:11, order:3,
  title:"Essay Writing in English", description:"Aufbau, Argumentation, Kohärenz im englischen Essay.",
  lesson:"## Essay Writing\n\n**Structure:**\n1. Introduction: Hook + Background + Thesis\n2. Body (3 paragraphs): Topic sentence + Evidence + Comment\n3. Conclusion: Restate thesis + Broader implications\n\n**Useful phrases:**\n- **Adding:** Furthermore, Moreover, In addition\n- **Contrasting:** However, Nevertheless, On the other hand\n- **Concluding:** In conclusion, To sum up, All things considered\n\n**Cohesion:** Use linking words to connect ideas",
  questions:[
    mc("What should the introduction contain?",["Three arguments","Hook, background and thesis","Summary of the essay","Evidence and examples"],1,"Einleitung: Aufhänger + Hintergrund + These.",1),
    tf("Each body paragraph should start with a topic sentence.",true,"Topic sentence = Hauptaussage des Absatzes.",2),
    fb("'___ conclusion, renewable energy is essential.' — Fill in.",["In"],"'In conclusion' = abschließend.",3),
    mc("'Nevertheless' is used to:",["Add information","Contrast ideas","Give examples","Conclude"],1,"Nevertheless = dennoch, einräumend-kontrastiv.",4),
    fb("'Furthermore' is used to ___ information.",["add","additional"],"Furthermore = außerdem, weiteres hinzufügen.",5),
    mc("What is a 'thesis statement'?",["A factual statement","The main argument of the essay","A quote from an expert","A definition"],1,"These = zentrale Aussage/Argument des Essays.",6),
  ],
},

// ══════════════════════════════════════════════════════
// MATHE — Wahrscheinlichkeit Klasse 7/8
// ══════════════════════════════════════════════════════
{
  id:"cur-mathe-7-wahrscheinlichkeit", subject:"mathematik", grade:7, order:4,
  title:"Wahrscheinlichkeit und Zufallsexperiment", description:"Laplace, Gegenereignis, mehrstufige Experimente.",
  lesson:"## Wahrscheinlichkeit\n\n**Laplace-Exp.:** P(A) = günstige / mögliche Ergebnisse\n\n**Gegenereignis:** P(Ā) = 1 - P(A)\n\n**Mehrstufig:**\n- UND-Regel (unabhängig): P(A∩B) = P(A) · P(B)\n- ODER-Regel (sich ausschließend): P(A∪B) = P(A) + P(B)\n\nBeispiel: Würfel, P(6) = 1/6\nZwei Würfe, P(zwei 6) = 1/6 · 1/6 = 1/36",
  questions:[
    fb("Würfeln: P(gerade Zahl) = ___",["1/2","0,5","50%"],"3 gerade (2,4,6) von 6 → 3/6=1/2.",1),
    mc("P(A) = 0,3 → P(Ā) = ?",["0,3","0,7","0,6","1,3"],1,"Gegenereignis: 1-0,3=0,7.",2),
    tf("Bei unabhängigen Ereignissen: P(A und B) = P(A) × P(B).",true,"Multiplikationsregel für unabhängige Ereignisse.",3),
    fb("P(Kopf) beim Münzwurf = ___",["1/2","0,5"],"Gleichwahrscheinlich: 1 von 2.",4),
    mc("Zwei Würfe: P(beide Male 6) = ?",["1/6","1/12","1/36","2/36"],2,"1/6 · 1/6 = 1/36.",5),
    fb("P(A) + P(B) = 1 gilt wenn A und B sich ___ ausschließen und alle Möglichkeiten abdecken.",["gegenseitig"],"Zusammen 100%: P(A)+P(Ā)=1.",6),
  ],
},

// ══════════════════════════════════════════════════════
// CHEMIE — Säure-Base Klasse 7
// ══════════════════════════════════════════════════════
{
  id:"cur-chemie-7-phwert", subject:"chemie", grade:7, order:3,
  title:"pH-Wert im Alltag", description:"pH-Skala, Indikatoren, saure und basische Alltagsstoffe.",
  lesson:"## pH-Wert\n\n**pH-Skala:** 0–14\n- 0–6: sauer (pH < 7)\n- 7: neutral\n- 8–14: basisch/alkalisch (pH > 7)\n\n**Indikatoren:** Stoffe die Farbe ändern je nach pH\n- Lackmus: rot (sauer), blau (basisch)\n- pH-Papier (Universalindikator)\n\n**Alltag:**\n| Stoff | pH |\n|-------|----|\n| Magensaft | 1-2 |\n| Essig | ~3 |\n| Kaffee | ~5 |\n| Wasser | 7 |\n| Seife | ~9-10 |\n| Natron-Lösung | ~8 |",
  questions:[
    fb("Neutral ist ein pH-Wert von ___.",["7"],"pH 7 = neutral (z.B. reines Wasser).",1),
    mc("Welche Farbe zeigt Lackmus in einer Säure?",["Blau","Grün","Rot","Gelb"],2,"Lackmus: sauer=rot, basisch=blau.",2),
    tf("Essig ist basisch.",false,"Essig hat pH~3 → sauer.",3),
    mc("Welchen pH hat Seife in der Regel?",["pH 2","pH 7","pH 9-10","pH 14"],2,"Seife ist leicht basisch, pH 9–10.",4),
    fb("Magensaft ist sehr ___ mit pH 1-2.",["sauer"],"pH 1-2 = stark sauer.",5),
    mc("Ein Universalindikator:",["Misst nur Säuren","Zeigt genauen pH durch Farbwechsel","Ändert nie die Farbe","Reagiert nur auf Laugen"],1,"Universalindikator = zeigt den gesamten pH-Bereich an.",6),
  ],
},
];

async function main() {
  console.log("Seeding MEGA curriculum…");
  let t = 0, q = 0;

  for (const topic of topics) {
    const { questions, lesson, ...data } = topic;

    await prisma.exerciseTopic.upsert({
      where: { id: topic.id },
      update: {},
      create: data,
    });

    const lessonExists = await prisma.exerciseLesson.findFirst({ where: { topicId: topic.id } });
    if (!lessonExists) {
      await prisma.exerciseLesson.create({ data: { topicId: topic.id, content: lesson, order: 1 } });
    }

    for (const question of questions) {
      const qId = `${topic.id}-q${question.order}`;
      await prisma.exerciseQuestion.upsert({
        where: { id: qId },
        update: {},
        create: { id: qId, topicId: topic.id, ...question },
      });
      q++;
    }

    t++;
    process.stdout.write(`  ✓ [${topic.subject} Kl.${topic.grade}] ${topic.title}\n`);
  }

  console.log(`\n✅ ${t} neue Themen, ${q} neue Fragen.\n`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
