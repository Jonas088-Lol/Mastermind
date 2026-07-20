/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import { activateAccount } from "./actions";

export const metadata: Metadata = { title: "Account bestätigen · MasterMind" };

const ERROR_TEXT: Record<string, string> = {
  "too-short": "Das Passwort muss mindestens 12 Zeichen lang sein.",
  mismatch: "Die Passwörter stimmen nicht überein.",
  "invalid-token":
    "Dieser Link ist ungültig, abgelaufen oder wurde bereits verwendet. Nutze „Passwort vergessen“ auf der Login-Seite, um einen neuen Link zu erhalten.",
};

export default async function VerifyPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-md border border-border bg-bg p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">
          MasterMind
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Account bestätigen</h1>
        <p className="mt-2 text-sm text-muted-fg">
          Für dich wurde ein Account angelegt. Bestätige deine E-Mail-Adresse,
          indem du jetzt dein persönliches Passwort festlegst.
        </p>

        {error && (
          <p className="mt-4 border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
            {ERROR_TEXT[error] ?? "Etwas ist schiefgelaufen. Bitte versuche es erneut."}
          </p>
        )}

        <form action={activateAccount} className="mt-6 flex flex-col gap-4">
          <input type="hidden" name="token" value={token} />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-semibold">
              Neues Passwort
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={12}
              autoComplete="new-password"
              placeholder="Mindestens 12 Zeichen"
              className="h-10 border border-border bg-bg px-3 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password-confirm" className="text-sm font-semibold">
              Passwort wiederholen
            </label>
            <input
              id="password-confirm"
              name="password-confirm"
              type="password"
              required
              minLength={12}
              autoComplete="new-password"
              className="h-10 border border-border bg-bg px-3 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <button
            type="submit"
            className="mt-2 inline-flex h-10 items-center justify-center bg-brand px-5 text-sm font-semibold text-brand-fg transition-opacity hover:opacity-90"
          >
            Bestätigen & Passwort setzen
          </button>
        </form>

        <p className="mt-4 text-xs text-muted-fg">
          Der Link aus deiner E-Mail ist 24 Stunden gültig und einmalig verwendbar.
        </p>
      </div>
    </div>
  );
}
