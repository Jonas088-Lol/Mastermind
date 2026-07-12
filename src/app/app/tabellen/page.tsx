/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { Clock, Grid3X3, Plus } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { createSpreadsheet } from "./actions";

export const metadata: Metadata = { title: "Tabellen · MasterMind" };

export default async function TabellenPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect("/");

  const sheets = await prisma.spreadsheet.findMany({
    where: { userId: session.userId },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Office</p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Tabellen</h1>
          <p className="mt-1 text-sm text-muted-fg">Excel-Alternative · Formeln · CSV-Export</p>
        </div>
        <form action={createSpreadsheet}>
          <button
            type="submit"
            className="flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-brand-fg transition-colors hover:bg-brand/90"
          >
            <Plus className="size-4" strokeWidth={2} />
            Neue Tabelle
          </button>
        </form>
      </header>

      {sheets.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border bg-bg px-8 py-16 text-center">
          <Grid3X3 className="mx-auto size-12 text-muted-fg" strokeWidth={1} />
          <p className="mt-4 font-semibold">Noch keine Tabellen</p>
          <p className="mt-1 text-sm text-muted-fg">
            Erstelle deine erste Tabelle mit dem Button oben.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sheets.map((sheet) => (
            <Link
              key={sheet.id}
              href={`/app/tabellen/${sheet.id}`}
              className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-bg transition-shadow hover:shadow-md"
            >
              {/* Grid preview */}
              <div className="relative flex h-40 flex-col overflow-hidden bg-white">
                {/* Fake grid lines */}
                <div className="absolute inset-0 grid grid-cols-5 border-b border-gray-200">
                  {Array.from({ length: 5 }).map((_, c) => (
                    <div key={c} className="border-r border-gray-200" />
                  ))}
                </div>
                <div className="absolute inset-0 flex flex-col">
                  {Array.from({ length: 6 }).map((_, r) => (
                    <div key={r} className="h-[26px] border-b border-gray-200" />
                  ))}
                </div>
                {/* Header row */}
                <div className="absolute inset-x-0 top-0 flex h-[26px] bg-gray-50 border-b border-gray-200">
                  {["A", "B", "C", "D", "E"].map((col) => (
                    <div
                      key={col}
                      className="flex-1 border-r border-gray-200 text-center text-[10px] font-semibold text-gray-400 leading-[26px]"
                    >
                      {col}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 border-t border-border px-4 py-3">
                <Grid3X3 className="size-3.5 shrink-0 text-muted-fg" strokeWidth={1.75} />
                <p className="flex-1 truncate text-xs font-medium">{sheet.title}</p>
                <span className="flex items-center gap-1 text-[11px] text-muted-fg">
                  <Clock className="size-3" strokeWidth={1.75} />
                  {sheet.updatedAt.toLocaleDateString("de-DE", {
                    day: "2-digit",
                    month: "short",
                  })}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
