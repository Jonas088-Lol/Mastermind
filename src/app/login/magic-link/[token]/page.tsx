/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { AlertTriangle, ArrowRight } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { setPending2FA } from "@/lib/auth/pending-2fa";
import { consumeToken } from "@/lib/auth/tokens";
import { prisma } from "@/lib/db/client";
import { ClientRedirect } from "@/components/ClientRedirect";
import { ROLE_HOME, type Role, effectiveRole, getSession, setSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Anmelden",
  description: "Anmelde-Link einlösen.",
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function MagicLinkConsumePage({ params }: PageProps) {
  // Back-button guard: already logged in means the token was already used
  const existingSession = await getSession();
  if (existingSession) return <ClientRedirect to={ROLE_HOME[effectiveRole(existingSession)]} />;

  const { token } = await params;
  const consumed = await consumeToken("magic_link", token);

  if (!consumed) {
    return <InvalidLink />;
  }

  const user = consumed.userId
    ? await prisma.user.findUnique({
        where: { id: consumed.userId },
        select: { id: true, email: true, role: true, twoFactor: true },
      })
    : await prisma.user.findUnique({
        where: { email: consumed.email },
        select: { id: true, email: true, role: true, twoFactor: true },
      });

  if (!user) return <InvalidLink />;

  // 2FA-Gate: Magic-Link ersetzt nur das Passwort, nicht den zweiten Faktor —
  // gleiche Behandlung wie loginWithCredentials (kein 2FA-Bypass per E-Mail-Link).
  if (user.twoFactor) {
    await setPending2FA({ userId: user.id, email: user.email });
    redirect("/login/2fa");
  }

  await setSession({ email: user.email, realRole: user.role as Role });
  redirect(ROLE_HOME[user.role as Role]);
}

function InvalidLink() {
  return (
    <main className="grid min-h-screen place-items-center bg-surface px-6 py-10">
      <div className="w-full max-w-md border border-border bg-bg p-8">
        <div className="flex items-start gap-3 border-l-2 border-danger pl-4">
          <AlertTriangle
            className="mt-0.5 size-4 text-danger"
            strokeWidth={1.75}
          />
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-danger">
            Link ungültig
          </p>
        </div>
        <h1 className="mt-5 text-2xl font-bold tracking-tight">
          Anmelde-Link kann nicht eingelöst werden.
        </h1>
        <p className="mt-3 text-sm text-muted-fg">
          Der Link ist abgelaufen, schon verwendet oder wurde manipuliert. Du
          kannst dir auf der Login-Seite einen neuen Link schicken lassen.
        </p>
        <Link
          href="/login?method=magic"
          className="mt-8 flex w-full items-center justify-center gap-2 bg-fg px-4 py-2.5 text-sm font-semibold text-bg transition-opacity hover:opacity-90"
        >
          Neuen Link anfordern
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </main>
  );
}
