/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";

import { useMemo, useState, useTransition } from "react";
import { Eye, EyeOff, Search, Clock, CalendarClock, Plus, Copy, Check } from "lucide-react";
import { extendDemo } from "./actions";

export interface DemoBox {
  id: string;
  schoolName: string;
  password: string;
  pending: boolean;
  expired: boolean;
  remainingMs: number;
  startAt: string;
}

function formatRemaining(ms: number): string {
  const totalMin = Math.floor(ms / 60000);
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  const mins = totalMin % 60;
  if (days > 0) return `${days} Tag${days !== 1 ? "e" : ""}, ${hours} Std.`;
  if (hours > 0) return `${hours} Std., ${mins} Min.`;
  return `${mins} Min.`;
}

export function AktiveDemosClient({ demos }: { demos: DemoBox[] }) {
  const [search, setSearch] = useState("");
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function copyPassword(id: string, password: string) {
    await navigator.clipboard.writeText(password);
    setCopiedId(id);
    setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 2000);
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return demos;
    return demos.filter((d) => d.schoolName.toLowerCase().includes(q));
  }, [demos, search]);

  function toggleReveal(id: string) {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Suchleiste oben rechts */}
      <div className="flex justify-end">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-fg" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Schule suchen…"
            className="w-full rounded-xl border border-border bg-bg py-2 pl-9 pr-3 text-sm outline-none focus:border-brand/60"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface py-14 text-center text-muted-fg">
          <p className="text-3xl">🖥️</p>
          <p className="mt-2 font-semibold text-fg">{demos.length === 0 ? "Keine aktiven Demos" : "Keine Treffer"}</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((d, i) => {
            const show = revealed.has(d.id);
            return (
              <div key={d.id} className="relative flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5">
                {/* Nummerierung oben links (bezogen auf die gefilterte Reihenfolge) */}
                <span className="absolute left-3 top-3 grid size-6 place-items-center rounded-full bg-brand/10 font-mono text-xs font-bold text-brand">
                  {i + 1}
                </span>

                <div className="pl-8">
                  <p className="text-lg font-bold leading-tight">{d.schoolName}</p>
                </div>

                {/* Passwort mit Auge */}
                <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-bg px-3 py-2">
                  <code className="min-w-0 flex-1 break-all font-mono text-sm">
                    {show ? d.password : "*".repeat(Math.min(d.password.length, 24))}
                  </code>
                  <button
                    type="button"
                    onClick={() => toggleReveal(d.id)}
                    aria-label={show ? "Passwort verbergen" : "Passwort anzeigen"}
                    className="shrink-0 text-muted-fg transition-colors hover:text-fg"
                  >
                    {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => copyPassword(d.id, d.password)}
                    aria-label="Passwort kopieren"
                    className="shrink-0 text-muted-fg transition-colors hover:text-fg"
                  >
                    {copiedId === d.id ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
                  </button>
                </div>

                {/* Dauer / Status */}
                <div className="flex items-center gap-1.5 text-sm text-muted-fg">
                  {d.pending ? (
                    <>
                      <CalendarClock className="size-4 text-warning" />
                      <span>Startet am {new Date(d.startAt).toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" })}</span>
                    </>
                  ) : (
                    <>
                      <Clock className="size-4 text-success" />
                      <span>Noch {formatRemaining(d.remainingMs)}</span>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  disabled={pending}
                  onClick={() => startTransition(() => extendDemo(d.id))}
                  className="mt-1 flex items-center justify-center gap-1.5 rounded-xl border border-border bg-bg py-2 text-xs font-semibold transition-colors hover:border-brand/40 hover:bg-surface disabled:opacity-50"
                >
                  <Plus className="size-3.5" /> Um 7 Tage verlängern
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
