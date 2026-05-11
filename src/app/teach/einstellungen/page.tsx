import {
  Bell,
  Check,
  Download,
  Eye,
  Globe,
  Key,
  Laptop,
  Mail,
  Palette,
  Shield,
  Smartphone,
  Sparkles,
  Trash2,
} from "lucide-react";
import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Einstellungen" };

const SECTIONS = [
  { id: "account", label: "Account", icon: Key },
  { id: "ki", label: "KI-Funktionen", icon: Sparkles },
  { id: "benachrichtigungen", label: "Benachrichtigungen", icon: Bell },
  { id: "privatsphaere", label: "Privatsphäre", icon: Eye },
  { id: "darstellung", label: "Darstellung", icon: Palette },
  { id: "sprache", label: "Sprache", icon: Globe },
  { id: "geraete", label: "Geräte", icon: Laptop },
  { id: "daten", label: "Daten & DSGVO", icon: Shield },
] as const;

export default function TeachEinstellungenPage() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">
          Konto · Markus Becker
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
          Einstellungen
        </h1>
        <p className="mt-1 text-sm text-muted-fg">
          KI-Verhalten, Benachrichtigungen, Geräte und Daten verwalten.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[220px_1fr] lg:gap-10">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <nav aria-label="Einstellungen-Sektionen">
            <ul className="flex gap-1 overflow-x-auto border border-border bg-bg p-1 lg:flex-col lg:gap-0.5 lg:p-2">
              {SECTIONS.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="flex shrink-0 items-center gap-2 px-3 py-2 text-xs font-medium text-muted-fg transition-colors hover:bg-surface hover:text-fg lg:text-sm"
                  >
                    <s.icon className="size-4" strokeWidth={1.75} />
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <div className="space-y-8">
          <section id="account">
            <Card>
              <CardHeader>
                <CardTitle>Account</CardTitle>
              </CardHeader>
              <CardBody className="space-y-5">
                <Field label="E-Mail" value="becker@schule.de" action="Ändern" />
                <Field label="Schul-Account" value="Realschule München · seit 2014" status="ok" />
                <Field label="Passwort" value="zuletzt geändert vor 12 Tagen" action="Neu setzen" />
                <Field
                  label="2-Faktor-Authentifizierung"
                  value="aktiv · Authenticator-App"
                  status="ok"
                  action="Verwalten"
                />
                <Field
                  label="SSO"
                  value="Microsoft Entra ID (Schulkonto)"
                  status="ok"
                  action="Verwalten"
                />
              </CardBody>
            </Card>
          </section>

          <section id="ki">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>KI-Funktionen</CardTitle>
                  <p className="mt-1 text-sm text-muted-fg">
                    Wie viel Hilfe willst du in deinem Workflow?
                  </p>
                </div>
                <Badge variant="brand">
                  <Sparkles className="size-3" />
                  v3
                </Badge>
              </CardHeader>
              <CardBody className="space-y-1">
                <Toggle
                  icon={<Sparkles className="size-4" />}
                  label="Auto-Vorbewertung von Abgaben"
                  detail="KI bewertet vor — du nimmst per Klick an oder änderst"
                  on
                />
                <Toggle
                  icon={<Sparkles className="size-4" />}
                  label="Aufgaben-Vorschläge bei neuen Aufgaben"
                  detail="KI schlägt Wortlaut + Bewertungsraster vor"
                  on
                />
                <Toggle
                  icon={<Sparkles className="size-4" />}
                  label="Risiko-Schüler erkennen"
                  detail="KI markiert Schüler mit fallendem Trend automatisch"
                  on
                />
                <Toggle
                  icon={<Sparkles className="size-4" />}
                  label="Auto-Antwort-Vorschläge in Nachrichten"
                  detail="3 Vorschläge pro eingehender Mail · Du wählst"
                  on
                />
                <Toggle
                  icon={<Sparkles className="size-4" />}
                  label="Lehrplan-Check"
                  detail="Generierte Aufgaben werden gegen KMK-Standards validiert"
                  on
                />
              </CardBody>
            </Card>
          </section>

          <section id="benachrichtigungen">
            <Card>
              <CardHeader>
                <CardTitle>Benachrichtigungen</CardTitle>
              </CardHeader>
              <CardBody className="space-y-1">
                <Toggle
                  icon={<Smartphone className="size-4" />}
                  label="Push · Neue Eltern-Nachricht"
                  detail="Sofort, wenn ein Elternteil schreibt"
                  on
                />
                <Toggle
                  icon={<Smartphone className="size-4" />}
                  label="Push · Schüler-Frage zu Aufgabe"
                  detail="Direkt im Tutor- oder Aufgaben-Kontext"
                  on
                />
                <Toggle
                  icon={<Mail className="size-4" />}
                  label="E-Mail · Tageszusammenfassung 7 Uhr"
                  detail="Was steht heute an? Vertretungen, Korrekturen, Termine"
                  on
                />
                <Toggle
                  icon={<Bell className="size-4" />}
                  label="Push · Korrektur-Stapel ≥ 20"
                  detail="Erinnerung, wenn der Stapel groß wird"
                  on={false}
                />
                <Toggle
                  icon={<Bell className="size-4" />}
                  label="Ruhe-Zeiten (18:00 – 07:00)"
                  detail="Push wird unterdrückt · Notfälle ausgenommen"
                  on
                />
              </CardBody>
            </Card>
          </section>

          <section id="privatsphaere">
            <Card>
              <CardHeader>
                <CardTitle>Privatsphäre</CardTitle>
              </CardHeader>
              <CardBody className="space-y-1">
                <Toggle
                  icon={<Eye className="size-4" />}
                  label="Sprechstunde öffentlich für Eltern"
                  detail="Eltern können selbst Termine buchen"
                  on
                />
                <Toggle
                  icon={<Eye className="size-4" />}
                  label="Klassen-Statistiken im Lehrer-Kollegium teilen"
                  detail="Anonymisiert · für Fachkonferenzen"
                  on={false}
                />
                <Toggle
                  icon={<Eye className="size-4" />}
                  label="KI darf aus Korrekturen lernen"
                  detail="Anonymisiert · verbessert Vorbewertungs-Qualität"
                  on
                />
              </CardBody>
            </Card>
          </section>

          <section id="darstellung">
            <Card>
              <CardHeader>
                <CardTitle>Darstellung</CardTitle>
              </CardHeader>
              <CardBody className="space-y-5">
                <div>
                  <p className="text-sm font-semibold">Theme</p>
                  <div className="mt-3 grid grid-cols-3 gap-px border border-border bg-border">
                    <ThemeOption label="Hell" active />
                    <ThemeOption label="Dunkel" />
                    <ThemeOption label="System" />
                  </div>
                </div>
                <Toggle
                  icon={<Palette className="size-4" />}
                  label="Kompakte Tabellen"
                  detail="Mehr Zeilen pro Bildschirm"
                  on={false}
                />
              </CardBody>
            </Card>
          </section>

          <section id="sprache">
            <Card>
              <CardHeader>
                <CardTitle>Sprache</CardTitle>
              </CardHeader>
              <CardBody>
                <div className="grid grid-cols-2 gap-px border border-border bg-border sm:grid-cols-4">
                  <LangOption label="Deutsch" code="DE" active />
                  <LangOption label="English" code="EN" />
                  <LangOption label="Türkçe" code="TR" />
                  <LangOption label="Polski" code="PL" />
                </div>
              </CardBody>
            </Card>
          </section>

          <section id="geraete">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Geräte & Sessions</CardTitle>
                  <p className="mt-1 text-sm text-muted-fg">2 aktive Sessions</p>
                </div>
                <Button variant="outline" size="sm">
                  Alle abmelden
                </Button>
              </CardHeader>
              <CardBody className="!px-0 !pb-0">
                <ul className="divide-y divide-border border-t border-border">
                  <DeviceRow icon={Laptop} name="MacBook Pro · Safari" location="München · DE" time="diese Sitzung" current />
                  <DeviceRow icon={Smartphone} name="iPhone · MasterMind App" location="München · DE" time="vor 2 Std." />
                </ul>
              </CardBody>
            </Card>
          </section>

          <section id="daten">
            <Card>
              <CardHeader>
                <CardTitle>Daten & DSGVO</CardTitle>
              </CardHeader>
              <CardBody className="space-y-3">
                <div className="grid gap-px border border-border bg-border sm:grid-cols-2">
                  <DataAction
                    icon={<Download className="size-4" />}
                    label="Daten exportieren"
                    detail="Alle eigenen Daten · ZIP"
                  />
                  <DataAction
                    icon={<Trash2 className="size-4" />}
                    label="Account schließen"
                    detail="Schul-Admin-Bestätigung erforderlich"
                    danger
                  />
                </div>
                <p className="text-xs text-muted-fg">
                  Schul-Daten verbleiben bei der Schule. Persönliche Daten gem. DSGVO Art. 17 löschbar.
                </p>
              </CardBody>
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  action,
  status,
}: {
  label: string;
  value: string;
  action?: string;
  status?: "ok";
}) {
  return (
    <div className="flex flex-col gap-2 border-b border-border pb-4 last:border-b-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-semibold">{label}</p>
        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-fg">
          {status === "ok" && <Check className="size-3 text-success" strokeWidth={2.5} />}
          {value}
        </p>
      </div>
      {action && (
        <Button variant="ghost" size="sm">
          {action}
        </Button>
      )}
    </div>
  );
}

