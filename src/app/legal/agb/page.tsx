import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AGB",
  description: "Allgemeine Geschäftsbedingungen der MasterMind GmbH.",
};

export default function AgbPage() {
  return (
    <>
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">
          Stand: 27. April 2026
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          Allgemeine Geschäftsbedingungen
        </h1>
        <p className="mt-3 text-sm text-muted-fg">
          Diese AGB regeln die Nutzung der MasterMind-Plattform durch Schulen,
          Lehrkräfte, Schüler:innen und Erziehungsberechtigte.
        </p>
      </header>

      <Section number="1" title="Geltungsbereich und Vertragspartner">
        <p>
          Anbieter der Plattform &bdquo;MasterMind&ldquo; ist die MasterMind GmbH, München
          (nachfolgend &bdquo;Anbieter&ldquo;). Diese Allgemeinen Geschäftsbedingungen gelten
          für sämtliche Verträge zwischen dem Anbieter und Schulen, Schulträgern,
          Bildungseinrichtungen, Lehrkräften, Schüler:innen sowie Erziehungs­be­rech­tig­ten
          über die Nutzung der Plattform und der zugehörigen Apps.
        </p>
        <p>
          Abweichende oder ergänzende Bedingungen werden nur Vertragsbestandteil,
          wenn der Anbieter ihrer Geltung ausdrücklich schriftlich zustimmt.
        </p>
      </Section>

      <Section number="2" title="Vertragsschluss und Lizenzmodell">
        <p>
          Schulen schließen einen schriftlichen Lizenzvertrag mit dem Anbieter ab.
          Der Vertrag definiert die Anzahl der Sitze, den Plan (Basic, Pro,
          Enterprise) und die Vertragslaufzeit.
        </p>
        <p>
          Einzelnutzer:innen können ein Premium-Abonnement direkt im Web
          abschließen. Der Vertrag kommt mit Bestätigung der Zahlung zustande.
          Verbraucher:innen haben ein gesetzliches Widerrufsrecht von 14 Tagen.
        </p>
      </Section>

      <Section number="3" title="Leistungen">
        <p>
          Der Anbieter stellt die Plattform mit einer Verfügbarkeit von 99,5 %
          im Jahresmittel bereit (gemessen außerhalb geplanter Wartungs­fenster).
          Wartungsarbeiten werden in der Regel außerhalb der Schulzeit
          durchgeführt und mindestens 48 Stunden vorher angekündigt.
        </p>
        <p>
          Der Funktionsumfang ergibt sich aus dem gewählten Plan und der
          jeweils aktuellen Produktbeschreibung. Der Anbieter entwickelt die
          Plattform laufend weiter; einzelne Funktionen können hinzukommen,
          geändert oder entfernt werden.
        </p>
      </Section>

      <Section number="4" title="Preise und Zahlung">
        <p>
          Schul-Lizenzen werden jährlich oder monatlich abgerechnet.
          Einzelnutzer-Abos werden monatlich oder jährlich abgebucht. Preise
          verstehen sich zzgl. der gesetzlichen Mehrwertsteuer, sofern nicht
          anders ausgewiesen.
        </p>
        <p>
          Bei Zahlungsverzug behält sich der Anbieter vor, den Zugang nach
          vorheriger Mahnung temporär einzuschränken.
        </p>
      </Section>

      <Section number="5" title="Pflichten der Nutzer:innen">
        <p>
          Nutzer:innen sind verpflichtet, ihre Zugangsdaten geheim zu halten,
          starke Passwörter zu verwenden und 2FA zu aktivieren, wo angeboten.
          Inhalte dürfen nur im Rahmen schulischer Nutzung hochgeladen werden.
          Beleidigende, strafrechtlich relevante oder rechte­verletzende
          Inhalte sind untersagt.
        </p>
        <p>
          Die KI-Funktionen sind als Lern- und Arbeitshilfe gedacht. Eine
          Letztprüfung durch Lehrkräfte ist insbesondere bei Bewertungen
          und Zeugnis­relevantem erforderlich.
        </p>
      </Section>

      <Section number="6" title="Haftung">
        <p>
          Der Anbieter haftet unbeschränkt bei Vorsatz und grober Fahrlässigkeit
          sowie bei Verletzung von Leben, Körper und Gesundheit. Bei einfacher
          Fahrlässigkeit haftet der Anbieter nur bei Verletzung wesentlicher
          Vertragspflichten und beschränkt auf den vertragstypisch vorhersehbaren
          Schaden.
        </p>
      </Section>

      <Section number="7" title="Laufzeit und Kündigung">
        <p>
          Schul-Verträge laufen über die im Lizenzvertrag vereinbarte Laufzeit
          und verlängern sich um jeweils ein Jahr, sofern nicht mit einer
          Frist von drei Monaten zum Vertragsende gekündigt wird.
          Einzelnutzer-Abos können jederzeit zum Ende des laufenden
          Abrechnungszeitraums gekündigt werden.
        </p>
      </Section>

      <Section number="8" title="Datenschutz und Auftragsverarbeitung">
        <p>
          Der Schutz personenbezogener Daten ist in der{" "}
          <a href="/legal/datenschutz" className="underline underline-offset-2 hover:text-fg">
            Datenschutzerklärung
          </a>{" "}
          geregelt. Mit Schulen wird ein Auftragsverarbeitungsvertrag (AVV)
          gemäß Art. 28 DSGVO abgeschlossen.
        </p>
      </Section>

      <Section number="9" title="Schlussbestimmungen">
        <p>
          Es gilt deutsches Recht unter Ausschluss des UN-Kaufrechts. Sofern es
          sich nicht um Verbraucher:innen handelt, ist Gerichtsstand München.
          Sollten einzelne Bestimmungen unwirksam sein, bleibt die Wirksamkeit
          der übrigen Bestimmungen unberührt.
        </p>
      </Section>

      <p className="border-l-2 border-warning bg-warning/6 p-4 text-xs text-muted-fg">
        Diese AGB sind ein erster Entwurf zur Demonstration der Plattform­struktur.
        Vor Inverkehrbringung der Plattform müssen sie von einer Rechts­anwältin
        bzw. einem Rechtsanwalt geprüft und an die konkreten Geschäfts­bedingungen
        angepasst werden.
      </p>
    </>
  );
}

function Section({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="flex items-baseline gap-3 border-l-2 border-brand pl-4 text-lg font-bold tracking-tight">
        <span className="font-mono text-xs text-muted-fg">§ {number}</span>
        <span>{title}</span>
      </h2>
      <div className="space-y-3 text-sm leading-relaxed text-fg/90">{children}</div>
    </section>
  );
}
