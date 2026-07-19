/* Copyright 2026 Elian Schock, Jonas Schwenk */
import {
  AlertCircle,
  ArrowRight,
  Lock,
  Mail,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandLogo } from "@/components/BrandLogo";
import {
  loginWithCredentials,
  loginAsDemoRole,
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

// Demo-Quick-Login-Kacheln — jede meldet in einen demo.*-Wegwerf-Account an.
const DEMO_TILES: { role: string; label: string; icon: string }[] = [
  { role: "super",          label: "Plattform-Admin", icon: "✨" },
  { role: "admin",          label: "Schul-Admin",     icon: "🏫" },
  { role: "rector",         label: "Schulleiter",     icon: "🎓" },
  { role: "vice_rector",    label: "Konrektor",       icon: "🎓" },
  { role: "secretary",      label: "Sekretariat",     icon: "📋" },
  { role: "teacher",        label: "Lehrkraft",       icon: "👩‍🏫" },
  { role: "student",        label: "Schüler",         icon: "🎒" },
  { role: "student2",       label: "Schüler 2",       icon: "🎒" },
  { role: "student3",       label: "Sprecher & Zeitung", icon: "📰" },
  { role: "parent",         label: "Elternteil",      icon: "👪" },
  { role: "school_company", label: "Schulträger",     icon: "🏢" },
];

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error, method, sent } = await searchParams;
  const useMagicLink = method === "magic";

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
            Die Schule der Zukunft.
          </p>
          <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight xl:text-4xl">
            Lernen. Kommunizieren. Organisieren.
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/70">
            Server in Deutschland · DSGVO-konform
          </p>
        </div>

        <ul className="relative space-y-2.5 text-sm text-white/80">
          {[
            "DSGVO-konforme Entwicklung",
            "AV-Verträge für Schulen verfügbar",
            "Kein Datenverkauf",
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
          {(error === "demo-missing" || error === "demo-disabled") && (
            <div role="alert" className="mt-5 flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/6 px-4 py-3 text-sm text-warning">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <p>{error === "demo-disabled"
                ? "Demo-Login ist deaktiviert."
                : "Demo-Accounts noch nicht angelegt. Führe das Seed-Skript aus."}</p>
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

          {/* Demo quick-logins (nur Demo-Wegwerf-Accounts) */}
          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-fg">Demo-Login</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            {DEMO_TILES.map((t) => (
              <form key={t.role} action={loginAsDemoRole.bind(null, t.role)}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-2.5 rounded-xl border border-border bg-bg px-3 py-2.5 text-left transition-colors hover:border-brand/30 hover:bg-surface"
                >
                  <span className="text-lg leading-none">{t.icon}</span>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">{t.label}</span>
                  <ArrowRight className="size-3.5 shrink-0 text-muted-fg" />
                </button>
              </form>
            ))}
          </div>

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
