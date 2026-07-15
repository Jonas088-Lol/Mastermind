/* Copyright 2026 Elian Schock, Jonas Schwenk */
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { buttonVariants } from "@/components/ui/button";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { NewDeckForm } from "./NewDeckForm";

export const metadata: Metadata = { title: "Neues Deck" };

export default async function NeueDeckPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect("/");

  const subjects = session.schoolId
    ? await prisma.subject.findMany({
        where: { schoolId: session.schoolId },
        orderBy: { name: "asc" },
        select: { id: true, name: true, shortName: true, color: true },
      })
    : [];

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-8">
      <div>
        <Link
          href="/app/karteikarten"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2")}
        >
          ← Zurück zu Karteikarten
        </Link>
      </div>

      <header>
        <h1 className="text-2xl font-bold tracking-tight">Neues Deck erstellen</h1>
        <p className="mt-1 text-sm text-muted-fg">Erstelle ein neues Karteideck zum Lernen.</p>
      </header>

      <NewDeckForm
        subjects={subjects.map((s) => ({ id: s.id, name: s.name, shortName: s.shortName }))}
      />
    </div>
  );
}
