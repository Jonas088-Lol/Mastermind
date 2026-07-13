/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MonitorPlay } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { getSession, isSuper } from "@/lib/session";
import { demoWindow, decryptDemoPassword } from "@/lib/demo";
import { AktiveDemosClient, type DemoBox } from "./AktiveDemosClient";

export const metadata: Metadata = { title: "Aktive Demos · Plattform" };
export const dynamic = "force-dynamic";

export default async function AktiveDemosPage() {
  const session = await getSession();
  if (!session || !isSuper(session)) redirect("/login");

  const rows = await prisma.demoAccess.findMany({
    orderBy: { createdAt: "desc" }, // neueste zuerst
    select: { id: true, schoolName: true, passwordEnc: true, activatesAt: true, endsAt: true, createdAt: true },
  });

  // Nur nicht abgelaufene (aktive + geplante) Zugänge anzeigen.
  const boxes: DemoBox[] = rows
    .map((r) => {
      const win = demoWindow(r.activatesAt, r.endsAt);
      return {
        id: r.id,
        schoolName: r.schoolName,
        password: decryptDemoPassword(r.passwordEnc),
        pending: win.pending,
        expired: win.expired,
        remainingMs: win.remainingMs,
        startAt: r.activatesAt.toISOString(),
      };
    })
    .filter((b) => !b.expired);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Plattform</p>
        <h1 className="mt-1 flex items-center gap-2.5 text-3xl font-bold tracking-tight">
          <MonitorPlay className="size-7 text-brand" /> Aktive Demos
        </h1>
        <p className="mt-1 text-sm text-muted-fg">{boxes.length} laufende bzw. geplante Demo-Zugänge.</p>
      </header>
      <AktiveDemosClient demos={boxes} />
    </div>
  );
}
