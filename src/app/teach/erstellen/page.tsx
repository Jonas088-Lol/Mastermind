/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BookMarked,
  CheckSquare,
  ClipboardEdit,
  ClipboardList,
  FileText,
  Layers,
  LineChart,
  MessageSquare,
  Sparkles,
  Swords,
  Target,
  type LucideIcon,
} from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { effectiveRole, getSession } from "@/lib/session";
import { can } from "@/lib/permissions";
import {
  CREATE_ACTIONS,
  groupCreateActions,
  type CreateAction,
} from "@/lib/create-hub";
import { getWorkspaceMode } from "@/lib/workspace-prefs";
import { setWorkspaceMode } from "./actions";

export const metadata: Metadata = { title: "Erstellen" };

const ICONS: Record<string, LucideIcon> = {
  bookMarked: BookMarked,
  checkSquare: CheckSquare,
  clipboardEdit: ClipboardEdit,
  clipboardList: ClipboardList,
  fileText: FileText,
  layers: Layers,
  lineChart: LineChart,
  messageSquare: MessageSquare,
  sparkles: Sparkles,
  swords: Swords,
  target: Target,
};

export default async function ErstellenPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "teacher") redirect("/");

  const mode = await getWorkspaceMode(session.userId);

  // Gesperrte Funktionen gar nicht erst anbieten — sonst landet man auf einer
  // Seite, die einen wieder wegschickt.
  const allowed: CreateAction[] = [];
  for (const action of CREATE_ACTIONS) {
    if (action.capability && !(await can(session, action.capability))) continue;
    allowed.push(action);
  }
  const groups = groupCreateActions(allowed);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">
          Lehrkraft
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Erstellen</h1>
        <p className="mt-1 text-sm text-muted-fg">
          Alles, was du anlegen kannst — an einem Ort.
        </p>
      </header>

      {/* ── Arbeitsweise ──────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Arbeitsweise</CardTitle>
        </CardHeader>
        <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-fg">
            {mode === "unified"
              ? "Zusammengefasst — Vorlagen, KI-Generator, Lernpfade und Boss-Kämpfe erreichst du über diese Seite statt über eigene Reiter."
              : "Getrennt — jede Funktion hat ihren eigenen Reiter in der Navigation. Diese Seite bleibt als Übersicht zusätzlich erhalten."}
          </p>
          <form action={setWorkspaceMode} className="shrink-0">
            <input
              type="hidden"
              name="mode"
              value={mode === "unified" ? "separate" : "unified"}
            />
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center rounded-lg border border-border px-3 py-2 text-xs font-semibold transition-colors hover:border-brand/40 hover:bg-surface sm:w-auto"
            >
              {mode === "unified" ? "Getrennte Reiter nutzen" : "Alles zusammenfassen"}
            </button>
          </form>
        </CardBody>
      </Card>

      {/* ── Erstell-Wege ──────────────────────────────────────────────────── */}
      {groups.map((group) => (
        <section key={group.group} className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">
            {group.label}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {group.actions.map((action) => {
              const Icon = ICONS[action.icon] ?? FileText;
              return (
                <Link
                  key={action.id}
                  href={action.href}
                  className="group flex flex-col gap-2 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-brand/40"
                >
                  <span className="inline-flex size-9 items-center justify-center rounded-full bg-brand/10 text-brand">
                    <Icon className="size-4" strokeWidth={1.75} />
                  </span>
                  <span className="text-sm font-semibold">{action.label}</span>
                  <span className="text-xs leading-relaxed text-muted-fg">
                    {action.description}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
