/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { AlertCircle, ArrowLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ClientRedirect } from "@/components/ClientRedirect";
import { getPending2FA } from "@/lib/auth/pending-2fa";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";
import { cancelTwoFactorLogin, verifyLoginTwoFactor } from "@/app/login/actions";

export const metadata: Metadata = {
  title: "2-Faktor-Authentifizierung",
  description: "Schritt 2 — Code aus deiner Authenticator-App eingeben.",
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function TwoFactorLoginPage({ searchParams }: PageProps) {
  // Back-button guard: if already fully logged in, return home via replace (not push)
  const session = await getSession();
  if (session) return <ClientRedirect to={ROLE_HOME[effectiveRole(session)]} />;

  const pending = await getPending2FA();
  // No pending state + no session = stale / back-button navigation; go to login silently
  if (!pending) return <ClientRedirect to="/login" />;

  const { error } = await searchParams;
  const masked = pending.email.replace(
    /^(.{2})(.*?)(@.*)$/,
    (_, a: string, b: string, c: string) => `${a}${"•".repeat(b.length)}${c}`
  );

  return (
    <main className="grid min-h-screen place-items-center bg-surface px-6 py-10">
      <div className="w-full max-w-md border border-border bg-bg p-8">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-fg transition-colors hover:text-fg"
        >
          <ArrowLeft className="size-3.5" />
          Anderen Account
        </Link>

        <div className="mt-8 flex items-start gap-3 border-l-2 border-brand pl-4">
          <ShieldCheck
            className="mt-0.5 size-4 text-brand"
            strokeWidth={1.75}
          />
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">
            Schritt 2 · 2-Faktor-Authentifizierung
          </p>
        </div>

        <h1 className="mt-5 text-2xl font-bold tracking-tight">
          6-stelligen Code eingeben
        </h1>
        <p className="mt-3 text-sm text-muted-fg">
          Öffne deine Authenticator-App und gib den aktuellen Code für{" "}
          <span className="font-mono text-fg">{masked}</span> ein.
        </p>

        {error === "invalid" && (
          <div
            role="alert"
            className="mt-6 flex items-start gap-3 border border-danger/40 bg-danger/6 p-3 text-sm text-danger"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <p>
              Code stimmt nicht. Versuche es erneut — ein neuer Code wird alle
              30 Sekunden generiert.
            </p>
          </div>
        )}

        <form action={verifyLoginTwoFactor} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="code">Code</Label>
            <Input
              id="code"
              name="code"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              autoComplete="one-time-code"
              required
              autoFocus
              placeholder="123 456"
              className="text-center font-mono text-lg tracking-[0.4em]"
            />
            <p className="text-xs text-muted-fg">
              Toleranz ±30 Sek. · Code wird einmalig verbraucht.
            </p>
          </div>
          <Button type="submit" size="lg" className="w-full">
            <ShieldCheck className="size-4" />
            Anmelden
          </Button>
        </form>

        <form action={cancelTwoFactorLogin} className="mt-6 text-center">
          <button
            type="submit"
            className="text-xs font-medium text-muted-fg transition-colors hover:text-fg"
          >
            Abbrechen und zur Login-Seite
          </button>
        </form>

        <p className="mt-8 border-t border-border pt-5 text-center text-xs text-muted-fg">
          Authenticator verloren? Wende dich an deinen Schul-Admin —
          Backup-Codes oder Reset müssen dort freigegeben werden.
        </p>
      </div>
    </main>
  );
}
