import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSession, isSuper } from "@/lib/session";
import { createFlag } from "../actions";

export const metadata: Metadata = { title: "Neuer Flag" };

interface PageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function NeuerFlagPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session || !isSuper(session)) redirect("/login");

  const { error } = await searchParams;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <header className="flex items-center gap-3">
        <Link href="/plattform/flags" className="text-muted-fg hover:text-fg">
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Feature-Flags</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Neuer Flag</h1>
        </div>
      </header>

      {error && (
        <div className="border-l-2 border-danger bg-danger/[0.06] px-4 py-3 text-sm text-danger">
          {decodeURIComponent(error)}
        </div>
      )}

      <form action={createFlag} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="name" className="text-sm font-semibold">
            Name <span className="font-mono text-xs text-muted-fg">(snake.case)</span>
          </label>
          <input
            id="name"
            name="name"
            required
            placeholder="z. B. ki.tutor.v4"
            className="h-10 border border-border bg-bg px-3 font-mono text-sm placeholder:font-sans placeholder:text-muted-fg focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="description" className="text-sm font-semibold">Beschreibung</label>
          <input
            id="description"
            name="description"
            required
            placeholder="Was macht dieser Flag?"
            className="h-10 border border-border bg-bg px-3 text-sm placeholder:text-muted-fg focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="state" className="text-sm font-semibold">Status</label>
            <select
              id="state"
              name="state"
              defaultValue="off"
              className="h-10 border border-border bg-bg px-3 text-sm focus:border-brand focus:outline-none"
            >
              <option value="off">Aus</option>
              <option value="on">An</option>
              <option value="rollout">Rollout</option>
              <option value="experiment">Experiment</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="rollout" className="text-sm font-semibold">
              Rollout % <span className="font-normal text-muted-fg">(bei Rollout/Experiment)</span>
            </label>
            <input
              id="rollout"
              name="rollout"
              type="number"
              min={0}
              max={100}
              defaultValue={0}
              className="h-10 border border-border bg-bg px-3 text-sm focus:border-brand focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="scope" className="text-sm font-semibold">Scope</label>
            <input
              id="scope"
              name="scope"
              placeholder="z. B. alle Pro · Enterprise"
              className="h-10 border border-border bg-bg px-3 text-sm placeholder:text-muted-fg focus:border-brand focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="owner" className="text-sm font-semibold">Owner</label>
            <input
              id="owner"
              name="owner"
              defaultValue="Plattform"
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
            Flag erstellen
          </button>
        </div>
      </form>
    </div>
  );
}
