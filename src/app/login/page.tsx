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
import { BrandLogo } from "@/components/BrandLogo";
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
import { cn } from "@/lib/utils";

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
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* LEFT: branding panel */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-brand p-10 text-white lg:flex">
        <div className="pointer-events-none absolute inset-0 opacity-20"
          style={{ background: "radial-gradient(ellipse at 30% 20%, white 0%, transparent 60%)" }}
        />
        <Link href="/" className="relative flex items-center gap-2 font-bold tracking-tight">
          <BrandLogo height="h-8" showName variant="inverted" />
        </Link>

        <div className="relative max-w-md">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/70">
            Eine Plattform für Schule
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight xl:text-5xl">
            Lernen, Verwaltung und KI in einer Plattform.
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/70">
            Server in Deutschland · DSGVO-konform · 30-Min-Onboarding.
          </p>
        </div>

        <ul className="relative space-y-2.5 text-sm text-white/80">
          {[
            "Hosting Frankfurt am Main · AVV in 24 h",
            "SSO mit Microsoft, Google, Apple",
            "2FA · Audit-Logs · Datenexport jederzeit",
          ].map((t) => (
            <li key={t} className="flex items-center gap-2.5">
              <ShieldCheck className="size-4 text-white/60 shrink-0" />
              {t}
            </li>
          ))}
        </ul>
      </aside>

      {/* RIGHT: auth */}
      <main className="flex min-h-dvh flex-col bg-surface/30 px-5 py-8 sm:px-8 lg:px-12">
        <Link href="/" className="flex items-center gap-2 font-bold tracking-tight lg:hidden">
          <BrandLogo height="h-8" showName />
        </Link>

        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-8">
          <div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Anmelden</h2>
            <p className="mt-2 text-sm text-muted-fg">
              Mit deinem Schul-Account oder einem Demo-Zugang einloggen.
            </p>
          </div>

          {/* Method toggle */}
          <div className="mt-6 grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1">
            <Link
              href="/login"
              aria-pressed={!useMagicLink}
              className={cn(
                "flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-all",
                !useMagicLink
                  ? "bg-bg text-fg shadow-sm"
                  : "text-muted-fg hover:text-fg"
              )}
            >
              <Lock className="size-3.5" />
              Passwort
            </Link>
            <Link
              href="/login?method=magic"
              aria-pressed={useMagicLink}
              className={cn(
                "flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-all",
                useMagicLink
                  ? "bg-bg text-fg shadow-sm"
                  : "text-muted-fg hover:text-fg"
              )}
            >
              <Mail className="size-3.5" />
              Magic-Link
            </Link>
          </div>

          {/* Error alerts */}
          {error === "invalid" && (
            <div role="alert" className="mt-5 flex items-start gap-3 rounded-xl border border-danger/30 bg-danger/6 px-4 py-3 text-sm text-danger">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <div>
                <p className="font-semibold">E-Mail oder Passwort falsch</p>
                <p className="mt-0.5 text-xs text-danger/80">Nutze einen Quick-Login unten oder überprüfe deine Zugangsdaten.</p>
              </div>
            </div>
          )}
          {error === "rate-limit" && (
            <div role="alert" className="mt-5 flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/6 px-4 py-3 text-sm text-warning">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <p>Zu viele Login-Versuche. Bitte warte ein paar Minuten.</p>
            </div>
          )}
          {(error === "2fa-expired" || error === "2fa-not-active" || error === "2fa-rate-limit") && (
            <div role="alert" className="mt-5 flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/6 px-4 py-3 text-sm text-warning">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <p>{error === "2fa-rate-limit" ? "Zu viele 2FA-Versuche." : "2FA-Vorgang abgelaufen — bitte erneut anmelden."}</p>
            </div>
          )}
          {sent === "1" && useMagicLink && (
            <div role="status" className="mt-5 flex items-start gap-3 rounded-xl border border-success/30 bg-success/6 px-4 py-3 text-sm text-success">
              <Mail className="mt-0.5 size-4 shrink-0" />
              <div>
                <p className="font-semibold">Link gesendet</p>
                <p className="mt-0.5 text-xs text-success/80">Schau in dein E-Mail-Postfach. Der Link gilt 15 Minuten.</p>
              </div>
            </div>
          )}

          {/* Forms */}
          {useMagicLink ? (
            <form action={requestMagicLink} className="mt-5 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email-magic">E-Mail</Label>
                <Input id="email-magic" name="email" type="email" inputMode="email" autoComplete="email" required placeholder="lukas@schule.de" className="h-12 text-base" />
                <p className="text-xs text-muted-fg">Wir schicken dir einen Anmelde-Link — kein Passwort nötig.</p>
              </div>
              <Button type="submit" size="lg" className="w-full">
                <Mail className="size-4" />
                Link senden
              </Button>
            </form>
          ) : (
            <form action={loginWithCredentials} className="mt-5 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">E-Mail</Label>
                <Input id="email" name="email" type="email" inputMode="email" autoComplete="email" required placeholder="lukas@schule.de" className="h-12 text-base" />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Passwort</Label>
                  <Link href="/login/passwort-vergessen" className="text-xs font-medium text-muted-fg hover:text-brand transition-colors">
                    Vergessen?
                  </Link>
                </div>
                <Input id="password" name="password" type="password" autoComplete="current-password" required placeholder="••••••••" className="h-12 text-base" />
              </div>
              <Button type="submit" size="lg" className="w-full">
                Anmelden
                <ArrowRight className="size-4" />
              </Button>
            </form>
          )}

          {/* Demo quick-logins */}
          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-fg">Demo-Login</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <div className="space-y-2">
            {demoTiles.map((t) => (
              <form key={t.role} action={loginAsRole.bind(null, t.role)}>
                <button
                  type="submit"
                  className={cn(
                    "group flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-all duration-150",
                    t.primary
                      ? "border-brand/30 bg-brand/5 hover:border-brand/50 hover:bg-brand/8"
                      : "border-border bg-bg hover:border-brand/30 hover:bg-surface"
                  )}
                >
                  <span className={cn(
                    "grid size-9 shrink-0 place-items-center rounded-xl",
                    t.primary ? "bg-brand text-white" : "bg-surface-2 text-fg"
                  )}>
                    {t.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{ROLE_LABEL[t.role]}</p>
                      {t.primary && (
                        <span className="rounded-full bg-brand px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
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

          <details className="mt-5 rounded-xl border border-dashed border-border">
            <summary className="cursor-pointer list-none rounded-xl px-4 py-3 text-xs font-semibold text-muted-fg transition-colors hover:bg-surface">
              Demo-Zugangsdaten anzeigen
            </summary>
            <ul className="divide-y divide-border border-t border-border">
              {ACCOUNTS.map((a) => (
                <li key={a.email} className="grid grid-cols-2 gap-2 px-4 py-2 font-mono text-[11px]">
                  <span className="truncate text-fg">{a.email}</span>
                  <span className="truncate text-muted-fg">
                    {DEMO_PASSWORDS[a.email] ?? "—"}
                    <span className="ml-2 text-[10px] uppercase">{ROLE_LABEL[a.role]}</span>
                  </span>
                </li>
              ))}
            </ul>
          </details>

          <p className="mt-6 text-center text-xs text-muted-fg">
            Mit der Anmeldung akzeptierst du unsere{" "}
            <Link href="/legal/agb" className="text-brand underline-offset-2 hover:underline">AGB</Link>
            {" "}und{" "}
            <Link href="/legal/datenschutz" className="text-brand underline-offset-2 hover:underline">Datenschutzerklärung</Link>.
          </p>
        </div>
      </main>
    </div>
  );
}
