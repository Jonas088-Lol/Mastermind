/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { buttonVariants } from "@/components/ui/button";
import { prisma } from "@/lib/db/client";
import { getSession } from "@/lib/session";
import { TwoFactorSetup } from "./TwoFactorSetup";

export const metadata: Metadata = { title: "Zwei-Faktor-Authentifizierung" };

export default async function TwoFactorPage() {
  const session = await getSession();
  const me = session
    ? await prisma.user.findUnique({
        where: { email: session.email },
        select: { twoFactor: true },
      })
    : null;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      <header>
        <Link
          href="/app/einstellungen"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          <ChevronLeft className="size-3.5" />
          Einstellungen
        </Link>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
          Zwei-Faktor-Authentifizierung
        </h1>
        <p className="mt-1 text-sm text-muted-fg">
          Schütze deinen Account mit einem zweiten Faktor beim Login.
        </p>
      </header>

      <TwoFactorSetup initiallyEnabled={Boolean(me?.twoFactor)} />
    </div>
  );
}
