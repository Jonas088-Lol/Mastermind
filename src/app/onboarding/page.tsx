import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  Palette,
  ShieldCheck,
  Sparkles,
  Upload,
} from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { createSchoolAndAdmin } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Onboarding",
  description: "Schule in 30 Minuten einrichten.",
};

const STEPS = [
  { num: 1, title: "Schule", icon: Building2 },
  { num: 2, title: "Plan", icon: Sparkles },
  { num: 3, title: "Anmeldung", icon: ShieldCheck },
  { num: 4, title: "Branding", icon: Palette },
  { num: 5, title: "Fertig", icon: CheckCircle2 },
] as const;

interface PageProps {
  searchParams: Promise<{ step?: string; error?: string }>;
}

export default async function OnboardingPage({ searchParams }: PageProps) {
  const { step: stepStr, error } = await searchParams;
  const stepNum = clamp(parseInt(stepStr ?? "1", 10) || 1, 1, 5);

  return (
    <main className="min-h-screen bg-surface">
      <header className="border-b border-border bg-bg">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="flex items-center gap-2 font-bold tracking-tight"
          >
            <span className="grid size-7 place-items-center bg-fg text-bg text-[11px] font-black">
              MM
            </span>
            <span>MasterMind</span>
          </Link>
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-fg">
            Schul-Onboarding
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-12">
        <Stepper current={stepNum} />

        <section className="mt-10">
          {stepNum === 1 && <Step1 />}
          {stepNum === 2 && <Step2 />}
          {stepNum === 3 && <Step3 />}
          {stepNum === 4 && <Step4 />}
          {stepNum === 5 && <Step5 error={error} />}
        </section>

        {stepNum < 5 && <Navigation step={stepNum} />}
      </div>
    </main>
  );
}

