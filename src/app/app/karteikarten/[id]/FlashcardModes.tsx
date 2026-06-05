"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, RotateCcw, ChevronRight, Pencil, FileQuestion } from "lucide-react";

type Card = { id: string; front: string; back: string };

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Write mode ─────────────────────────────────────────────────────
function WriteMode({ cards, onClose }: { cards: Card[]; onClose: () => void }) {
  const deck = shuffle(cards);
  const [idx, setIdx] = useState(0);
  const [input, setInput] = useState("");
  const [checked, setChecked] = useState<"correct" | "almost" | "wrong" | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const cur = deck[idx];
  if (!cur || done) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <p className="text-2xl font-bold">{score}/{deck.length} richtig</p>
        <p className="text-muted-fg">{Math.round((score/deck.length)*100)}% korrekt</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="border border-border px-4 py-2 text-sm hover:bg-surface">Zurück</button>
          <button onClick={() => { setIdx(0); setInput(""); setChecked(null); setScore(0); setDone(false); }} className="flex items-center gap-1.5 bg-fg px-4 py-2 text-sm text-bg hover:opacity-90">
            <RotateCcw className="size-3.5" /> Nochmal
          </button>
        </div>
      </div>
    );
  }

  function check() {
    const a = input.trim().toLowerCase();
    const b = cur.back.trim().toLowerCase();
    const result = a === b ? "correct" : (b.includes(a) || a.includes(b.split(" ")[0])) ? "almost" : "wrong";
    setChecked(result);
    if (result === "correct" || result === "almost") setScore(s => s + 1);
  }

  function next() {
    if (idx + 1 >= deck.length) setDone(true);
    else { setIdx(i => i + 1); setInput(""); setChecked(null); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-muted-fg">
        <span>{idx + 1} / {deck.length}</span>
        <button onClick={onClose} className="hover:text-fg">✕ Schließen</button>
      </div>

      <div className="border border-border p-6 text-center">
        <p className="text-xs text-muted-fg mb-2">Wie lautet die Rückseite?</p>
        <p className="text-2xl font-bold">{cur.front}</p>
      </div>

      {checked === null ? (
        <div className="flex gap-2">
          <input
            autoFocus
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && input.trim()) check(); }}
            placeholder="Antwort eingeben…"
            className="flex-1 h-11 border border-border bg-bg px-4 text-sm focus:border-brand focus:outline-none"
          />
          <button disabled={!input.trim()} onClick={check} className="bg-fg px-4 text-sm font-semibold text-bg disabled:opacity-50 hover:opacity-90">Prüfen</button>
        </div>
      ) : (
        <div className={`border-2 p-4 space-y-2 ${checked === "correct" ? "border-success bg-success/10" : checked === "almost" ? "border-warning bg-warning/10" : "border-danger bg-danger/10"}`}>
          <div className="flex items-center gap-2">
            {checked === "correct" ? <CheckCircle2 className="size-4 text-success" /> : checked === "almost" ? <CheckCircle2 className="size-4 text-warning" /> : <XCircle className="size-4 text-danger" />}
            <span className={`text-sm font-semibold ${checked === "correct" ? "text-success" : checked === "almost" ? "text-warning" : "text-danger"}`}>
              {checked === "correct" ? "Richtig!" : checked === "almost" ? "Fast richtig" : "Falsch"}
            </span>
          </div>
          {checked !== "correct" && <p className="text-sm">Richtig: <strong>{cur.back}</strong></p>}
          {checked === "almost" && <p className="text-xs text-muted-fg">Deine Antwort: {input}</p>}
          <button onClick={next} className="flex items-center gap-1 text-sm font-semibold text-muted-fg hover:text-fg">
            Weiter <ChevronRight className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Test mode (auto-generated quiz) ────────────────────────────────
function TestMode({ cards, onClose }: { cards: Card[]; onClose: () => void }) {
  type Question = { card: Card; options: string[]; correct: number };

  function makeQuiz(): Question[] {
    return shuffle(cards).slice(0, Math.min(cards.length, 10)).map(card => {
      const wrong = shuffle(cards.filter(c => c.id !== card.id)).slice(0, 3).map(c => c.back);
      const allOpts = shuffle([card.back, ...wrong]);
      return { card, options: allOpts, correct: allOpts.indexOf(card.back) };
    });
  }

  const [questions] = useState<Question[]>(makeQuiz);
  const [answers, setAnswers] = useState<(number | null)[]>(questions.map(() => null));
  const [submitted, setSubmitted] = useState(false);

  if (!questions.length) return null;

  function pick(qi: number, opt: number) {
    if (submitted) return;
    setAnswers(a => a.map((v, i) => i === qi ? opt : v));
  }

  const score = submitted ? answers.filter((a, i) => a === questions[i].correct).length : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">{submitted ? `Ergebnis: ${score}/${questions.length}` : `${questions.length} Fragen`}</p>
        <button onClick={onClose} className="text-xs text-muted-fg hover:text-fg">✕ Schließen</button>
      </div>

      {questions.map((q, qi) => (
        <div key={qi} className="border border-border p-4 space-y-3">
          <p className="font-semibold">{qi + 1}. {q.card.front}</p>
          <div className="grid grid-cols-2 gap-2">
            {q.options.map((opt, oi) => {
              let cls = "border px-3 py-2 text-sm text-left transition-colors ";
              if (!submitted) {
                cls += answers[qi] === oi ? "border-brand bg-brand/10 font-semibold" : "border-border hover:border-brand/50 hover:bg-surface cursor-pointer";
              } else if (oi === q.correct) {
                cls += "border-success bg-success/15 text-success font-semibold";
              } else if (answers[qi] === oi) {
                cls += "border-danger bg-danger/15 text-danger";
              } else {
                cls += "border-border opacity-50";
              }
              return (
                <button key={oi} type="button" className={cls} onClick={() => pick(qi, oi)}>
                  <span className="mr-1.5 text-muted-fg font-mono">{String.fromCharCode(65+oi)}.</span>{opt}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {!submitted ? (
        <button onClick={() => setSubmitted(true)} disabled={answers.some(a => a === null)} className="w-full bg-fg py-3 text-sm font-semibold text-bg disabled:opacity-50 hover:opacity-90">
          Test auswerten ({answers.filter(a => a !== null).length}/{questions.length} beantwortet)
        </button>
      ) : (
        <div className="flex items-center justify-between border border-border bg-surface p-4">
          <p className="font-bold">{score}/{questions.length} · {Math.round((score/questions.length)*100)}%</p>
          <button onClick={onClose} className="border border-border px-4 py-2 text-sm hover:bg-bg">Zurück</button>
        </div>
      )}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────
export function FlashcardModes({ cards }: { cards: Card[] }) {
  const [mode, setMode] = useState<"write" | "test" | null>(null);

  if (mode === "write") return <WriteMode cards={cards} onClose={() => setMode(null)} />;
  if (mode === "test")  return <TestMode  cards={cards} onClose={() => setMode(null)} />;

  return (
    <div className="grid grid-cols-2 gap-3">
      <button
        onClick={() => setMode("write")}
        disabled={cards.length < 1}
        className="flex flex-col items-center gap-2 border-2 border-border p-4 text-center transition-all hover:border-brand hover:bg-brand/5 disabled:opacity-40"
      >
        <Pencil className="size-5 text-brand" strokeWidth={1.75} />
        <div>
          <p className="font-semibold text-sm">Schreib-Modus</p>
          <p className="text-[11px] text-muted-fg">Rückseite eintippen</p>
        </div>
      </button>
      <button
        onClick={() => setMode("test")}
        disabled={cards.length < 4}
        className="flex flex-col items-center gap-2 border-2 border-border p-4 text-center transition-all hover:border-brand hover:bg-brand/5 disabled:opacity-40"
      >
        <FileQuestion className="size-5 text-brand" strokeWidth={1.75} />
        <div>
          <p className="font-semibold text-sm">Test-Modus</p>
          <p className="text-[11px] text-muted-fg">Auto-generiertes Quiz</p>
        </div>
      </button>
    </div>
  );
}
