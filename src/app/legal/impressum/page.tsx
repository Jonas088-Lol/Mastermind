import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Impressum",
  description: "Impressum der MasterMind GmbH gemäß § 5 TMG.",
};

export default function ImpressumPage() {
  return (
    <>
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">
          Anbieterkennzeichnung gem. § 5 TMG
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Impressum</h1>
      </header>

      <Section title="Anbieter">
        <p className="text-sm leading-relaxed">
          MasterMind GmbH
          <br />
          Maximilianstraße 35a
          <br />
          80539 München
          <br />
          Deutschland
        </p>
      </Section>

      <Section title="Vertretung">
        <p className="text-sm leading-relaxed">
          Geschäftsführung: [Name der Geschäftsführung]
          <br />
          Handelsregister: Amtsgericht München, HRB 000000
          <br />
          USt-IdNr.: DE000000000
        </p>
      </Section>

      <Section title="Kontakt">
        <ul className="space-y-1.5 text-sm">
          <li>
            E-Mail:{" "}
            <a
              href="mailto:hello@mastermind.app"
              className="underline underline-offset-2 hover:text-fg"
            >
              hello@mastermind.app
            </a>
          </li>
          <li>Support: support@mastermind.app</li>
          <li>Datenschutz: dsb@mastermind.app</li>
          <li>Telefon: +49 89 0000 0000</li>
        </ul>
      </Section>

      <Section title="Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV">
        <p className="text-sm leading-relaxed">
          [Name der Geschäftsführung], Anschrift wie oben.
        </p>
      </Section>

      <Section title="EU-Streitschlichtung">
        <p className="text-sm leading-relaxed">
          Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung
          (OS) bereit:{" "}
          <a
            href="https://ec.europa.eu/consumers/odr/"
            className="underline underline-offset-2 hover:text-fg"
          >
            https://ec.europa.eu/consumers/odr/
          </a>
          . Wir sind weder verpflichtet noch bereit, an einem Streitbeilegungs­verfahren
          vor einer Verbraucher­schlichtungs­stelle teilzunehmen.
        </p>
      </Section>

      <Section title="Haftung für Inhalte und Links">
        <p className="text-sm leading-relaxed">
          Als Diensteanbieter sind wir gem. § 7 Abs. 1 TMG für eigene Inhalte auf
          diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis
          10 TMG sind wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte
          oder gespeicherte fremde Informationen zu überwachen oder nach Umständen
          zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.
        </p>
      </Section>

      <p className="border-l-2 border-warning bg-warning/6 p-4 text-xs text-muted-fg">
        Dieses Impressum enthält Platzhalter und muss vor Inverkehrbringung mit
        den realen Firmendaten (HRB-Nummer, Geschäftsführung, USt-ID, Telefon)
        ausgefüllt und juristisch geprüft werden.
      </p>
    </>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="border-l-2 border-brand pl-4 text-lg font-bold tracking-tight">
        {title}
      </h2>
      {children}
    </section>
  );
}
