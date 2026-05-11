import { CheckCircle2, MapPin, Server, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Datenschutzerklärung",
  description: "Datenschutzerklärung der MasterMind GmbH gemäß DSGVO.",
};

export default function DatenschutzPage() {
  return (
    <>
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">
          Stand: 27. April 2026
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          Datenschutzerklärung
        </h1>
        <p className="mt-3 text-sm text-muted-fg">
          Wie wir personenbezogene Daten verarbeiten — vollständig konform zur DSGVO
          und dem deutschen Schul- und Sozialdaten­schutz.
        </p>
      </header>

      <section className="grid gap-px border border-border bg-border md:grid-cols-3">
        <FactTile
          icon={<MapPin className="size-4" />}
          label="Hosting"
          value="Frankfurt am Main · DE"
        />
        <FactTile
          icon={<Server className="size-4" />}
          label="Datenexport"
          value="ZIP · jederzeit · Art. 20"
        />
        <FactTile
          icon={<ShieldCheck className="size-4" />}
          label="AVV"
          value="Innerhalb 24 h · Art. 28"
        />
      </section>

      <Section number="1" title="Verantwortlicher">
        <p>
          Verantwortlich im Sinne der Datenschutz-Grundverordnung (DSGVO) ist die
          MasterMind GmbH, München. Datenschutzbeauftragte:r erreichbar unter{" "}
          <a href="mailto:dsb@mastermind.app" className="underline underline-offset-2 hover:text-fg">
            dsb@mastermind.app
          </a>
          .
        </p>
        <p>
          Im Verhältnis zu Schulen verarbeiten wir personenbezogene Daten als
          Auftragsverarbeiter gemäß Art. 28 DSGVO im Auftrag der jeweiligen Schule.
        </p>
      </Section>

      <Section number="2" title="Welche Daten wir verarbeiten">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Stammdaten:</strong> Name, E-Mail, Klasse, Rolle, Schule
          </li>
          <li>
            <strong>Lerndaten:</strong> Aufgaben, Lösungen, Noten, Fortschritte,
            Karteikarten-Reviews, KI-Anfragen
          </li>
          <li>
            <strong>Kommunikationsdaten:</strong> Nachrichten zwischen Lehrkräften,
            Eltern und Schüler:innen
          </li>
          <li>
            <strong>Anwesenheitsdaten:</strong> Krankmeldungen, Vertretungen,
            Klassenbuch-Einträge
          </li>
          <li>
            <strong>Technische Daten:</strong> IP-Adresse, Geräte-ID, Browser,
            Login-Zeiten — strikt zur Sicherheit und zum Betrieb
          </li>
        </ul>
      </Section>

      <Section number="3" title="Rechtsgrundlagen">
        <p>
          Wir verarbeiten Daten auf Grundlage des Lizenzvertrags mit der Schule
          (Art. 6 Abs. 1 lit. b DSGVO) sowie auf Grundlage berechtigter Interessen
          an der Sicherheit und Weiterentwicklung der Plattform (Art. 6 Abs. 1
          lit. f DSGVO). KI-Funktionen, die über die Vertragserfüllung hinausgehen,
          erfordern eine ausdrückliche Einwilligung.
        </p>
      </Section>

      <Section number="4" title="Hosting in Deutschland">
        <p>
          Sämtliche Daten werden auf Servern in Frankfurt am Main bei einem
          ISO-27001-zertifizierten Rechenzentrum verarbeitet. Es findet keine
          Datenübermittlung in Drittländer statt.
        </p>
        <p>
          Tägliche, verschlüsselte Backups werden ebenfalls innerhalb Deutschlands
          gespeichert. Backups werden nach 30 Tagen automatisch rotiert.
        </p>
      </Section>

      <Section number="5" title="KI-Funktionen">
        <p>
          KI-Funktionen wie Korrektur-Vorschläge, Lerncoach und der KI-Tutor laufen
          standardmäßig über DSGVO-konforme, in der EU gehostete Sprachmodelle.
          Schul- und Lerndaten werden nicht zum Training fremder Modelle verwendet.
        </p>
        <p>
          Die KI-Modelle erhalten den minimal notwendigen Kontext — keine Klar­namen,
          wo es nicht zwingend nötig ist; sensible Identifikatoren werden vor der
          Übergabe pseudonymisiert.
        </p>
      </Section>

      <Section number="6" title="Speicherdauer">
        <p>
          Lerndaten werden so lange gespeichert, wie die Schule den Vertrag mit
          dem Anbieter aufrechterhält. Nach Vertragsende werden Schuldaten nach
          einer 30-Tage-Karenz vollständig gelöscht.
        </p>
        <p>
          Einzelne Nutzer:innen können nach DSGVO Art. 17 jederzeit die Löschung
          ihrer personenbezogenen Daten verlangen — soweit keine gesetzlichen
          Aufbewahrungsfristen entgegenstehen.
        </p>
      </Section>

      <Section number="7" title="Ihre Rechte">
        <p>Jede betroffene Person hat folgende Rechte:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Auskunft über gespeicherte Daten (Art. 15)</li>
          <li>Berichtigung unrichtiger Daten (Art. 16)</li>
          <li>Löschung (&bdquo;Recht auf Vergessenwerden&ldquo;, Art. 17)</li>
          <li>Einschränkung der Verarbeitung (Art. 18)</li>
          <li>Datenübertragbarkeit (Art. 20)</li>
          <li>Widerspruch gegen die Verarbeitung (Art. 21)</li>
          <li>
            Beschwerde bei der zuständigen Aufsichtsbehörde — z. B. dem
            Bayerischen Landesbeauftragten für den Datenschutz
          </li>
        </ul>
      </Section>

      <Section number="8" title="Sicherheit">
        <ul className="space-y-2 pl-0">
          <Bullet text="Transportverschlüsselung mit TLS 1.3 für alle Verbindungen" />
          <Bullet text="Datenbank-Verschlüsselung at-rest mit AES-256" />
          <Bullet text="2-Faktor-Authentifizierung für Lehrkräfte und Admins verpflichtend" />
          <Bullet text="Audit-Log jeder sicherheitsrelevanten Aktion · DSGVO-konform" />
          <Bullet text="Pen-Test jährlich durch externes Sicherheits-Team" />
        </ul>
      </Section>

      <Section number="9" title="Cookies">
        <p>
          Wir verwenden ausschließlich technisch notwendige Cookies (Login-Session,
          Spracheinstellung, Theme). Es werden keine Tracking- oder
          Werbe-Cookies eingesetzt — daher kein Cookie-Banner notwendig.
        </p>
      </Section>

      <Section number="10" title="Auftragsverarbeitung mit Schulen">
        <p>
          Mit jeder Schule wird ein Auftragsverarbeitungsvertrag nach Art. 28 DSGVO
          geschlossen. Den AVV erhalten Schulen automatisch beim Abschluss des
          Lizenzvertrags und können ihn jederzeit in der Admin-Oberfläche herunterladen.
        </p>
      </Section>

      <p className="border-l-2 border-warning bg-warning/[0.06] p-4 text-xs text-muted-fg">
        Diese Datenschutzerklärung ist ein erster Entwurf zur Demonstration der
        Plattform­struktur. Vor Inverkehrbringung muss sie durch eine:n
        Datenschutz­beauftragte:n und Fachjurist:in geprüft und an die konkrete
        Verarbeitungs­situation angepasst werden.
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

function FactTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 bg-bg p-4">
      <span className="grid size-9 place-items-center bg-fg text-bg">{icon}</span>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-fg">
          {label}
        </p>
        <p className="mt-1 text-sm font-bold">{value}</p>
      </div>
    </div>
  );
}

function Bullet({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2.5">
      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" strokeWidth={1.75} />
      <span>{text}</span>
    </li>
  );
}
