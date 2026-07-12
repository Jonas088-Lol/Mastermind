/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, Sparkles, Swords, ChevronDown, ChevronUp } from "lucide-react";
import { BOSS_TIERS, type BossTier } from "@/lib/game";
import { createBossBattle } from "./actions";

const TIER_OPTIONS: { value: BossTier; label: string; color: string; emoji: string }[] = [
  { value: "common",    label: "Gewöhnlich",   color: "#94a3b8", emoji: "⚪" },
  { value: "uncommon",  label: "Ungewöhnlich", color: "#4ade80", emoji: "🟢" },
  { value: "rare",      label: "Selten",       color: "#60a5fa", emoji: "🔵" },
  { value: "epic",      label: "Episch",       color: "#a78bfa", emoji: "🟣" },
  { value: "legendary", label: "Legendär",     color: "#fbbf24", emoji: "🟠" },
  { value: "mythic",    label: "Mythisch",     color: "#f87171", emoji: "🔴" },
  { value: "secret",    label: "Geheim",       color: "#facc15", emoji: "⭐" },
];

const SUBJECTS = [
  "Mathematik", "Deutsch", "Englisch", "Geschichte", "Geographie",
  "Biologie", "Chemie", "Physik", "Informatik", "Kunst", "Musik",
  "Sport", "Religion", "Ethik", "Wirtschaft & Recht",
];

interface Question {
  question: string;
  optionA:  string;
  optionB:  string;
  optionC:  string;
  optionD:  string;
  correct:  number; // 0–3
}

function emptyQuestion(): Question {
  return { question: "", optionA: "", optionB: "", optionC: "", optionD: "", correct: 0 };
}

