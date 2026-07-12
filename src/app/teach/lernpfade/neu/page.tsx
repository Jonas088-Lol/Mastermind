/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { LernpfadForm } from "./LernpfadForm";

export const metadata: Metadata = { title: "Lernpfad erstellen" };

export default async function NeuLernpfadPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "teacher") redirect("/");

  const subjects = await prisma.subject.findMany({
    where: session.schoolId ? { schoolId: session.schoolId } : {},
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <div>
        <Link href="/teach/lernpfade" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          <ArrowLeft className="size-3.5" />
          Zurück
        </Link>
      </div>
      <header>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Neuer Lernpfad</h1>
        <p className="mt-1 text-sm text-muted-fg">
          Erstelle Module mit Quizfragen für deine Schüler.
        </p>
      </header>
      <LernpfadForm subjects={subjects} />
    </div>
  );
}