function Toggle({
  icon,
  label,
  detail,
  on,
}: {
  icon: React.ReactNode;
  label: string;
  detail: string;
  on: boolean;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-border py-3 last:border-b-0">
      <span className="mt-0.5 grid size-7 shrink-0 place-items-center bg-surface text-muted-fg">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{label}</p>
        <p className="mt-0.5 text-xs text-muted-fg">{detail}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        className={`relative h-5 w-9 shrink-0 transition-colors ${
          on ? "bg-brand" : "bg-border-strong"
        }`}
      >
        <span
          className={`absolute top-0.5 size-4 bg-bg transition-[left] ${
            on ? "left-[18px]" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}

function ThemeOption({ label, active }: { label: string; active?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={`px-4 py-3 text-sm transition-colors ${
        active ? "bg-fg text-bg" : "bg-bg text-muted-fg hover:bg-surface"
      }`}
    >
      {label}
    </button>
  );
}

function LangOption({
  label,
  code,
  active,
}: {
  label: string;
  code: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={`flex flex-col items-start gap-0.5 px-4 py-3 text-left transition-colors ${
        active ? "bg-fg text-bg" : "bg-bg text-muted-fg hover:bg-surface"
      }`}
    >
      <span className="font-mono text-[10px] uppercase tracking-wider opacity-70">
        {code}
      </span>
      <span className="text-sm font-semibold">{label}</span>
    </button>
  );
}

function DeviceRow({
  icon: Icon,
  name,
  location,
  time,
  current,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  name: string;
  location: string;
  time: string;
  current?: boolean;
}) {
  return (
    <li className="flex items-center gap-4 px-5 py-4">
      <Icon className="size-4 shrink-0 text-muted-fg" strokeWidth={1.75} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold">{name}</p>
          {current && <Badge variant="brand">Jetzt</Badge>}
        </div>
        <p className="text-xs text-muted-fg">
          {location} · {time}
        </p>
      </div>
      {!current && (
        <Button variant="ghost" size="sm">
          Abmelden
        </Button>
      )}
    </li>
  );
}

function DataAction({
  icon,
  label,
  detail,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  detail: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      className={`group flex items-start gap-3 bg-bg p-5 text-left transition-colors ${
        danger ? "hover:bg-danger/[0.04]" : "hover:bg-surface"
      }`}
    >
      <span
        className={`grid size-9 shrink-0 place-items-center transition-colors ${
          danger
            ? "bg-danger/10 text-danger group-hover:bg-danger group-hover:text-bg"
            : "bg-surface text-fg group-hover:bg-fg group-hover:text-bg"
        }`}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-semibold ${danger ? "text-danger" : ""}`}>{label}</p>
        <p className="mt-0.5 text-xs text-muted-fg">{detail}</p>
      </div>
    </button>
  );
}
