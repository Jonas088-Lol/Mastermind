/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";

import { useState } from "react";
import { Plus, X, Calendar } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { key: "personal", label: "Persönlich", color: "#6366f1" },
  { key: "exam", label: "Probe / Klausur", color: "#ef4444" },
  { key: "appointment", label: "Termin", color: "#f59e0b" },
] as const;

export function PlanAddEvent({ defaultDate }: { defaultDate?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  // Lokales Datum statt toISOString(): das wäre UTC — zwischen Mitternacht und
  // 1/2 Uhr (MEZ/MESZ) würde sonst der Vortag vorausgefüllt.
  const [date, setDate] = useState(() => {
    if (defaultDate) return defaultDate;
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
  });
  const [time, setTime] = useState("");
  const [category, setCategory] = useState<"personal" | "exam" | "appointment">("personal");
  const [allDay, setAllDay] = useState(true);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !date) return;
    setSaving(true);
    setError(null);

    const startAt = allDay
      ? new Date(date + "T00:00:00").toISOString()
      : new Date(date + "T" + (time || "08:00") + ":00").toISOString();

    const color = CATEGORIES.find((c) => c.key === category)?.color ?? "#6366f1";

    try {
      const res = await fetch("/api/personal-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), startAt, allDay, color, category }),
      });
      if (!res.ok) throw new Error("Speichern fehlgeschlagen");
    } catch {
      setSaving(false);
      setError("Termin konnte nicht gespeichert werden. Bitte erneut versuchen.");
      return;
    }

    setSaving(false);
    setOpen(false);
    setTitle("");
    setTime("");
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-xl border border-border bg-bg px-3 py-2 text-sm font-medium text-muted-fg transition-colors hover:border-brand/40 hover:text-brand"
      >
        <Plus className="size-4" />
        Termin
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-bg shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-2">
                <Calendar className="size-4 text-brand" />
                <h2 className="text-sm font-bold">Neuer Termin</h2>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Schließen" className="rounded-lg p-1 hover:bg-surface">
                <X className="size-4 text-muted-fg" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 p-5">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-fg">Titel</label>
                <input
                  autoFocus
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="z.B. Mathe-Probe, Zahnarzt …"
                  className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-fg">Datum</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-fg">Uhrzeit</label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => { setTime(e.target.value); setAllDay(!e.target.value); }}
                    disabled={allDay}
                    className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 disabled:opacity-40"
                  />
                </div>
              </div>

              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} className="rounded" />
                <span className="text-sm text-muted-fg">Ganztägig</span>
              </label>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-fg">Kategorie</label>
                <div className="flex gap-2">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => setCategory(c.key)}
                      className={cn(
                        "flex-1 rounded-xl border px-2 py-1.5 text-xs font-medium transition-colors",
                        category === c.key
                          ? "border-transparent text-white"
                          : "border-border text-muted-fg hover:border-border-strong"
                      )}
                      style={category === c.key ? { backgroundColor: c.color } : {}}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <p className="text-xs text-danger">{error}</p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 rounded-xl border border-border py-2 text-sm font-medium text-muted-fg hover:bg-surface"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={saving || !title.trim()}
                  className="flex-1 rounded-xl bg-brand py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                >
                  {saving ? "Speichere…" : "Speichern"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export function DeleteEventButton({ id }: { id: string }) {
  const router = useRouter();
  async function del() {
    try {
      const res = await fetch(`/api/personal-events?id=${id}`, { method: "DELETE" });
      if (!res.ok) return; // Fehler: nichts entfernen, Liste bleibt unverändert
    } catch {
      return;
    }
    router.refresh();
  }
  return (
    <button onClick={del} aria-label="Termin löschen" className="rounded p-0.5 text-muted-fg opacity-0 transition-opacity hover:text-danger group-hover:opacity-100">
      <X className="size-3" />
    </button>
  );
}
