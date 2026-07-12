/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";

import { useState, useTransition } from "react";
import { Megaphone, Send } from "lucide-react";
import { sendSprecherBroadcast } from "./actions";

interface Props {
  canSchool: boolean;
  canClass: boolean;
  className: string | null;
}

export function SprecherForm({ canSchool, canClass, className }: Props) {
  const [scope, setScope] = useState(canSchool ? "school" : "class");
  const [status, setStatus] = useState<{ ok?: string; error?: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setStatus(null);
    startTransition(async () => {
      const res = await sendSprecherBroadcast(formData);
      if (res.error) setStatus({ error: res.error });
      else setStatus({ ok: `Nachricht an ${res.sent} Schüler gesendet.` });
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-fg">Empfänger</span>
        <div className="flex flex-col gap-2 sm:flex-row">
          {canSchool && (
            <label className={`flex flex-1 cursor-pointer items-center gap-2.5 rounded-xl border-2 px-4 py-3 text-sm transition-colors ${scope === "school" ? "border-brand bg-brand/8" : "border-border hover:border-border-strong"}`}>
              <input type="radio" name="scope" value="school" checked={scope === "school"} onChange={() => setScope("school")} className="accent-brand" />
              <span>
                <span className="block font-semibold">📣 Ganze Schule</span>
                <span className="block text-xs text-muted-fg">Alle Schüler (Schülersprecher)</span>
              </span>
            </label>
          )}
          {canClass && (
            <label className={`flex flex-1 cursor-pointer items-center gap-2.5 rounded-xl border-2 px-4 py-3 text-sm transition-colors ${scope === "class" ? "border-brand bg-brand/8" : "border-border hover:border-border-strong"}`}>
              <input type="radio" name="scope" value="class" checked={scope === "class"} onChange={() => setScope("class")} className="accent-brand" />
              <span>
                <span className="block font-semibold">🗣️ Meine Klasse{className ? ` (${className})` : ""}</span>
                <span className="block text-xs text-muted-fg">Nur Mitschüler (Klassensprecher)</span>
              </span>
            </label>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="subject" className="text-[10px] font-semibold uppercase tracking-wider text-muted-fg">Betreff *</label>
        <input id="subject" name="subject" required maxLength={150} placeholder="z. B. SMV-Sitzung am Freitag"
          className="rounded-xl border border-border bg-bg px-3 py-2.5 text-sm focus:border-brand focus:outline-none" />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="message" className="text-[10px] font-semibold uppercase tracking-wider text-muted-fg">Nachricht *</label>
        <textarea id="message" name="message" required rows={6} maxLength={2000} placeholder="Deine Nachricht…"
          className="resize-y rounded-xl border border-border bg-bg px-3 py-2.5 text-sm focus:border-brand focus:outline-none" />
      </div>

      {status?.error && <p className="rounded-xl border border-danger/30 bg-danger/8 px-4 py-2.5 text-sm font-medium text-danger">{status.error}</p>}
      {status?.ok && <p className="rounded-xl border border-success/30 bg-success/8 px-4 py-2.5 text-sm font-medium text-success">✓ {status.ok}</p>}

      <button type="submit" disabled={pending}
        className="flex w-fit items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-brand-fg transition-all hover:brightness-105 active:scale-95 disabled:opacity-50">
        {pending ? <Megaphone className="size-4 animate-pulse" /> : <Send className="size-4" />}
        {pending ? "Wird gesendet…" : "Nachricht senden"}
      </button>
    </form>
  );
}