function Stepper({ current }: { current: number }) {
  return (
    <ol className="grid grid-cols-5 gap-px border border-border bg-border">
      {STEPS.map((s) => {
        const Icon = s.icon;
        const done = current > s.num;
        const active = current === s.num;
        return (
          <li
            key={s.num}
            className={cn(
              "flex flex-col items-center gap-2 bg-bg p-4 sm:flex-row sm:gap-3 sm:p-5",
              active && "border-l-2 border-l-brand"
            )}
            aria-current={active ? "step" : undefined}
          >
            <div
              className={cn(
                "grid size-9 shrink-0 place-items-center font-mono text-xs font-bold",
                done && "bg-success text-bg",
                active && "bg-brand text-brand-fg",
                !done && !active && "bg-surface text-muted-fg"
              )}
            >
              {done ? <Check className="size-4" /> : <Icon className="size-4" strokeWidth={1.75} />}
            </div>
            <div>
              <p className="font-mono text-[9px] uppercase tracking-wider text-muted-fg">
                Schritt {s.num}
              </p>
              <p
                className={cn(
                  "text-xs font-semibold",
                  active ? "text-brand" : done ? "text-fg" : "text-muted-fg"
                )}
              >
                {s.title}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function Navigation({ step }: { step: number }) {
  return (
    <div className="mt-10 flex items-center justify-between border-t border-border pt-6">
      {step > 1 ? (
        <Link
          href={`/onboarding?step=${step - 1}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-fg transition-colors hover:text-fg"
        >
          <ArrowLeft className="size-3.5" />
          Zurück
        </Link>
      ) : (
        <span />
      )}
      {step < 5 ? (
        <Link
          href={`/onboarding?step=${step + 1}`}
          className="inline-flex items-center gap-2 bg-fg px-5 py-2.5 text-sm font-semibold text-bg transition-opacity hover:opacity-90"
        >
          {step === 4 ? "Onboarding abschließen" : "Weiter"}
          <ArrowRight className="size-4" />
        </Link>
      ) : (
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 bg-fg px-5 py-2.5 text-sm font-semibold text-bg transition-opacity hover:opacity-90"
        >
          Zum Admin-Dashboard
          <ArrowRight className="size-4" />
        </Link>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────── */

function Step1() {
  return (
    <div className="grid gap-6 md:grid-cols-[1fr_320px]">
      <Card>
        <CardHeader>
          <CardTitle>Schul-Daten</CardTitle>
        </CardHeader>
        <CardBody className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="school-name">Schul-Name</Label>
            <Input id="school-name" defaultValue="Realschule München" />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="school-type">Schulart</Label>
              <select
                id="school-type"
                defaultValue="realschule"
                className="h-10 w-full border border-border bg-bg px-3 text-sm focus:border-fg/30 focus:outline-none"
              >
                <option value="grundschule">Grundschule</option>
                <option value="hauptschule">Hauptschule</option>
                <option value="realschule">Realschule</option>
                <option value="gymnasium">Gymnasium</option>
                <option value="gesamtschule">Gesamtschule</option>
                <option value="berufskolleg">Berufskolleg</option>
                <option value="anders">Andere</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bundesland">Bundesland</Label>
              <select
                id="bundesland"
                defaultValue="by"
                className="h-10 w-full border border-border bg-bg px-3 text-sm focus:border-fg/30 focus:outline-none"
              >
                <option value="bw">Baden-Württemberg</option>
                <option value="by">Bayern</option>
                <option value="be">Berlin</option>
                <option value="bb">Brandenburg</option>
                <option value="hb">Bremen</option>
                <option value="hh">Hamburg</option>
                <option value="he">Hessen</option>
                <option value="mv">Mecklenburg-Vorpommern</option>
                <option value="ni">Niedersachsen</option>
                <option value="nw">Nordrhein-Westfalen</option>
                <option value="rp">Rheinland-Pfalz</option>
                <option value="sl">Saarland</option>
                <option value="sn">Sachsen</option>
                <option value="st">Sachsen-Anhalt</option>
                <option value="sh">Schleswig-Holstein</option>
                <option value="th">Thüringen</option>
              </select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="address">Adresse</Label>
              <Input
                id="address"
                placeholder="Straße, PLZ, Ort"
                defaultValue="Pestalozzistraße 12, 80469 München"
              />
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="students">Schüler-Zahl (ungefähr)</Label>
              <Input id="students" type="number" defaultValue={750} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="teachers">Lehrer-Zahl (ungefähr)</Label>
              <Input id="teachers" type="number" defaultValue={95} />
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Was passiert hier?</CardTitle>
        </CardHeader>
        <CardBody>
          <p className="text-sm text-muted-fg">
            Wir nutzen diese Daten, um das richtige Lehrplan-Profil und die
            passende Lizenz-Größe vorzuschlagen. Du kannst alles später jederzeit
            anpassen.
          </p>
          <ul className="mt-4 space-y-2 text-xs">
            <Hint text="Lehrplan-Profil pro Bundesland" />
            <Hint text="Klassengrößen-Sanity-Check" />
            <Hint text="AVV-Vorlage automatisch bereitgestellt" />
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}

function Step2() {
  const plans = [
    {
      name: "Basic",
      price: "von 0,90 €",
      per: "/ Schüler / Monat",
      bullets: ["Bis 100 Sitze", "Standard-Funktionen", "E-Mail-Support"],
      tone: "outline" as const,
    },
    {
      name: "Pro",
      price: "1,49 €",
      per: "/ Schüler / Monat",
      bullets: ["Unbegrenzte Sitze", "KI-Funktionen v3", "Reports & Analytics", "API & Webhooks"],
      tone: "brand" as const,
      recommended: true,
    },
    {
      name: "Enterprise",
      price: "Auf Anfrage",
      per: "Multi-Campus",
      bullets: ["Alles in Pro", "White-Label", "SSO via SAML", "SLA + Priority-Support"],
      tone: "success" as const,
    },
  ];
  return (
    <div>
      <p className="text-sm text-muted-fg">
        Wähle dein Paket. Du kannst jederzeit upgraden — Daten bleiben erhalten.
      </p>
      <div className="mt-6 grid gap-px border border-border bg-border md:grid-cols-3">
        {plans.map((p) => (
          <div
            key={p.name}
            className={cn(
              "flex flex-col gap-4 bg-bg p-6",
              p.recommended &&
                "border-l-2 border-l-brand bg-gradient-to-b from-brand/[0.04] to-transparent"
            )}
          >
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold tracking-tight">{p.name}</h3>
              {p.recommended && <Badge variant="brand">Empfohlen</Badge>}
            </div>
            <div>
              <p className="font-mono text-2xl font-bold tracking-tight">{p.price}</p>
              <p className="text-xs text-muted-fg">{p.per}</p>
            </div>
            <ul className="space-y-2 border-t border-border pt-4 text-sm">
              {p.bullets.map((b) => (
                <li key={b} className="flex items-start gap-2">
                  <Check className="mt-0.5 size-3.5 shrink-0 text-success" strokeWidth={2.5} />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className={cn(
                "mt-auto px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-colors",
                p.recommended
                  ? "bg-brand text-brand-fg hover:bg-brand-dark"
                  : "border border-border bg-bg text-fg hover:bg-surface"
              )}
            >
              {p.name} wählen
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Step3() {
  const providers = [
    { name: "Microsoft Entra ID", desc: "SAML & SCIM · Schulkonten direkt", recommended: true },
    { name: "Google Workspace", desc: "OAuth · empfohlen für G-Suite-Schulen" },
    { name: "Apple School Manager", desc: "Managed Apple IDs für iPad-Klassen" },
    { name: "SAML 2.0 (eigener IdP)", desc: "Beliebiger SAML-Provider" },
    { name: "Nur E-Mail + Passwort", desc: "2FA pflicht für Lehrer" },
  ];
  return (
    <Card>
      <CardHeader>
        <CardTitle>Anmeldung & Identität</CardTitle>
        <Badge variant="success">DSGVO-konform</Badge>
      </CardHeader>
      <CardBody className="space-y-4">
        <p className="text-sm text-muted-fg">
          Wähle, wie sich Lehrer und Schüler einloggen. SSO empfehlen wir für
          größere Schulen — kein zusätzliches Passwort, automatische Provisionierung.
        </p>
        <ul className="divide-y divide-border border border-border bg-bg">
          {providers.map((p, i) => (
            <li
              key={p.name}
              className={cn(
                "flex items-center gap-4 p-4 transition-colors hover:bg-surface",
                i === 0 && "border-l-2 border-l-brand bg-brand/[0.04]"
              )}
            >
              <ShieldCheck
                className={cn("size-4 shrink-0", i === 0 ? "text-brand" : "text-muted-fg")}
                strokeWidth={1.75}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">{p.name}</p>
                  {p.recommended && <Badge variant="brand">Empfohlen</Badge>}
                </div>
                <p className="text-xs text-muted-fg">{p.desc}</p>
              </div>
              <Button size="sm" variant={i === 0 ? "primary" : "outline"}>
                {i === 0 ? "Aktiv" : "Wählen"}
              </Button>
            </li>
          ))}
        </ul>
        <p className="border-l-2 border-warning bg-warning/[0.06] px-4 py-3 text-xs text-muted-fg">
          2-Faktor-Authentifizierung wird für alle Lehrer- und Admin-Accounts
          standardmäßig erzwungen.
        </p>
      </CardBody>
    </Card>
  );
}

function Step4() {
  return (
    <div className="grid gap-6 md:grid-cols-[1fr_360px]">
      <Card>
        <CardHeader>
          <CardTitle>Branding</CardTitle>
        </CardHeader>
        <CardBody className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="logo">Schul-Logo</Label>
            <button
              type="button"
              className="group flex w-full items-center gap-3 border border-dashed border-border bg-bg p-4 text-left transition-colors hover:border-brand"
            >
              <div className="grid size-12 place-items-center bg-surface group-hover:bg-fg group-hover:text-bg">
                <Upload className="size-4" strokeWidth={1.75} />
              </div>
              <div>
                <p className="text-sm font-semibold">Logo hochladen</p>
                <p className="text-xs text-muted-fg">SVG bevorzugt · PNG min. 512×512</p>
              </div>
            </button>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="brand-color">Akzentfarbe</Label>
            <div className="flex flex-wrap gap-1.5">
              {["#1E3A8A", "#2563EB", "#7C3AED", "#0891B2", "#059669", "#DC2626", "#EA580C"].map(
                (c, i) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Farbe ${c}`}
                    aria-pressed={i === 1}
                    className={cn(
                      "size-9 transition-transform hover:scale-110",
                      i === 1 && "ring-2 ring-fg ring-offset-2 ring-offset-bg"
                    )}
                    style={{ background: c }}
                  />
                )
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="subdomain">Sub-Domain</Label>
            <div className="flex">
              <Input
                id="subdomain"
                defaultValue="rs-muenchen"
                className="rounded-none border-r-0"
              />
              <span className="grid place-items-center border border-l-0 border-border bg-surface px-3 font-mono text-xs text-muted-fg">
                .mastermind.app
              </span>
            </div>
            <p className="text-xs text-muted-fg">
              Nutzer erreichen die Schule unter rs-muenchen.mastermind.app
            </p>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vorschau</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="border border-border bg-bg p-4">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <div className="grid size-8 place-items-center bg-fg text-bg text-[10px] font-black">
                MM
              </div>
              <p className="text-sm font-bold">Realschule München</p>
            </div>
            <div className="mt-3 space-y-2">
              <div className="h-2 w-3/4 bg-surface-2" />
              <div className="h-2 w-1/2 bg-surface-2" />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-1.5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-12 bg-surface-2" />
              ))}
            </div>
            <button
              type="button"
              className="mt-4 w-full px-3 py-2 text-xs font-semibold uppercase tracking-wider"
              style={{ background: "#2563EB", color: "white" }}
            >
              Anmelden
            </button>
          </div>
          <p className="mt-3 text-xs text-muted-fg">
            So sieht deine Schule auf jeder Anmelde-Seite aus.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}

function Step5({ error }: { error?: string }) {
  return (
    <div className="grid gap-6 md:grid-cols-[1fr_360px]">
      <Card>
        <CardHeader>
          <CardTitle>Schule aktivieren</CardTitle>
        </CardHeader>
        <CardBody>
          {error && (
            <div className="mb-5 border-l-2 border-danger bg-danger/[0.06] px-4 py-3 text-sm text-danger">
              {decodeURIComponent(error)}
            </div>
          )}
          <form action={createSchoolAndAdmin} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="school-name">Schul-Name</Label>
              <Input
                id="school-name"
                name="school-name"
                placeholder="z. B. Realschule München"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="plan">Plan</Label>
              <select
                id="plan"
                name="plan"
                defaultValue="pro"
                className="h-10 w-full border border-border bg-bg px-3 text-sm focus:border-fg/30 focus:outline-none"
              >
                <option value="basic">Basic — ab 0,90 € / Schüler / Mo.</option>
                <option value="pro">Pro — 1,49 € / Schüler / Mo. (empfohlen)</option>
                <option value="enterprise">Enterprise — auf Anfrage</option>
              </select>
            </div>
            <div className="border-t border-border pt-5">
              <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-fg">
                Admin-Account
              </p>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="admin-name">Vor- und Nachname</Label>
                  <Input
                    id="admin-name"
                    name="admin-name"
                    placeholder="z. B. Andrea Hoffmann"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="admin-email">E-Mail</Label>
                  <Input
                    id="admin-email"
                    name="admin-email"
                    type="email"
                    placeholder="admin@schule.de"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="admin-password">Passwort (min. 12 Zeichen)</Label>
                  <Input
                    id="admin-password"
                    name="admin-password"
                    type="password"
                    placeholder="Sicheres Passwort"
                    required
                    minLength={12}
                  />
                </div>
              </div>
            </div>
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 bg-fg px-4 py-3 text-sm font-semibold text-bg transition-opacity hover:opacity-90"
            >
              <CheckCircle2 className="size-4" strokeWidth={1.75} />
              Schule aktivieren &amp; einloggen
            </button>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Was passiert jetzt?</CardTitle>
        </CardHeader>
        <CardBody>
          <p className="text-sm text-muted-fg">
            Wir legen die Schule und deinen Admin-Account an. Du wirst direkt
            eingeloggt und kannst sofort loslegen.
          </p>
          <ul className="mt-4 space-y-2 text-xs">
            <Hint text="School-Record in Datenbank angelegt" />
            <Hint text="Admin-Account erstellt + eingeloggt" />
            <Hint text="Willkommens-E-Mail wird versendet" />
            <Hint text="AVV-Vorlage automatisch bereitgestellt" />
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}


function Hint({ text }: { text: string }) {
  return (
    <li className="flex items-center gap-2 text-muted-fg">
      <Check className="size-3 shrink-0 text-success" strokeWidth={2.5} />
      <span>{text}</span>
    </li>
  );
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
