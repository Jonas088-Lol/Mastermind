import { Lock, Mail, ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import { loginMail } from "./actions";

export const metadata: Metadata = { title: "Postfach · Anmelden" };

export default async function MailLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; redirect?: string }>;
}) {
  const { error, redirect } = await searchParams;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-bg px-5">
      <div className="w-full max-w-sm space-y-8">

        {/* Header */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-brand/10">
            <Mail className="size-6 text-brand" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Postfach</h1>
            <p className="mt-1 text-sm text-muted-fg">konvertis.de</p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-surface p-7 shadow-sm">
          <div className="mb-6 flex items-center gap-2">
            <Lock className="size-3.5 text-muted-fg" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-fg">
              Anmelden
            </span>
          </div>

          {error && (
            <div className="mb-5 rounded-lg border border-danger/30 bg-danger/6 px-3 py-2.5 text-xs text-danger">
              Benutzername oder Passwort falsch.
            </div>
          )}

          <form action={loginMail} className="space-y-4">
            {redirect && <input type="hidden" name="redirect" value={redirect} />}

            <div className="space-y-1.5">
              <label htmlFor="username" className="text-sm font-medium">
                Benutzername
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                autoFocus
                required
                placeholder="Admin"
                className="h-11 w-full rounded-lg border border-border bg-bg px-3 text-sm placeholder:text-muted-fg focus:outline-none focus:ring-2 focus:ring-brand/40"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium">
                Passwort
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
                className="h-11 w-full rounded-lg border border-border bg-bg px-3 text-sm placeholder:text-muted-fg focus:outline-none focus:ring-2 focus:ring-brand/40"
              />
            </div>

            <button
              type="submit"
              className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand text-sm font-semibold text-white hover:bg-brand/90 active:scale-[0.98]"
            >
              Anmelden
              <ArrowRight className="size-4" />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