export default function NeuBossPage() {
  const [tier, setTier]       = useState<BossTier>("common");
  const [useAI, setUseAI]     = useState(false);
  const [questions, setQ]     = useState<Question[]>([emptyQuestion()]);
  const [expanded, setExpanded] = useState<number[]>([0]);
  const [isPending, startTx]  = useTransition();

  const tierData = BOSS_TIERS[tier];

  function addQuestion() {
    const idx = questions.length;
    setQ((qs) => [...qs, emptyQuestion()]);
    setExpanded((ex) => [...ex, idx]);
  }

  function removeQuestion(i: number) {
    setQ((qs) => qs.filter((_, j) => j !== i));
    setExpanded((ex) => ex.filter((n) => n !== i).map((n) => (n > i ? n - 1 : n)));
  }

  function updateQ(i: number, field: keyof Question, value: string | number) {
    setQ((qs) => qs.map((q, j) => j === i ? { ...q, [field]: value } : q));
  }

  function toggleExpand(i: number) {
    setExpanded((ex) => ex.includes(i) ? ex.filter((n) => n !== i) : [...ex, i]);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd   = new FormData(form);
    // Encode manual questions as JSON
    if (!useAI) fd.set("questions", JSON.stringify(questions));
    startTx(async () => { await createBossBattle(fd); });
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <header>
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-fg">Boss-Kampf</p>
        <h1 className="mt-1 text-2xl font-black">Neuen Kampf erstellen</h1>
        <p className="mt-1 text-sm text-muted-fg">
          Erstelle einen Boss-Kampf mit eigenen Fragen oder lass die KI Fragen generieren.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* ── Basics ── */}
        <section className="rounded-2xl border border-border bg-bg p-5 space-y-4">
          <h2 className="text-sm font-bold text-muted-fg uppercase tracking-widest">Boss-Details</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-fg uppercase tracking-wider">Boss-Name *</label>
              <input name="name" required placeholder="z.B. Zahlenschatten" className="h-10 rounded-lg border border-border bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/50" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-fg uppercase tracking-wider">Icon (Emoji) *</label>
              <input name="icon" defaultValue="👹" maxLength={4} required className="h-10 rounded-lg border border-border bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/50" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted-fg uppercase tracking-wider">Lore / Hintergrundgeschichte</label>
            <textarea name="lore" rows={2} placeholder="Optionaler dramatischer Einleitungstext für den Boss…" className="rounded-lg border border-border bg-surface px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand/50" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-fg uppercase tracking-wider">Fach</label>
              <select name="subject" className="h-10 rounded-lg border border-border bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/50">
                <option value="">— Alle Fächer —</option>
                {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-fg uppercase tracking-wider">Jahrgangsstufe</label>
              <select name="gradeLevel" className="h-10 rounded-lg border border-border bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/50">
                <option value="">— Alle —</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
                  <option key={g} value={g}>Klasse {g}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* ── Tier + Timing ── */}
        <section className="rounded-2xl border border-border bg-bg p-5 space-y-4">
          <h2 className="text-sm font-bold text-muted-fg uppercase tracking-widest">Schwierigkeit & Zeitplan</h2>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted-fg uppercase tracking-wider">Boss-Tier</label>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
              {TIER_OPTIONS.map(({ value, label, color, emoji }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTier(value)}
                  className="flex flex-col items-center gap-1 rounded-xl border-2 px-2 py-2 text-[10px] font-black uppercase transition-all"
                  style={{
                    borderColor: tier === value ? color : "transparent",
                    backgroundColor: tier === value ? `${color}18` : "var(--color-surface)",
                    color: tier === value ? color : "var(--color-muted-fg)",
                  }}
                >
                  <span className="text-lg leading-none">{emoji}</span>
                  {label}
                </button>
              ))}
            </div>
            <input type="hidden" name="tier" value={tier} />
            <p className="text-[11px] text-muted-fg">
              HP: {tierData.hp} · Münzen: {tierData.coinReward} · MVP: {tierData.mvpCoinReward} · XP: {tierData.xpReward}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-fg uppercase tracking-wider">Start in (Stunden)</label>
              <input name="startHours" type="number" min={0} max={168} defaultValue={0} className="h-10 rounded-lg border border-border bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/50" />
              <p className="text-[11px] text-muted-fg">0 = sofort aktiv</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-fg uppercase tracking-wider">Dauer (Stunden)</label>
              <input name="durationHours" type="number" min={1} max={168} defaultValue={24} className="h-10 rounded-lg border border-border bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/50" />
            </div>
          </div>
        </section>

        {/* ── Questions ── */}
        <section className="rounded-2xl border border-border bg-bg p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-muted-fg uppercase tracking-widest">Fragen</h2>
            <span className="text-xs text-muted-fg">{questions.length} Frage{questions.length !== 1 ? "n" : ""}</span>
          </div>

          {/* AI toggle */}
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3">
            <input
              type="checkbox"
              name="useAI"
              checked={useAI}
              onChange={(e) => setUseAI(e.target.checked)}
              className="accent-brand size-4"
            />
            <Sparkles className="size-4 text-brand shrink-0" />
            <div>
              <p className="text-sm font-semibold">KI-Fragen generieren</p>
              <p className="text-[11px] text-muted-fg">Die KI erstellt automatisch passende Fragen basierend auf Fach und Klasse</p>
            </div>
          </label>

          {useAI && (
            <div className="flex flex-col gap-1.5 rounded-xl border border-brand/20 bg-brand/5 p-4">
              <label className="text-xs font-semibold text-muted-fg uppercase tracking-wider">Anzahl KI-Fragen</label>
              <input name="aiCount" type="number" min={5} max={20} defaultValue={10} className="h-10 w-32 rounded-lg border border-border bg-bg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/50" />
              <p className="text-[11px] text-muted-fg">5–20 Fragen. Die KI generiert diese beim Erstellen des Kampfes.</p>
            </div>
          )}

          {/* Manual questions */}
          {!useAI && (
            <div className="space-y-3">
              {questions.map((q, i) => {
                const isOpen = expanded.includes(i);
                const isValid = q.question && q.optionA && q.optionB && q.optionC && q.optionD;
                return (
                  <div key={i} className="rounded-xl border border-border bg-surface overflow-hidden">
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 px-4 py-3 text-left"
                      onClick={() => toggleExpand(i)}
                    >
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand/10 text-xs font-black text-brand">{i + 1}</span>
                      <span className="flex-1 truncate text-sm">
                        {q.question || <span className="text-muted-fg">Frage {i + 1}</span>}
                      </span>
                      {isValid && <span className="text-[10px] font-bold text-success">✓</span>}
                      {isOpen ? <ChevronUp className="size-4 text-muted-fg" /> : <ChevronDown className="size-4 text-muted-fg" />}
                    </button>

                    {isOpen && (
                      <div className="border-t border-border p-4 space-y-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-muted-fg uppercase tracking-wider">Frage *</label>
                          <textarea
                            rows={2}
                            value={q.question}
                            onChange={(e) => updateQ(i, "question", e.target.value)}
                            placeholder="Welche Gleichung ist korrekt?"
                            className="rounded-lg border border-border bg-bg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand/50"
                          />
                        </div>

                        {(["A", "B", "C", "D"] as const).map((letter, li) => {
                          const field = `option${letter}` as keyof Question;
                          return (
                            <div key={letter} className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => updateQ(i, "correct", li)}
                                className="flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-black transition-all"
                                style={{
                                  background: q.correct === li ? "hsl(var(--color-success) / 0.15)" : "var(--color-surface-2)",
                                  color: q.correct === li ? "var(--color-success)" : "var(--color-muted-fg)",
                                  border: q.correct === li ? "1.5px solid hsl(var(--color-success) / 0.5)" : "1.5px solid transparent",
                                }}
                                title={`Option ${letter} als korrekt markieren`}
                              >
                                {letter}
                              </button>
                              <input
                                value={q[field] as string}
                                onChange={(e) => updateQ(i, field, e.target.value)}
                                placeholder={`Antwort ${letter}`}
                                className="h-9 flex-1 rounded-lg border border-border bg-bg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/50"
                              />
                            </div>
                          );
                        })}

                        <p className="text-[10px] text-muted-fg">Klicke auf A/B/C/D um die richtige Antwort zu markieren (grün = korrekt)</p>

                        {questions.length > 1 && (
                          <button type="button" onClick={() => removeQuestion(i)} className="flex items-center gap-1.5 text-xs font-semibold text-danger hover:underline">
                            <Trash2 className="size-3" /> Frage löschen
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              <button
                type="button"
                onClick={addQuestion}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-3 text-sm font-semibold text-muted-fg transition-colors hover:border-brand/40 hover:text-brand"
              >
                <Plus className="size-4" />
                Frage hinzufügen
              </button>
            </div>
          )}
        </section>

        {/* ── Submit ── */}
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center justify-center gap-2 rounded-xl bg-brand px-6 py-3 text-base font-black text-white transition-all hover:bg-brand/90 active:scale-95 disabled:opacity-50"
        >
          <Swords className="size-5" />
          {isPending ? "Wird erstellt…" : "Boss-Kampf starten"}
        </button>
      </form>
    </div>
  );
}
