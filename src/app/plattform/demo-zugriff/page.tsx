/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { KeyRound } from "lucide-react";
import { getSession, isSuper } from "@/lib/session";
import { DemoZugriffForm } from "./DemoZugriffForm";

export const metadata: Metadata = { title: "Demo-Zugriff · Plattform" };

export default async function DemoZugriffPage() {
  const session = await getSession();
  if (!session || !isSuper(session)) redirect("/login");

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Plattform</p>
        <h1 className="mt-1 flex items-center gap-2.5 text-3xl font-bold tracking-tight">
          <KeyRound className="size-7 text-brand" /> Demo-Zugriff
        </h1>
        <p className="mt-1 text-sm text-muted-fg">
          Erstelle einen 7-Tage-Demozugang für eine Schule. Es werden automatisch Demo-Accounts
          (2× Schüler, Lehrkraft, Sekretariat, Elternteil, Schulleitung) angelegt.
        </p>
      </header>
      <DemoZugriffForm />
    </div>
  );
}
