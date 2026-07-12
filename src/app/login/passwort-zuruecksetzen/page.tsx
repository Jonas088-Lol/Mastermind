/* Copyright 2026 Elian Schock, Jonas Schwenk */
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  KeyRound,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPassword } from "@/app/login/actions";

export const metadata: Metadata = {
  title: "Neues Passwort setzen",
  description: "Setze ein neues Passwort.",
};

interface PageProps {
  searchParams: Promise<{ token?: string; ok?: string; error?: string }>;
}

export default async function PasswortZuruecksetzenPage({ searchParams }: PageProps) {
  const { token, ok, error } = await searchParams;
  const success = ok === "1";
  const validToken = Boolean(token);

  if ((!validToken && !success) || error === "invalid-token") {
    return <InvalidToken />;
  }

  return (
    <main className="grid min-h-screen place-items-center bg-surface px-6 py-10">
      <div className="w-full max-w-md border border-border bg-bg p-8">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-fg transition-colors hover:text-fg"
        >
          <ArrowLeft className="size-3.5" />
          Zurück zum Login
        </Link>

        {success ? (
          <>
            <div className="mt-8 flex items-start gap-3 border-l-2 border-success pl-4">
              <Check className="mt-0.5 size-4 text-success" strokeWidth={2.5} />
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-success">
                Passwort gesetzt
              </p>
            </div>
            <h1 className="mt-5 text-2xl font-bold tracking-tight">
              Neues Passwort aktiv.
            </h1>
            <p className="mt-3 text-sm text-muted-fg">
              Du kannst dich jetzt mit deinem neuen Passwort einloggen.
              Aus Sicherheit wurden alle anderen Sessions abgemeldet.
            </p>
            <Link
              href="/login"
              className="mt-8 flex w-full items-center justify-center gap-2 bg-fg px-4 py-2.5 text-sm font-semibold text-bg transition-opacity hover:opacity-90"
            >
              Zum Login
              <ArrowRight className="size-3.5" />
            </Link>
          </>
        ) : (
          <>
            <div className="mt-8 flex items-start gap-3 border-l-2 border-brand pl-4">
              <KeyRound className="mt-0.5 size-4 text-brand" strokeWidth={1.75} />
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">
                Neues Passwort setzen
              </p>
            </div>

            <h1 className="mt-5 text-2xl font-bold tracking-tight">
              Lege ein starkes Passwort an.
            </h1>
            <p className="mt-3 text-sm text-muted-fg">
              Mindestens 12 Zeichen, idealerweise mit Groß- und Kleinbuchstaben,
              Zahlen und Sonderzeichen. Aus Sicherheit werden alle anderen
              Sessions abgemeldet.
            </p>

            {(error === "too-short" || error === "mismatch") && (
              <div
                role="alert"
                className="mt-6 flex items-start gap-3 border border-danger/40 bg-danger/6 p-3 text-sm text-danger"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <p>
                  {error === "too-short"
                    ? "Passwort muss mindestens 12 Zeichen haben."
                    : "Beide Passwort-Felder müssen identisch sein."}
                </p>
              </div>
            )}
            <form
              action={resetPassword}
              className="mt-6 space-y-4"
            >
              <input type="hidden" name="token" value={token ?? ""} />
              <div className="space-y-1.5">
                <Label htmlFor="password">Neues Passwort</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={12}
                  placeholder="••••••••••••"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password-confirm">Passwort bestätigen</Label>
                <Input
                  id="password-confirm"
                  name="password-confirm"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={12}
                  placeholder="••••••••••••"
                />
              </div>

              <ul className="space-y-1.5 border-y border-border py-4 text-xs text-muted-fg">
                <Bullet text="Mindestens 12 Zeichen" />
                <Bullet text="Wird verschlüsselt gespeichert (Argon2)" />
                <Bullet text="Aktive Sessions auf anderen Geräten werden beendet" />
              </ul>

              <Button type="submit" size="lg" className="w-full">
                <ShieldCheck className="size-4" />
                Passwort speichern
              </Button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}

function InvalidToken() {
  return (
    <main className="grid min-h-screen place-items-center bg-surface px-6 py-10">
      <div className="w-full max-w-md border border-border bg-bg p-8">
        <div className="flex items-start gap-3 border-l-2 border-danger pl-4">
          <AlertTriangle className="mt-0.5 size-4 text-danger" strokeWidth={1.75} />
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-danger">
            Token ungültig
          </p>
        </div>
        <h1 className="mt-5 text-2xl font-bold tracking-tight">
          Reset-Link nicht gültig.
        </h1>
        <p className="mt-3 text-sm text-muted-fg">
          Der Link ist abgelaufen, schon verwendet oder fehlerhaft. Du kannst
          einen neuen Link anfordern.
        </p>
        <Link
          href="/login/passwort-vergessen"
          className="mt-8 flex w-full items-center justify-center gap-2 bg-fg px-4 py-2.5 text-sm font-semibold text-bg transition-opacity hover:opacity-90"
        >
          Neuen Link anfordern
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </main>
  );
}

function Bullet({ text }: { text: string }) {
  return (
    <li className="flex items-center gap-2">
      <Check className="size-3 shrink-0 text-success" strokeWidth={2.5} />
      <span>{text}</span>
    </li>
  );
}
