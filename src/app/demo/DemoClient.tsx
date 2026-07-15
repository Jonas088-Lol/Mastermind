/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";

import { useState, useTransition, type FormEvent } from "react";
import { GraduationCap, Presentation, ClipboardList, Users, Building2, LogIn, KeyRound, ArrowRight } from "lucide-react";
import { openDemo, loginDemoAccount, type DemoOpenResult } from "./actions";

type Account = { id: string; role: string; label: string };

const ROLE_ICON: Record<string, typeof GraduationCap> = {
  student: GraduationCap,
  teacher: Presentation,
  secretary: ClipboardList,
  parent: Users,
  rector: Building2,
};

export function DemoClient() {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res: DemoOpenResult = await openDemo(name, password);
      if (res.ok) { setAccounts(res.accounts); return; }
      setError(
        res.reason === "invalid" ? "Name oder Passwort ist falsch." :
        res.reason === "pending" ? `Dieser Demo-Zugang wird erst am ${res.date} freigeschaltet.` :
        res.reason === "expired" ? "Dieser Demo-Zugang ist abgelaufen." :
        "Zu viele Versuche — bitte kurz warten."
      );
    });
  }

  function pick(userId: string) {
    setError(null);
    startTransition(async () => {
      const res = await loginDemoAccount(name, password, userId);
      if (res && "error" in res) setError(res.error);
      // bei Erfolg redirectet die Server-Action
    });
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-12">
      <div className="mb-8 text-center">
        <span className="inline-grid size-14 place-items-center rounded-2xl bg-brand/10 text-brand">
          <KeyRound className="size-7" />
        </span>
        <h1 className="mt-4 text-2xl font-bold tracking-tight">MasterMind Demo</h1>
        <p className="mt-1 text-sm text-muted-fg">
          {accounts ? "Wähle einen Account, um die Demo zu starten." : "Gib die Zugangsdaten deiner Schule ein."}
        </p>
      </div>

      {error && (
        <p className="mb-4 rounded-xl border border-danger/30 bg-danger/8 px-4 py-2.5 text-sm font-medium text-danger">{error}</p>
      )}

      {!accounts ? (
        <form onSubmit={handleLogin} className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="name" className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">Schulname</label>
            <input id="name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus
              className="rounded-xl border border-border bg-bg px-3 py-2.5 text-sm focus:border-brand focus:outline-none" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="pw" className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">Demo-Passwort</label>
            <input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
              className="rounded-xl border border-border bg-bg px-3 py-2.5 font-mono text-sm focus:border-brand focus:outline-none" />
          </div>
          <button type="submit" disabled={pending}
            className="pastel-cta mt-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold active:scale-95 disabled:opacity-50">
            <LogIn className="size-4" /> {pending ? "Prüfe…" : "Demo öffnen"}
          </button>
        </form>
      ) : (
        <div className="flex flex-col gap-2.5">
          {accounts.map((a) => {
            const Icon = ROLE_ICON[a.role] ?? GraduationCap;
            return (
              <button key={a.id} type="button" onClick={() => pick(a.id)} disabled={pending}
                className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 text-left transition-all hover:border-brand/40 hover:shadow-sm active:scale-[0.99] disabled:opacity-50">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand">
                  <Icon className="size-5" strokeWidth={1.75} />
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-bold">{a.label}</span>
                  <span className="block text-xs text-muted-fg">Demo-Zugang</span>
                </span>
                <ArrowRight className="size-4 text-muted-fg" />
              </button>
            );
          })}
          <button type="button" onClick={() => { setAccounts(null); setPassword(""); }}
            className="mt-2 text-center text-xs font-semibold text-muted-fg hover:text-fg">
            ← Andere Zugangsdaten
          </button>
        </div>
      )}
    </div>
  );
}
