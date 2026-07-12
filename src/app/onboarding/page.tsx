/* Copyright 2026 Elian Schock, Jonas Schwenk */
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  KeyRound,
  Palette,
  ShieldCheck,
  Sparkles,
  Upload,
} from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { activateStudentInvite, activateTeacherInvite, createSchoolAndAdmin } from "./actions";
import { buttonVariants } from "@/components/ui/button";
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
  searchParams: Promise<{
    step?: string;
    error?: string;
    token?: string;
    email?: string;
    name?: string;
    role?: string;
    schoolId?: string;
    klasse?: string;
    plan?: string;
    sso?: string;
    schulname?: string;
  }>;
}

const VALID_SSO = ["entra", "google", "apple", "saml", "email"] as const;
type SsoKey = (typeof VALID_SSO)[number];

export default async function OnboardingPage({ searchParams }: PageProps) {
  const { step: stepStr, error, token, email, name, role, schoolId, klasse, plan: planParam, sso: ssoParam, schulname: schulnameParam } = await searchParams;
  const plan = ["basic", "pro", "enterprise"].includes(planParam ?? "") ? (planParam as string) : undefined;
  const sso = VALID_SSO.includes(ssoParam as SsoKey) ? (ssoParam as SsoKey) : undefined;
  const schulname = schulnameParam?.trim() || undefined;

  if (token && role === "teacher") {
    return (
      <TeacherActivatePage
        token={token}
        email={email ?? ""}
        name={name ?? ""}
        schoolId={schoolId ?? ""}
        error={error}
      />
    );
  }

  if (token && role === "student") {
    return (
      <StudentActivatePage
        token={token}
        email={email ?? ""}
        name={name ?? ""}
        schoolId={schoolId ?? ""}
        klasse={klasse ?? ""}
        error={error}
      />
    );
  }

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
          {stepNum === 1 && <Step1 plan={plan} sso={sso} schulname={schulname} />}
          {stepNum === 2 && <Step2 plan={plan} />}
          {stepNum === 3 && <Step3 plan={plan} sso={sso} schulname={schulname} />}
          {stepNum === 4 && <Step4 />}
          {stepNum === 5 && <Step5 error={error} plan={plan} schulname={schulname} />}
        </section>

        {stepNum > 1 && stepNum < 5 && <Navigation step={stepNum} plan={plan} sso={sso} schulname={schulname} />}
      </div>
    </main>
  );
}

/* ── Teacher Invite Activation ──────────────────────────────── */

function TeacherActivatePage({
  token,
  email,
  name,
  schoolId,
  error,
}: {
  token: string;
  email: string;
  name: string;
  schoolId: string;
  error?: string;
}) {
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
            Account einrichten
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-xl px-6 py-16">
        <div className="mb-8 flex items-center gap-3">
          <div className="grid size-12 place-items-center bg-brand text-brand-fg">
            <KeyRound className="size-5" strokeWidth={1.75} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Willkommen bei MasterMind</h1>
            <p className="text-sm text-muted-fg">Richte jetzt deinen Lehrer-Account ein</p>
          </div>
        </div>

        <Card>
          <CardBody>
            {error && (
              <div className="mb-5 border-l-2 border-danger bg-danger/6 px-4 py-3 text-sm text-danger">
                {decodeURIComponent(error)}
              </div>
            )}
            <form action={activateTeacherInvite} className="space-y-5">
              <input type="hidden" name="token" value={token} />
              <input type="hidden" name="schoolId" value={schoolId} />

              <div className="space-y-1.5">
                <Label htmlFor="ta-name">Vor- und Nachname</Label>
                <Input
                  id="ta-name"
                  name="name"
                  defaultValue={name}
                  placeholder="z. B. Anna Müller"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ta-email">E-Mail-Adresse</Label>
                <Input
                  id="ta-email"
                  name="email"
                  type="email"
                  defaultValue={email}
                  readOnly
                  className="bg-surface text-muted-fg"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ta-password">Passwort wählen (min. 12 Zeichen)</Label>
                <Input
                  id="ta-password"
                  name="password"
                  type="password"
                  placeholder="Sicheres Passwort"
                  required
                  minLength={12}
                />
              </div>

              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 bg-fg px-4 py-3 text-sm font-semibold text-bg transition-opacity hover:opacity-90"
              >
                <CheckCircle2 className="size-4" strokeWidth={1.75} />
                Account erstellen &amp; einloggen
              </button>
            </form>
          </CardBody>
        </Card>
      </div>
    </main>
  );
}

