/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { CheckCircle2, XCircle, RotateCcw, ChevronRight, Lightbulb, Volume2 } from "lucide-react";
import { recordVocabAnswer } from "../actions";

export type VocabEntry = {
  id: string;
  word: string;
  translation: string;
  example: string | null;
  hint: string | null;
  repetitions: number;
  streak: number;
  nextReview: Date;
};

type Mode = "cards" | "write" | "quiz" | "match";

// ── Mehrere Übersetzungen ────────────────────────────────────────────
// Vokabeln können mehrere gültige Übersetzungen haben (z. B. "butcher" →
// "Metzger; Metzgerin; Fleischer"). Gespeichert wird das mit ";" getrennt.

/** Einzelne Übersetzungen, leere Teile entfernt. */
export function parseTranslations(raw: string): string[] {
  return raw.split(";").map((s) => s.trim()).filter(Boolean);
}

/** Erste Übersetzung — für kompakte Anzeigen (Quiz, Memory). */
export function primaryTranslation(raw: string): string {
  return parseTranslations(raw)[0] ?? raw.trim();
}

/** Alle Übersetzungen für die Anzeige, mit „, " verbunden. */
export function formatTranslations(raw: string): string {
  const list = parseTranslations(raw);
  return list.length > 0 ? list.join(", ") : raw.trim();
}

/** Richtig, wenn die Eingabe zu EINER der Übersetzungen passt. */
export function matchesTranslation(input: string, raw: string): boolean {
  const norm = (s: string) => s.trim().toLowerCase();
  const got = norm(input);
  return parseTranslations(raw).some((t) => norm(t) === got);
}

interface Props {
  entries: VocabEntry[];
  listId: string;
  langFrom: string;
  langTo: string;
  color: string;
}

