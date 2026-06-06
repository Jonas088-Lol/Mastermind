import {
  AlertCircle,
  ArrowRight,
  GraduationCap,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  UserCog,
  Users,
} from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ClientRedirect } from "@/components/ClientRedirect";
import {
  ACCOUNTS,
  DEMO_PASSWORDS,
  ROLE_HOME,
  ROLE_LABEL,
  type Role,
  effectiveRole,
  getSession,
} from "@/lib/session";
import {
  loginAsRole,
  loginWithCredentials,
  requestMagicLink,
} from "./actions";

export const metadata: Metadata = {
  title: "Anmelden",
  description: "Bei MasterMind anmelden — für Schulen, Lehrer, Schüler und Eltern.",
};

interface LoginPageProps {
  searchParams: Promise<{ error?: string; method?: string; sent?: string }>;
}

const demoTiles: {
  role: Role;
  description: string;
  icon: React.ReactNode;
  primary?: boolean;
}[] = [
  {
    role: "super",
    description: "Sieht alles · wechselt jede Sicht im Header",
    icon: <Sparkles className="size-4" />,
    primary: true,
  },
  { role: "admin", description: "Realschule München", icon: <UserCog className="size-4" /> },
  { role: "teacher", description: "Mathe · Physik · 4 Klassen", icon: <Users className="size-4" /> },
  { role: "student", description: "Klasse 9b · Realschule", icon: <GraduationCap className="size-4" /> },
  { role: "parent", description: "Mutter von Lukas", icon: <Users className="size-4" /> },
];

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error, method, sent } = await searchParams;
  const useMagicLink = method === "magic";

  const session = await getSession();
  if (session) return <ClientRedirect to={ROLE_HOME[effectiveRole(session)]} />;

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* LEFT: marketing context */}
      <aside className="hidden flex-col justify-between border-r border-border bg-fg p-10 text-bg lg:flex">
        <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
          <span className="grid size-7 place-items-center bg-bg text-fg text-[11px] font-black">
            MM
          </span>
          <span>MasterMind</span>
        </Link>

        <div className="max-w-md">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-glow">
            Eine Plattform für Schule
          </p>
          <h1 className="mt-5 text-4xl font-bold leading-[1.1] tracking-tight xl:text-5xl">
            Lernen, Verwaltung und KI in einer Plattform.
          </h1>
          <p className="mt-5 max-w-sm text-sm text-bg/70">
            Server in Deutschland · DSGVO-konform · 30-Min-Onboarding für deine Schule.
          </p>
        </div>

        <ul className="space-y-2.5 text-sm text-bg/80">
          <li className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-brand-glow" />
            Hosting Frankfurt am Main · AVV in 24 h
          </li>
          <li className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-brand-glow" />
            SSO mit Microsoft, Google, Apple
          </li>
          <li className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-brand-glow" />
            2FA · Audit-Logs · Datenexport jederzeit
          </li>
        </ul>
      </aside>

      {/* RIGHT: auth */}
      <main className="flex min-h-screen flex-col px-6 py-10 sm:px-10 lg:px-14">
        <Link
          href="/"
          className="flex items-center gap-2 font-bold tracking-tight lg:hidden"
        >
          <span className="grid size-7 place-items-center bg-fg text-bg text-[11px] font-black">
            MM
          </span>
          <span>MasterMind</span>
        </Link>

        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Anmelden</h2>
            <p className="mt-2 text-sm text-muted-fg">
              Mit deinem Schul-Account oder einem Demo-Zugang einloggen.
            </p>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-px border border-border bg-border">
            <Link
              href="/login"
              aria-pressed={!useMagicLink}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                !useMagicLink ? "bg-fg text-bg" : "bg-bg text-muted-fg hover:bg-surface"
              }`}
            >
              <Lock className="size-3.5" />
              Passwort
            </Link>
            <Link
              href="/login?method=magic"
              aria-pressed={useMagicLink}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                useMagicLink ? "bg-fg text-bg" : "bg-bg text-muted-fg hover:bg-surface"
              }`}
            >
              <Mail className="size-3.5" />
              Magic-Link
            </Link>
          </div>

          {error === "invalid" && (
            <div
              role="alert"
              className="mt-6 flex items-start gap-3 border border-danger/40 bg-danger/[0.06] p-3 text-sm text-danger"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <div>
                <p className="font-semibold">E-Mail oder Passwort falsch</p>
                <p className="mt-0.5 text-xs text-danger/80">
                  Tipp: Schau in die Demo-Account-Liste unten oder nutze einen
                  Quick-Login.
                </p>
              </div>
            </div>
          )}

          {error === "rate-limit" && (
            <div
              role="alert"
              className="mt-6 flex items-start gap-3 border border-warning/40 bg-warning/[0.06] p-3 text-sm text-warning"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <p>Zu viele Login-Versuche. Bitte warte ein paar Minuten.</p>
            </div>
          )}

          {(error === "2fa-expired" ||
            error === "2fa-not-active" ||
            error === "2fa-rate-limit") && (
            <div
              role="alert"
              className="mt-6 flex items-start gap-3 border border-warning/40 bg-warning/[0.06] p-3 text-sm text-warning"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <p>
                {error === "2fa-rate-limit"
                  ? "Zu viele 2FA-Versuche. Bitte erneut anmelden."
                  : "2FA-Vorgang abgelaufen — bitte erneut anmelden."}
              </p>
            </div>
          )}

          {sent === "1" && useMagicLink && (
            <div
              role="status"
              className="mt-6 flex items-start gap-3 border border-success/40 bg-success/[0.06] p-3 text-sm text-success"
            >
              <Mail className="mt-0.5 size-4 shrink-0" />
              <div>
                <p className="font-semibold">Link gesendet</p>
                <p className="mt-0.5 text-xs text-success/80">
                  Schau in dein E-Mail-Postfach. Der Link gilt 15 Minuten.
                </p>
              </div>
            </div>
          )}

          {useMagicLink ? (
            <form action={requestMagicLink} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email-magic">E-Mail</Label>
                <Input
                  id="email-magic"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  required
                  placeholder="lukas@schule.de"
                />
                <p className="text-xs text-muted-fg">
                  Wir schicken dir einen Anmelde-Link — kein Passwort nötig.
                </p>
              </div>
              <Button type="submit" size="lg" className="w-full">
                <Mail className="size-4" />
                Link senden
              </Button>
            </form>
          ) : (
            <form action={loginWithCredentials} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">E-Mail</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  required
                  placeholder="lukas@schule.de"
                  defaultValue=""
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Passwort</Label>
                  <Link
                    href="/login/passwort-vergessen"
                    className="text-[11px] font-medium text-muted-fg transition-colors hover:text-fg"
                  >
                    Passwort vergessen?
                  </Link>
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                />
              </div>
              <Button type="submit" size="lg" className="w-full">
                Anmelden
                <ArrowRight className="size-4" />
              </Button>
            </form>
          )}

          <div className="my-8 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-fg">
              oder Demo-Quick-Login
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <div className="grid gap-2">
            {demoTiles.map((t) => (
              <form key={t.role} action={loginAsRole.bind(null, t.role)}>
                <button
                  type="submit"
                  className={`group flex w-full items-center gap-3 border bg-bg px-3 py-2.5 text-left transition-colors ${
                    t.primary
                      ? "border-brand/50 bg-gradient-to-r from-brand/[0.06] to-transparent hover:border-brand"
                      : "border-border hover:border-brand"
                  }`}
                >
                  <span
                    className={`grid size-8 shrink-0 place-items-center ${
                      t.primary ? "bg-brand text-brand-fg" : "bg-surface text-fg"
                    }`}
                  >
                    {t.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{ROLE_LABEL[t.role]}</p>
                      {t.primary && (
                        <span className="bg-brand px-1.5 py-px font-mono text-[9px] font-bold uppercase tracking-wider text-brand-fg">
                          Empfohlen
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-fg">{t.description}</p>
                  </div>
                  <ArrowRight className="size-4 text-muted-fg transition-colors group-hover:text-brand" />
                </button>
              </form>
            ))}
          </div>

          <details className="mt-6 border border-dashed border-border">
            <summary className="cursor-pointer list-none px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-fg transition-colors hover:bg-surface">
              Demo-Zugangsdaten anzeigen
            </summary>
            <ul className="divide-y divide-border border-t border-border">
              {ACCOUNTS.map((a) => (
                <li
                  key={a.email}
                  className="grid grid-cols-2 gap-2 px-4 py-2 font-mono text-[11px]"
                >
                  <span className="truncate text-fg">{a.email}</span>
                  <span className="truncate text-muted-fg">
                    {DEMO_PASSWORDS[a.email] ?? "—"}{" "}
                    <span className="ml-2 text-[10px] uppercase">
                      {ROLE_LABEL[a.role]}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </details>

          <p className="mt-8 text-center text-xs text-muted-fg">
            Mit der Anmeldung akzeptierst du unsere{" "}
            <Link href="/legal/agb" className="underline underline-offset-2 hover:text-fg">
              AGB
            </Link>{" "}
            und{" "}
            <Link
              href="/legal/datenschutz"
              className="underline underline-offset-2 hover:text-fg"
            >
              Datenschutzerklärung
            </Link>
            .
          </p>
        </div>
      </main>
    </div>
  );
}
