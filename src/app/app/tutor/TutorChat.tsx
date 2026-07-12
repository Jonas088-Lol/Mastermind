/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";

import {
  ArrowUp,
  Bookmark,
  Camera,
  Mic,
  Paperclip,
  Sparkles,
  Volume2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Role = "user" | "assistant";

const SUBJECTS = [
  "Allgemein",
  "Mathe",
  "Deutsch",
  "Englisch",
  "Biologie",
  "Chemie",
  "Physik",
  "Geschichte",
  "Erdkunde",
] as const;

const PRESETS: { label: string; prompt: string }[] = [
  {
    label: "🧒 Erklär's mir einfach",
    prompt:
      "Erkläre mir das folgende Thema so einfach wie möglich, als wäre ich deutlich jünger. Nutze Alltagsbeispiele und kurze Sätze. Thema: ",
  },
  {
    label: "📝 Frag mich ab (Quiz)",
    prompt:
      "Frag mich mit einem kurzen Quiz ab: Stelle mir nacheinander 5 Fragen zum folgenden Thema, warte jeweils auf meine Antwort und gib mir danach Feedback. Thema: ",
  },
  {
    label: "🧮 Rechne Schritt für Schritt vor",
    prompt:
      "Rechne mir die folgende Aufgabe Schritt für Schritt vor und erkläre bei jedem Schritt kurz, warum du ihn machst. Aufgabe: ",
  },
  {
    label: "📖 Fasse zusammen",
    prompt:
      "Fasse mir das folgende Thema oder den folgenden Text kompakt zusammen: erst 3 Kernaussagen als Stichpunkte, dann eine kurze Zusammenfassung in eigenen Worten. Thema/Text: ",
  },
  {
    label: "🇬🇧 Auf Englisch üben",
    prompt:
      "Lass uns auf Englisch üben: Führe eine einfache Unterhaltung mit mir auf Englisch und korrigiere meine Fehler freundlich auf Deutsch. Thema: ",
  },
  {
    label: "🎯 Prüfungsmodus (streng)",
    prompt:
      "Prüfungsmodus: Stelle mir anspruchsvolle Prüfungsfragen zum folgenden Thema, bewerte meine Antworten streng aber fair und sage mir am Ende, wo ich noch Lücken habe. Thema: ",
  },
];

interface Message {
  id: string;
  role: Role;
  content: string;
  rating?: "up" | "down";
  pending?: boolean;
}


interface TutorChatProps {
  initialQuotaUsed?: number;
  initialQuotaLimit?: number;
  isAiConfigured?: boolean;
  /** When set, the chat will populate the textarea with this text and focus it. */
  injectedPrompt?: { text: string; seq: number };
  onInjectedPromptConsumed?: () => void;
}

export function TutorChat({
  initialQuotaUsed = 0,
  initialQuotaLimit = 50,
  isAiConfigured = false,
  injectedPrompt,
  onInjectedPromptConsumed,
}: TutorChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quotaUsed, setQuotaUsed] = useState(initialQuotaUsed);
  const [configured, setConfigured] = useState(isAiConfigured);
  const [subject, setSubject] = useState<string>("Allgemein");
  const scrollRef = useRef<HTMLOListElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  // Laufenden Stream beim Unmount abbrechen — sonst konsumiert der fetch im
  // Hintergrund weiter (Quota) und setMessages feuert nach dem Unmount.
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  // Populate textarea when a quick-prompt or recent topic is selected.
  // The dependency on injectedPrompt.seq ensures this runs even when the same
  // prompt text is clicked twice in a row.
  useEffect(() => {
    if (injectedPrompt) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInput(injectedPrompt.text);
      textareaRef.current?.focus();
      onInjectedPromptConsumed?.();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [injectedPrompt?.seq]);

  async function send(question: string) {
    const trimmed = question.trim();
    if (!trimmed || busy) return;

    setError(null);
    setBusy(true);

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: "user",
      content: trimmed,
    };
    const assistantId = `a-${Date.now()}`;
    const placeholder: Message = {
      id: assistantId,
      role: "assistant",
      content: "",
      pending: true,
    };
    const next = [...messages, userMsg, placeholder];
    setMessages(next);
    setInput("");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/ai/tutor", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: next
            .filter((m) => !m.pending)
            .map((m) => ({ role: m.role, content: m.content })),
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error ?? `Fehler ${res.status}`);
      }
      if (!res.body) throw new Error("Kein Stream-Body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const updateAssistant = (delta: string) => {
        setMessages((curr) =>
          curr.map((m) =>
            m.id === assistantId
              ? { ...m, content: m.content + delta, pending: true }
              : m
          )
        );
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Parse SSE chunks separated by blank lines
        let sep: number;
        while ((sep = buffer.indexOf("\n\n")) >= 0) {
          const chunk = buffer.slice(0, sep);
          buffer = buffer.slice(sep + 2);

          let event = "message";
          let data = "";
          for (const line of chunk.split(/\r?\n/)) {
            if (line.startsWith("event:")) event = line.slice(6).trim();
            else if (line.startsWith("data:"))
              data += (data ? "\n" : "") + line.slice(5).trim();
          }
          if (!data) continue;

          if (event === "token") {
            try {
              const text = JSON.parse(data) as string;
              updateAssistant(text);
            } catch {
              // ignore malformed
            }
          } else if (event === "meta") {
            try {
              const meta = JSON.parse(data) as {
                quota?: { used: number; limit: number };
                configured?: boolean;
              };
              if (meta.quota) {
                setQuotaUsed(meta.quota.used);
              }
              if (typeof meta.configured === "boolean") {
                setConfigured(meta.configured);
              }
            } catch {
              // ignore
            }
          } else if (event === "error") {
            try {
              const e = JSON.parse(data) as { message?: string };
              throw new Error(e.message ?? "Fehler beim Streamen");
            } catch (err) {
              throw err instanceof Error ? err : new Error("Stream-Fehler");
            }
          } else if (event === "done") {
            // streaming finished; fall through to mark as not pending
          }
        }
      }

      setMessages((curr) =>
        curr.map((m) => (m.id === assistantId ? { ...m, pending: false } : m))
      );
    } catch (err) {
      const msg =
        err instanceof Error && err.name !== "AbortError"
          ? err.message
          : null;
      if (msg) {
        setError(msg);
        setMessages((curr) =>
          curr.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: m.content || `Fehler: ${msg}`,
                  pending: false,
                }
              : m
          )
        );
      }
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  }

  function applyPreset(prompt: string) {
    const prefix = subject !== "Allgemein" ? `Fach: ${subject} — ` : "";
    setInput(prefix + prompt);
    textareaRef.current?.focus();
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void send(input);
  }

  function rate(id: string, value: "up" | "down") {
    setMessages((curr) =>
      curr.map((m) => (m.id === id ? { ...m, rating: value } : m))
    );
  }

  function stop() {
    abortRef.current?.abort();
  }

  function newConversation() {
    if (busy) stop();
    setMessages([]);
    setError(null);
    setInput("");
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="size-1.5 animate-pulse bg-success" aria-hidden />
          <p className="text-xs font-semibold uppercase tracking-wider">
            Mathe · pq-Formel
          </p>
          <Badge variant={configured ? "success" : "warning"}>
            {configured ? "KI live" : "Mock-Modus"}
          </Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={newConversation}>
          Neue Konversation
        </Button>
      </div>

      <ol
        ref={scrollRef}
        className="flex max-h-[60vh] flex-col gap-6 overflow-y-auto p-5"
      >
        {messages.map((m) => (
          <li key={m.id}>
            <ChatBubble message={m} onRate={(v) => rate(m.id, v)} />
          </li>
        ))}
        {messages.length === 0 && (
          <li className="grid place-items-center py-16 text-center">
            <Sparkles className="size-8 text-brand" strokeWidth={1.5} />
            <p className="mt-4 text-base font-semibold">
              Wobei kann ich dir helfen?
            </p>
            <p className="mt-1 max-w-sm text-sm text-muted-fg">
              Schreib eine Frage in das Feld unten — ich gehe Schritt für
              Schritt mit dir durch.
            </p>
          </li>
        )}
      </ol>

      {error && (
        <div className="border-t border-danger/40 bg-danger/6 px-5 py-2 text-xs text-danger">
          {error}
        </div>
      )}

      <div className="border-t border-border bg-bg p-3">
        {messages.length === 0 && (
          <div className="mb-3 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <label
                htmlFor="tutor-subject"
                className="text-[10px] font-semibold uppercase tracking-wider text-muted-fg"
              >
                Fach
              </label>
              <select
                id="tutor-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="rounded-xl border border-border bg-surface px-2 py-1 text-xs text-fg focus:outline-none focus:border-fg/30"
              >
                {SUBJECTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => applyPreset(p.prompt)}
                  className="rounded-xl border border-border bg-surface px-3 py-1.5 text-xs text-fg transition-colors hover:border-fg/30 hover:bg-surface-2"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}
        <form
          onSubmit={onSubmit}
          className="border border-border bg-surface focus-within:border-fg/30"
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                void send(input);
              }
            }}
            disabled={busy}
            rows={3}
            placeholder="Frag mich z. B. wie du eine pq-Formel-Aufgabe rechnest."
            className="block w-full resize-none bg-transparent px-3 py-2.5 text-sm leading-relaxed focus:outline-none disabled:opacity-60"
          />
          <div className="flex items-center justify-between border-t border-border px-2 py-1.5">
            <div className="flex items-center gap-0.5">
              <ToolButton
                icon={<Paperclip className="size-3.5" />}
                label="Datei anhängen"
              />
              <ToolButton
                icon={<Camera className="size-3.5" />}
                label="Mathe-Scanner"
              />
              <ToolButton
                icon={<Mic className="size-3.5" />}
                label="Diktat"
              />
            </div>
            <div className="flex items-center gap-2">
              {busy ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={stop}
                >
                  Stop
                </Button>
              ) : null}
              <Button type="submit" size="sm" disabled={busy || !input.trim()}>
                Senden
                <ArrowUp className="size-3.5" />
              </Button>
            </div>
          </div>
        </form>
        <p className="mt-2 px-1 text-[10px] text-muted-fg">
          Cmd + Enter zum Senden · {quotaUsed} / {initialQuotaLimit} KI-Anfragen
          diese Woche · Pseudonymisierung aktiv
        </p>
      </div>
    </div>
  );
}

