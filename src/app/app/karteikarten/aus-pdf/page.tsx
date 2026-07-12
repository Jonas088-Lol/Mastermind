/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { AusPdfForm } from "./AusPdfForm";

export const metadata: Metadata = { title: "Karten aus PDF" };

export default async function AusPdfPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect("/");

  const subjects = session.schoolId
    ? await prisma.subject.findMany({
        where: { schoolId: session.schoolId },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      })
    : [];

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-8">
      <header className="flex items-center gap-3">
        <Link href="/app/karteikarten" className="text-muted-fg hover:text-fg">
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Karteikarten</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Aus PDF generieren</h1>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>PDF hochladen</CardTitle>
        </CardHeader>
        <CardBody>
          <AusPdfForm subjects={subjects} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>So funktioniert es</CardTitle>
        </CardHeader>
        <CardBody>
          <ul className="space-y-2 text-sm text-muted-fg">
            <li className="flex items-start gap-2">
              <span className="font-mono text-xs font-bold text-brand">1</span>
              PDF mit Lernstoff hochladen (Zusammenfassungen, Skripte, Schulbuch-Seiten)
            </li>
            <li className="flex items-start gap-2">
              <span className="font-mono text-xs font-bold text-brand">2</span>
              KI analysiert den Text und extrahiert die wichtigsten Konzepte
            </li>
            <li className="flex items-start gap-2">
              <span className="font-mono text-xs font-bold text-brand">3</span>
              12–15 Frage/Antwort-Karten werden automatisch erstellt
            </li>
            <li className="flex items-start gap-2">
              <span className="font-mono text-xs font-bold text-brand">4</span>
              Das neue Deck erscheint sofort in deiner Karten-Übersicht
            </li>
          </ul>
          <p className="mt-4 text-xs text-muted-fg">
            Nur textbasierte PDFs werden unterstützt. Eingescannte Dokumente (Bilder) können nicht verarbeitet werden.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