function StudentActivatePage({
  token,
  email,
  name,
  schoolId,
  klasse,
  error,
}: {
  token: string;
  email: string;
  name: string;
  schoolId: string;
  klasse: string;
  error?: string;
}) {
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
            Account einrichten
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-xl px-6 py-16">
        <div className="mb-8 flex items-center gap-3">
          <div className="grid size-12 place-items-center bg-brand text-brand-fg">
            <KeyRound className="size-5" strokeWidth={1.75} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Willkommen bei MasterMind</h1>
            <p className="text-sm text-muted-fg">Richte jetzt deinen Schüler-Account ein</p>
          </div>
        </div>

        <Card>
          <CardBody>
            {error && (
              <div className="mb-5 border-l-2 border-danger bg-danger/6 px-4 py-3 text-sm text-danger">
                {decodeURIComponent(error)}
              </div>
            )}
            <form action={activateStudentInvite} className="space-y-5">
              <input type="hidden" name="token" value={token} />
              <input type="hidden" name="schoolId" value={schoolId} />

              <div className="space-y-1.5">
                <Label htmlFor="sa-name">Vor- und Nachname</Label>
                <Input
                  id="sa-name"
                  name="name"
                  defaultValue={name}
                  placeholder="z. B. Lisa Müller"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="sa-email">E-Mail-Adresse</Label>
                <Input
                  id="sa-email"
                  name="email"
                  type="email"
                  defaultValue={email}
                  readOnly
                  className="bg-surface text-muted-fg"
                />
              </div>

              {klasse && (
                <div className="space-y-1.5">
                  <Label htmlFor="sa-klasse">Klasse</Label>
                  <Input
                    id="sa-klasse"
                    name="klasse"
                    defaultValue={klasse}
                    readOnly
                    className="bg-surface text-muted-fg"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="sa-password">Passwort wählen (min. 12 Zeichen)</Label>
                <Input
                  id="sa-password"
                  name="password"
                  type="password"
                  placeholder="Sicheres Passwort"
                  required
                  minLength={12}
                />
              </div>

              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 bg-fg px-4 py-3 text-sm font-semibold text-bg transition-opacity hover:opacity-90"
              >
                <CheckCircle2 className="size-4" strokeWidth={1.75} />
                Account erstellen &amp; einloggen
              </button>
            </form>
          </CardBody>
        </Card>
      </div>
    </main>
  );
}

/* ────────────────────────────────────────────── */

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

function navHref(step: number, plan?: string, sso?: string, schulname?: string) {
  const p = new URLSearchParams({ step: String(step) });
  if (plan) p.set("plan", plan);
  if (sso) p.set("sso", sso);
  if (schulname) p.set("schulname", schulname);
  return `/onboarding?${p.toString()}`;
}

function Navigation({ step, plan, sso, schulname }: { step: number; plan?: string; sso?: string; schulname?: string }) {
  return (
    <div className="mt-10 flex items-center justify-between border-t border-border pt-6">
      <Link
        href={navHref(step - 1, plan, sso, schulname)}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-fg transition-colors hover:text-fg"
      >
        <ArrowLeft className="size-3.5" />
        Zurück
      </Link>
      <Link
        href={navHref(step + 1, plan, sso, schulname)}
        className="inline-flex items-center gap-2 bg-fg px-5 py-2.5 text-sm font-semibold text-bg transition-opacity hover:opacity-90"
      >
        {step === 4 ? "Onboarding abschließen" : "Weiter"}
        <ArrowRight className="size-4" />
      </Link>
    </div>
  );
}

/* ────────────────────────────────────────────── */

function Step1({ plan, sso, schulname: currentName }: { plan?: string; sso?: string; schulname?: string }) {
  return (
    <form method="GET" action="/onboarding">
      <input type="hidden" name="step" value="2" />
      {plan && <input type="hidden" name="plan" value={plan} />}
      {sso && <input type="hidden" name="sso" value={sso} />}

      <div className="grid gap-6 md:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle>Schul-Daten</CardTitle>
          </CardHeader>
          <CardBody className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="schulname">Schul-Name</Label>
              <Input id="schulname" name="schulname" defaultValue={currentName ?? "Realschule München"} required />
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="school-type">Schulart</Label>
                <select
                  id="school-type"
                  name="schulart"
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
                  name="bundesland"
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
                  name="address"
                  placeholder="Straße, PLZ, Ort"
                  defaultValue="Pestalozzistraße 12, 80469 München"
                />
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="students">Schüler-Zahl (ungefähr)</Label>
                <Input id="students" name="students" type="number" defaultValue={750} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="teachers">Lehrer-Zahl (ungefähr)</Label>
                <Input id="teachers" name="teachers" type="number" defaultValue={95} />
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

      <div className="mt-10 flex justify-end border-t border-border pt-6">
        <button
          type="submit"
          className="inline-flex items-center gap-2 bg-fg px-5 py-2.5 text-sm font-semibold text-bg transition-opacity hover:opacity-90"
        >
          Weiter
          <ArrowRight className="size-4" />
        </button>
      </div>
    </form>
  );
}

function Step2({ plan: currentPlan }: { plan?: string }) {
  const plans = [
    {
      key: "basic",
      name: "Basic",
      price: "von 0,90 €",
      per: "/ Schüler / Monat",
      bullets: ["Bis 100 Sitze", "Standard-Funktionen", "E-Mail-Support"],
    },
    {
      key: "pro",
      name: "Pro",
      price: "1,49 €",
      per: "/ Schüler / Monat",
      bullets: ["Unbegrenzte Sitze", "KI-Funktionen v3", "Reports & Analytics", "API & Webhooks"],
      recommended: true,
    },
    {
      key: "enterprise",
      name: "Enterprise",
      price: "Auf Anfrage",
      per: "Multi-Campus",
      bullets: ["Alles in Pro", "White-Label", "SSO via SAML", "SLA + Priority-Support"],
    },
  ];
  const selected = currentPlan ?? "pro";
  return (
    <div>
      <p className="text-sm text-muted-fg">
        Wähle dein Paket. Du kannst jederzeit upgraden — Daten bleiben erhalten.
      </p>
      <div className="mt-6 grid gap-px border border-border bg-border md:grid-cols-3">
        {plans.map((p) => {
          const isSelected = selected === p.key;
          return (
            <div
              key={p.name}
              className={cn(
                "flex flex-col gap-4 bg-bg p-6",
                p.recommended && !isSelected &&
                  "border-l-2 border-l-brand bg-gradient-to-b from-brand/4 to-transparent",
                isSelected && "border-l-2 border-l-success bg-gradient-to-b from-success/4 to-transparent"
              )}
            >
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold tracking-tight">{p.name}</h3>
                {isSelected && <Badge variant="success">Gewählt</Badge>}
                {p.recommended && !isSelected && <Badge variant="brand">Empfohlen</Badge>}
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
              <Link
                href={navHref(3, p.key)}
                className={cn(
                  "mt-auto px-3 py-2 text-center text-xs font-semibold uppercase tracking-wider transition-colors",
                  isSelected
                    ? "bg-success text-bg hover:opacity-90"
                    : p.recommended
                    ? "bg-brand text-brand-fg hover:opacity-90"
                    : "border border-border bg-bg text-fg hover:bg-surface"
                )}
              >
                {isSelected ? "Weiter mit " : ""}{p.name} wählen
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Step3({ plan, sso: currentSso, schulname }: { plan?: string; sso?: string; schulname?: string }) {
  const providers: { key: SsoKey; name: string; desc: string; recommended?: true }[] = [
    { key: "entra", name: "Microsoft Entra ID", desc: "SAML & SCIM · Schulkonten direkt", recommended: true },
    { key: "google", name: "Google Workspace", desc: "OAuth · empfohlen für G-Suite-Schulen" },
    { key: "apple", name: "Apple School Manager", desc: "Managed Apple IDs für iPad-Klassen" },
    { key: "saml", name: "SAML 2.0 (eigener IdP)", desc: "Beliebiger SAML-Provider" },
    { key: "email", name: "Nur E-Mail + Passwort", desc: "2FA pflicht für Lehrer" },
  ];
  const selected = currentSso ?? "entra";
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
          {providers.map((p) => {
            const isActive = selected === p.key;
            return (
              <li
                key={p.name}
                className={cn(
                  "flex items-center gap-4 p-4 transition-colors hover:bg-surface",
                  isActive && "border-l-2 border-l-brand bg-brand/4"
                )}
              >
                <ShieldCheck
                  className={cn("size-4 shrink-0", isActive ? "text-brand" : "text-muted-fg")}
                  strokeWidth={1.75}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{p.name}</p>
                    {p.recommended && <Badge variant="brand">Empfohlen</Badge>}
                  </div>
                  <p className="text-xs text-muted-fg">{p.desc}</p>
                </div>
                <Link
                  href={navHref(4, plan, p.key, schulname)}
                  className={buttonVariants({ size: "sm", variant: isActive ? "primary" : "outline" })}
                >
                  {isActive ? "Aktiv" : "Wählen"}
                </Link>
              </li>
            );
          })}
        </ul>
        <p className="border-l-2 border-warning bg-warning/6 px-4 py-3 text-xs text-muted-fg">
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
          <p className="mt-4 border-l-2 border-brand bg-brand/6 px-3 py-2 text-xs text-muted-fg">
            Logo, Farbe und Subdomain werden nach der Einrichtung im Admin-Panel unter <strong>Branding</strong> konfiguriert.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}

function Step5({ error, plan, schulname }: { error?: string; plan?: string; schulname?: string }) {
  return (
    <div className="grid gap-6 md:grid-cols-[1fr_360px]">
      <Card>
        <CardHeader>
          <CardTitle>Schule aktivieren</CardTitle>
        </CardHeader>
        <CardBody>
          {error && (
            <div className="mb-5 border-l-2 border-danger bg-danger/6 px-4 py-3 text-sm text-danger">
              {decodeURIComponent(error)}
            </div>
          )}
          <form action={createSchoolAndAdmin} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="school-name">Schul-Name</Label>
              <Input
                id="school-name"
                name="school-name"
                defaultValue={schulname ?? ""}
                placeholder="z. B. Realschule München"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="plan">Plan</Label>
              <select
                id="plan"
                name="plan"
                defaultValue={plan ?? "pro"}
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
