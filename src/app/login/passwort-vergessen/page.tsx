import { ArrowLeft, KeyRound, Mail } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset } from "@/app/login/actions";

export const metadata: Metadata = {
  title: "Passwort vergessen",
  description: "Setze dein Passwort zurück.",
};

interface PageProps {
  searchParams: Promise<{ sent?: string; email?: string }>;
}

export default async function PasswortVergessenPage({ searchParams }: PageProps) {
  const { sent, email } = await searchParams;
  const submitted = sent === "1";

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

        <div className="mt-8 flex items-start gap-3 border-l-2 border-brand pl-4">
          <KeyRound className="mt-0.5 size-4 text-brand" strokeWidth={1.75} />
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">
            Passwort zurücksetzen
          </p>
        </div>

        {submitted ? (
          <>
            <h1 className="mt-5 text-2xl font-bold tracking-tight">
              E-Mail unterwegs.
            </h1>
            <p className="mt-3 text-sm text-muted-fg">
              Wir haben einen Reset-Link an{" "}
              <span className="font-semibold text-fg">{email ?? "deine E-Mail"}</span>{" "}
              geschickt. Der Link gilt 60 Minuten.
            </p>
            <div className="mt-6 border border-dashed border-border bg-surface p-4 text-xs">
              <p className="font-semibold uppercase tracking-wider text-muted-fg">
                Hinweis
              </p>
              <p className="mt-1.5">
                Wenn kein E-Mail-Provider konfiguriert ist (RESEND_API_KEY),
                landet der Link nur in den Server-Logs. Schau dort rein, kopier
                die URL und öffne sie im Browser, um das Reset-Formular zu sehen.
              </p>
            </div>
            <Link
              href="/login"
              className="mt-8 flex w-full items-center justify-center gap-2 border border-border-strong bg-bg px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-surface"
            >
              Zum Login
            </Link>
          </>
        ) : (
          <>
            <h1 className="mt-5 text-2xl font-bold tracking-tight">
              Passwort vergessen?
            </h1>
            <p className="mt-3 text-sm text-muted-fg">
              Trag deine E-Mail-Adresse ein. Wir schicken dir einen Link, mit
              dem du ein neues Passwort setzen kannst.
            </p>
            <form action={requestPasswordReset} className="mt-6 space-y-4">
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
                />
              </div>
              <Button type="submit" size="lg" className="w-full">
                <Mail className="size-4" />
                Reset-Link senden
              </Button>
            </form>
            <p className="mt-6 text-center text-xs text-muted-fg">
              Erinnerung wieder da? Geh zurück zum{" "}
              <Link
                href="/login"
                className="underline underline-offset-2 hover:text-fg"
              >
                Login
              </Link>
              .
            </p>
          </>
        )}
      </div>
    </main>
  );
}