// ── Helper: shuffle array ───────────────────────────────────────────
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Card flip mode ──────────────────────────────────────────────────
function CardMode({ entries, color, onDone }: { entries: VocabEntry[]; color: string; langFrom: string; langTo: string; onDone: (correct: number, total: number) => void }) {
  // WICHTIG: nur EINMAL mischen (State-Initializer) — shuffle() im Render
  // würde bei jedem Re-Render die gefragte Vokabel wechseln.
  const [deck] = useState(() => shuffle(entries));
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [showHint, setShowHint] = useState(false);

  const current = deck[idx];
  if (!current) return null;

  function answer(good: boolean) {
    recordVocabAnswer(current.id, good ? 4 : 1);
    if (good) setCorrect(c => c + 1);
    if (idx + 1 >= deck.length) {
      onDone(good ? correct + 1 : correct, deck.length);
    } else {
      setIdx(i => i + 1);
      setFlipped(false);
      setShowHint(false);
    }
  }

  function speak(text: string) {
    if ("speechSynthesis" in window) {
      const u = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(u);
    }
  }

  const progress = ((idx) / deck.length) * 100;

  return (
    <div className="flex flex-col gap-6">
      {/* Progress */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-fg">
          <span>{idx + 1} / {deck.length}</span>
          <span className="font-semibold text-success">{correct} richtig</span>
        </div>
        <div className="h-2 w-full bg-border">
          <div className="h-full transition-all" style={{ width: `${progress}%`, backgroundColor: color }} />
        </div>
      </div>

      {/* Card */}
      <div
        className="relative mx-auto w-full max-w-lg cursor-pointer select-none"
        onClick={() => setFlipped(f => !f)}
        style={{ perspective: "1000px" }}
      >
        <div
          // key an den Karten-Index: ein neues Wort hängt die Karte frisch auf
          // der Vorderseite ein, statt von der Rückseite (Lösung!) zurück-
          // zudrehen. Das Umdrehen per Antippen animiert weiter, weil idx
          // dabei gleich bleibt.
          key={idx}
          className="relative h-52 transition-all duration-500"
          style={{
            transformStyle: "preserve-3d",
            WebkitTransformStyle: "preserve-3d",
            transform: flipped ? "rotateY(180deg)" : "rotateY(0)",
          }}
        >
          {/* Front */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 border-2 bg-bg p-8 text-center"
            style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", borderColor: color + "60" }}
          >
            <p className="text-2xl font-bold">{current.word}</p>
            {current.hint && !showHint && (
              <button type="button" onClick={(e) => { e.stopPropagation(); setShowHint(true); }} className="text-xs text-muted-fg hover:text-brand">
                <Lightbulb className="inline size-3 mr-1" />Tipp anzeigen
              </button>
            )}
            {showHint && current.hint && (
              <p className="text-sm text-muted-fg italic">{current.hint}</p>
            )}
            <button type="button" onClick={(e) => { e.stopPropagation(); speak(current.word); }} className="text-muted-fg hover:text-brand">
              <Volume2 className="size-4" strokeWidth={1.75} />
            </button>
            <p className="text-xs text-muted-fg">Tippe zum Umdrehen</p>
          </div>
          {/* Back */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 border-2 bg-surface p-8 text-center"
            style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: "rotateY(180deg)", borderColor: color }}
          >
            <p className="text-2xl font-bold text-brand">{formatTranslations(current.translation)}</p>
            {current.example && (
              <p className="text-sm italic text-muted-fg">„{current.example}"</p>
            )}
          </div>
        </div>
      </div>

      {/* Answer buttons */}
      {flipped && (
        <div className="flex justify-center gap-4">
          <button type="button" onClick={() => answer(false)} className="flex items-center gap-2 border-2 border-danger/40 bg-danger/10 px-6 py-3 font-semibold text-danger transition-colors hover:bg-danger hover:text-white">
            <XCircle className="size-5" /> Falsch
          </button>
          <button type="button" onClick={() => answer(true)} className="flex items-center gap-2 border-2 border-success/40 bg-success/10 px-6 py-3 font-semibold text-success transition-colors hover:bg-success hover:text-white">
            <CheckCircle2 className="size-5" /> Richtig
          </button>
        </div>
      )}
    </div>
  );
}

// ── Write mode ──────────────────────────────────────────────────────
function WriteMode({ entries, color, langTo, onDone }: { entries: VocabEntry[]; color: string; langTo: string; onDone: (correct: number, total: number) => void }) {
  // Nur EINMAL mischen — sonst wechselt die gefragte Vokabel bei jedem Tastendruck
  // und die Prüfung vergleicht gegen ein anderes Wort als das angezeigte.
  const [deck] = useState(() => shuffle(entries));
  const [idx, setIdx] = useState(0);
  const [input, setInput] = useState("");
  const [checked, setChecked] = useState<boolean | null>(null);
  const [correct, setCorrect] = useState(0);

  const current = deck[idx];
  if (!current) return null;

  function check() {
    const isCorrect = matchesTranslation(input, current.translation);
    setChecked(isCorrect);
    recordVocabAnswer(current.id, isCorrect ? 4 : 1);
    if (isCorrect) setCorrect(c => c + 1);
  }

  function next() {
    if (idx + 1 >= deck.length) {
      onDone(correct, deck.length);
    } else {
      setIdx(i => i + 1);
      setInput("");
      setChecked(null);
    }
  }

  const progress = (idx / deck.length) * 100;

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-fg">
          <span>{idx + 1} / {deck.length}</span>
          <span className="font-semibold text-success">{correct} richtig</span>
        </div>
        <div className="h-2 w-full bg-border">
          <div className="h-full transition-all" style={{ width: `${progress}%`, backgroundColor: color }} />
        </div>
      </div>

      <div className="mx-auto w-full max-w-lg space-y-6">
        <div className="border border-border bg-bg p-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-fg mb-3">Wie heißt das auf {langTo}?</p>
          <p className="text-3xl font-bold">{current.word}</p>
          {current.example && <p className="mt-2 text-sm italic text-muted-fg">„{current.example?.replace(primaryTranslation(current.translation), "___")}"</p>}
        </div>

        {checked === null ? (
          <div className="flex gap-2">
            <input
              autoFocus
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && input.trim()) check(); }}
              placeholder="Übersetzung eingeben…"
              className="flex-1 h-12 border border-border bg-bg px-4 text-base focus:border-brand focus:outline-none"
            />
            <button type="button" onClick={check} disabled={!input.trim()} className="bg-fg px-5 text-sm font-semibold text-bg disabled:opacity-50 hover:opacity-90">
              Prüfen
            </button>
          </div>
        ) : (
          <div className={`border-2 p-4 ${checked ? "border-success bg-success/10" : "border-danger bg-danger/10"}`}>
            {checked ? (
              <p className="flex items-center gap-2 font-semibold text-success"><CheckCircle2 className="size-5" /> Richtig!</p>
            ) : (
              <div>
                <p className="flex items-center gap-2 font-semibold text-danger"><XCircle className="size-5" /> Falsch</p>
                <p className="mt-1 text-sm">Richtige Antwort: <strong>{formatTranslations(current.translation)}</strong></p>
                <p className="text-xs text-muted-fg">Deine Antwort: {input}</p>
              </div>
            )}
            <button type="button" onClick={next} className="mt-3 flex items-center gap-1 text-sm font-semibold text-muted-fg hover:text-fg">
              Weiter <ChevronRight className="size-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Quiz mode (multiple choice) ──────────────────────────────────────
function QuizMode({ entries, color, onDone }: { entries: VocabEntry[]; color: string; onDone: (correct: number, total: number) => void }) {
  // Deck einmalig mischen; Optionen pro Frage stabil halten (useMemo an idx
  // gebunden) — sonst springen die Antworten bei jedem Re-Render um.
  const [deck] = useState(() => shuffle(entries));
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [correct, setCorrect] = useState(0);
  // Verhindert, dass der 900ms-Timeout nach "Modus wechseln" noch onDone
  // feuert — sonst zeigt der nächste Modus sofort einen stale ResultScreen.
  const unmountedRef = useRef(false);
  useEffect(() => () => { unmountedRef.current = true; }, []);

  const current = deck[idx];
  const options = useMemo(() => {
    if (!current) return [];
    const others = shuffle(entries.filter(e => e.id !== current.id)).slice(0, 3);
    return shuffle([current, ...others]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  if (!current || entries.length < 2) return <p className="text-muted-fg">Mindestens 4 Vokabeln für Quiz-Modus nötig.</p>;

  function pick(entry: VocabEntry) {
    if (selected) return;
    const isCorrect = entry.id === current.id;
    setSelected(entry.id);
    recordVocabAnswer(current.id, isCorrect ? 4 : 1);
    if (isCorrect) setCorrect(c => c + 1);
    setTimeout(() => {
      if (unmountedRef.current) return;
      if (idx + 1 >= deck.length) {
        onDone(isCorrect ? correct + 1 : correct, deck.length);
      } else {
        setIdx(i => i + 1);
        setSelected(null);
      }
    }, 900);
  }

  const progress = (idx / deck.length) * 100;

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-fg">
          <span>{idx + 1} / {deck.length}</span>
          <span className="font-semibold text-success">{correct} richtig</span>
        </div>
        <div className="h-2 w-full bg-border">
          <div className="h-full transition-all" style={{ width: `${progress}%`, backgroundColor: color }} />
        </div>
      </div>

      <div className="mx-auto w-full max-w-lg space-y-6">
        <div className="border border-border bg-bg p-8 text-center">
          <p className="text-3xl font-bold">{current.word}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {options.map((opt) => {
            let cls = "border-2 p-4 text-center font-semibold transition-all cursor-pointer ";
            if (!selected) {
              cls += "border-border bg-bg hover:border-brand hover:bg-brand/10";
            } else if (opt.id === current.id) {
              cls += "border-success bg-success/20 text-success";
            } else if (opt.id === selected) {
              cls += "border-danger bg-danger/20 text-danger";
            } else {
              cls += "border-border bg-bg opacity-50";
            }
            return (
              <button key={opt.id} type="button" className={cls} onClick={() => pick(opt)}>
                {formatTranslations(opt.translation)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Match mode ──────────────────────────────────────────────────────
function MatchMode({ entries, color, onDone }: { entries: VocabEntry[]; color: string; onDone: (correct: number, total: number) => void }) {
  // Paare und rechte Spalte einmalig mischen — shuffle() im Render würde die
  // Buttons bei jedem Klick neu anordnen.
  const [pairs] = useState(() => shuffle(entries).slice(0, 8));
  const [rights] = useState(() => shuffle([...pairs]));
  const [leftSel, setLeftSel] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [wrong, setWrong] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  // Wie im QuizMode: onDone nicht mehr feuern, wenn der Modus gewechselt wurde.
  const unmountedRef = useRef(false);
  useEffect(() => () => { unmountedRef.current = true; }, []);

  function pickRight(id: string) {
    if (!leftSel || matched.has(id) || matched.has(leftSel)) return;
    if (id === leftSel) {
      const next = new Set([...matched, id]);
      setMatched(next);
      setLeftSel(null);
      setScore(s => s + 1);
      if (next.size === pairs.length) {
        setTimeout(() => { if (!unmountedRef.current) onDone(score + 1, pairs.length); }, 500);
      }
    } else {
      setWrong(id);
      setTimeout(() => { setWrong(null); setLeftSel(null); }, 700);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-fg">Verbinde das Wort mit seiner Übersetzung. {score}/{pairs.length} gefunden.</p>
      <div className="grid grid-cols-2 gap-3">
        {/* Left: words */}
        <div className="flex flex-col gap-2">
          {pairs.map(e => {
            const isMatched = matched.has(e.id);
            const isSel = leftSel === e.id;
            return (
              <button
                key={e.id + "L"}
                type="button"
                disabled={isMatched}
                onClick={() => setLeftSel(isSel ? null : e.id)}
                className={`border-2 px-4 py-3 text-sm font-semibold text-left transition-all ${
                  isMatched ? "border-success bg-success/20 text-success opacity-50" :
                  isSel ? "border-brand bg-brand/10" :
                  "border-border bg-bg hover:border-brand/50"
                }`}
              >
                {e.word}
              </button>
            );
          })}
        </div>
        {/* Right: translations */}
        <div className="flex flex-col gap-2">
          {rights.map(e => {
            const isMatched = matched.has(e.id);
            const isWrong = wrong === e.id;
            return (
              <button
                key={e.id + "R"}
                type="button"
                disabled={isMatched || !leftSel}
                onClick={() => pickRight(e.id)}
                className={`border-2 px-4 py-3 text-sm font-semibold text-left transition-all ${
                  isMatched ? "border-success bg-success/20 text-success opacity-50" :
                  isWrong ? "border-danger bg-danger/20 animate-shake" :
                  leftSel ? "border-brand/40 bg-bg hover:border-brand hover:bg-brand/10 cursor-pointer" :
                  "border-border bg-bg opacity-50"
                }`}
              >
                {formatTranslations(e.translation)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Result screen ───────────────────────────────────────────────────
function ResultScreen({ correct, total, onRestart, color }: { correct: number; total: number; onRestart: () => void; color: string }) {
  const pct = Math.round((correct / total) * 100);
  const msg = pct >= 90 ? "Ausgezeichnet! 🏆" : pct >= 70 ? "Sehr gut! 🎉" : pct >= 50 ? "Gut gemacht! 👍" : "Weiter üben! 💪";
  return (
    <div className="flex flex-col items-center gap-6 py-12 text-center">
      <div className="grid size-24 place-items-center rounded-full border-4" style={{ borderColor: color }}>
        <span className="font-mono text-3xl font-bold">{pct}%</span>
      </div>
      <div>
        <p className="text-xl font-bold">{msg}</p>
        <p className="text-muted-fg">{correct} von {total} richtig</p>
      </div>
      <button type="button" onClick={onRestart} className="flex items-center gap-2 border border-border bg-bg px-6 py-3 font-semibold hover:bg-surface">
        <RotateCcw className="size-4" strokeWidth={1.75} />
        Nochmal üben
      </button>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────
export function VocabTrainer({ entries, listId: _listId, langFrom, langTo, color }: Props) {
  const [mode, setMode] = useState<Mode | null>(null);
  const [result, setResult] = useState<{ correct: number; total: number } | null>(null);

  const dueEntries = entries.filter(e => e.nextReview <= new Date());
  const practiceEntries = dueEntries.length > 0 ? dueEntries : entries;

  const handleDone = useCallback((correct: number, total: number) => {
    setResult({ correct, total });
  }, []);

  if (mode && result) {
    return (
      <ResultScreen
        correct={result.correct}
        total={result.total}
        color={color}
        onRestart={() => { setResult(null); setMode(null); }}
      />
    );
  }

  if (!mode) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-fg">
          {dueEntries.length > 0
            ? `${dueEntries.length} Vokabeln sind heute fällig. Wähle deinen Lernmodus:`
            : "Alle Vokabeln erledigt. Trotzdem üben?"}
        </p>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {([
            { key: "cards",  label: "Karten",    emoji: "🃏", desc: "Umdrehen & einschätzen" },
            { key: "write",  label: "Schreiben", emoji: "✍️", desc: "Übersetzung eintippen" },
            { key: "quiz",   label: "Quiz",      emoji: "🎯", desc: "4 Antworten wählen" },
            { key: "match",  label: "Zuordnen",  emoji: "🔗", desc: "Paare verbinden" },
          ] as const).map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setMode(m.key)}
              disabled={entries.length < 2}
              className="flex flex-col items-center gap-2 border-2 border-border bg-bg p-4 text-center transition-all hover:border-brand hover:bg-brand/5 disabled:opacity-40"
            >
              <span className="text-2xl">{m.emoji}</span>
              <p className="font-semibold text-sm">{m.label}</p>
              <p className="text-[11px] text-muted-fg">{m.desc}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button type="button" onClick={() => setMode(null)} className="text-xs text-muted-fg hover:text-fg">← Modus wechseln</button>
      {mode === "cards" && <CardMode entries={practiceEntries} color={color} langFrom={langFrom} langTo={langTo} onDone={handleDone} />}
      {mode === "write" && <WriteMode entries={practiceEntries} color={color} langTo={langTo} onDone={handleDone} />}
      {mode === "quiz"  && <QuizMode  entries={practiceEntries} color={color} onDone={handleDone} />}
      {mode === "match" && <MatchMode entries={practiceEntries} color={color} onDone={handleDone} />}
    </div>
  );
}
