/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { effectiveRole, getSession } from "@/lib/session";
import { isAiConfigured } from "@/lib/ai";
import { ElternbriefClient } from "./ElternbriefClient";

export const metadata: Metadata = { title: "Elternbrief-Generator" };

export default async function ElternbriefPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "teacher") redirect("/");

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Lehrer</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Elternbrief-Generator</h1>
        <p className="mt-1 text-sm text-muted-fg">
          Stichpunkte rein, fertiger Brief raus — du behältst die Endkontrolle und kannst alles bearbeiten.
        </p>
      </header>
      <ElternbriefClient aiConfigured={isAiConfigured()} />
    </div>
  );
}
