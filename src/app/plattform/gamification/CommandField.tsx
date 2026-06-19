"use client";

import { useState, useRef } from "react";
import { Terminal, ChevronRight, Loader2 } from "lucide-react";
import { runSuperAdminCommand } from "./actions";

interface LogEntry { cmd: string; out: string; ok: boolean; ts: Date }

export function SuperCommandField() {
  const [input, setInput]     = useState("");
  const [log, setLog]         = useState<LogEntry[]>([]);
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cmd = input.trim();
    if (!cmd) return;
    setPending(true);
    setInput("");
    try {
      const result = await runSuperAdminCommand(cmd);
      setLog((l) => [{ cmd, out: result.message, ok: result.ok, ts: new Date() }, ...l]);
    } catch (err) {
      setLog((l) => [{ cmd, out: String(err), ok: false, ts: new Date() }, ...l]);
    } finally {
      setPending(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-[#0d1117] font-mono text-green-400">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
        <Terminal className="size-4 text-green-500" />
        <span className="text-xs font-semibold text-green-300">Super-Admin Terminal</span>
        <span className="ml-auto text-[10px] text-white/30">/help für alle Befehle</span>
      </div>
      <div className="h-48 space-y-2 overflow-y-auto px-4 py-3 text-xs">
        {log.length === 0 && (
          <p className="text-white/20">Bereit. Befehle gelten für die gesamte Plattform.</p>
        )}
        {log.map((entry, i) => (
          <div key={i} className="space-y-0.5">
            <div className="flex items-center gap-2 text-white/50">
              <span>{entry.ts.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
              <ChevronRight className="size-3" />
              <span className="text-white/80">{entry.cmd}</span>
            </div>
            <pre className={`whitespace-pre-wrap pl-14 leading-relaxed ${entry.ok ? "text-green-400" : "text-red-400"}`}>
              {entry.out}
            </pre>
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-white/10 px-4 py-2.5">
        <span className="shrink-0 text-green-500">$</span>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="/bossrush  oder  /doublex 4  oder  /help"
          disabled={pending}
          autoComplete="off"
          spellCheck={false}
          className="flex-1 bg-transparent text-xs text-green-300 placeholder-white/20 outline-none"
        />
        {pending && <Loader2 className="size-3.5 animate-spin shrink-0 text-green-500" />}
      </form>
    </div>
  );
}