function ChatBubble({
  message,
  onRate,
}: {
  message: Message;
  onRate: (rating: "up" | "down") => void;
}) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-xl">
          <div className="border border-border bg-surface px-4 py-3">
            <p className="whitespace-pre-wrap text-sm">{message.content}</p>
          </div>
          <p className="mt-1 text-right font-mono text-[10px] uppercase tracking-wider text-muted-fg">
            Du
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <Avatar
        name="MasterMind KI"
        size="md"
        className="bg-fg text-bg ring-fg"
      />
      <div className="min-w-0 flex-1 space-y-3">
        <p className="whitespace-pre-wrap text-sm leading-relaxed">
          {message.content || (message.pending ? "…" : "")}
          {message.pending && message.content && (
            <span className="ml-0.5 inline-block size-2 animate-pulse bg-fg" />
          )}
        </p>
        {!message.pending && message.content && (
          <div className="flex items-center gap-1.5">
            <Badge variant="outline">MasterMind KI</Badge>
            <button
              type="button"
              aria-label="Vorlesen"
              className="grid size-7 place-items-center text-muted-fg hover:text-fg"
            >
              <Volume2 className="size-3.5" />
            </button>
            <button
              type="button"
              aria-label="Hilfreich"
              onClick={() => onRate("up")}
              className={cn(
                "grid size-7 place-items-center text-muted-fg hover:text-success",
                message.rating === "up" && "text-success"
              )}
            >
              👍
            </button>
            <button
              type="button"
              aria-label="Nicht hilfreich"
              onClick={() => onRate("down")}
              className={cn(
                "grid size-7 place-items-center text-muted-fg hover:text-danger",
                message.rating === "down" && "text-danger"
              )}
            >
              👎
            </button>
            <button
              type="button"
              aria-label="Speichern"
              className="grid size-7 place-items-center text-muted-fg hover:text-fg"
            >
              <Bookmark className="size-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ToolButton({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="grid size-8 place-items-center text-muted-fg transition-colors hover:bg-surface-2 hover:text-fg"
    >
      {icon}
    </button>
  );
}
