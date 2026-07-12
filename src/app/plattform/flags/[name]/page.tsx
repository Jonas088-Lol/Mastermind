/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSession, isSuper } from "@/lib/session";
import { prisma } from "@/lib/db/client";
import { deleteFlag, updateFlag } from "../actions";

export const metadata: Metadata = { title: "Flag bearbeiten" };

interface PageProps {
  params: Promise<{ name: string }>;
}

export default async function FlagEditPage({ params }: PageProps) {
  const session = await getSession();
  if (!session || !isSuper(session)) redirect("/login");

  const { name } = await params;
  const flag = await prisma.featureFlag.findUnique({ where: { name } });
  if (!flag) notFound();

  const saveAction = updateFlag.bind(null, flag.name);
  const removeAction = deleteFlag.bind(null, flag.name);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <header className="flex items-center gap-3">
        <Link href="/plattform/flags" className="text-muted-fg hover:text-fg">
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Feature-Flags</p>
          <h1 className="mt-1 font-mono text-2xl font-bold tracking-tight sm:text-3xl">{flag.name}</h1>
        </div>
      </header>

      <form action={saveAction} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="description" className="text-sm font-semibold">Beschreibung</label>
          <input
            id="description"
            name="description"
            defaultValue={flag.description}
            required
            className="h-10 border border-border bg-bg px-3 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="state" className="text-sm font-semibold">Status</label>
            <select
              id="state"
              name="state"
              defaultValue={flag.state}
              className="h-10 border border-border bg-bg px-3 text-sm focus:border-brand focus:outline-none"
            >
              <option value="off">Aus</option>
              <option value="on">An</option>
              <option value="rollout">Rollout</option>
              <option value="experiment">Experiment</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="rollout" className="text-sm font-semibold">Rollout %</label>
            <input
              id="rollout"
              name="rollout"
              type="number"
              min={0}
              max={100}
              defaultValue={flag.rollout}
              className="h-10 border border-border bg-bg px-3 text-sm focus:border-brand focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="scope" className="text-sm font-semibold">Scope</label>
            <input
              id="scope"
              name="scope"
              defaultValue={flag.scope}
              className="h-10 border border-border bg-bg px-3 text-sm focus:border-brand focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="owner" className="text-sm font-semibold">Owner</label>
            <input
              id="owner"
              name="owner"
              defaultValue={flag.owner}
              className="h-10 border border-border bg-bg px-3 text-sm focus:border-brand focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-border pt-4">
          <Link href="/plattform/flags" className="text-sm text-muted-fg hover:text-fg">
            Abbrechen
          </Link>
          <button
            type="submit"
            className="inline-flex h-10 items-center justify-center gap-2 bg-fg px-5 text-sm font-semibold text-bg transition-opacity hover:opacity-90"
          >
            Speichern
          </button>
        </div>
      </form>

      <div className="border-t border-border pt-6">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-danger">Gefahrenzone</p>
        <form action={removeAction}>
          <button
            type="submit"
            className="inline-flex h-9 items-center gap-2 border border-danger px-4 text-xs font-semibold text-danger transition-colors hover:bg-danger hover:text-bg"
          >
            Flag löschen
          </button>
        </form>
      </div>
    </div>
  );
}
