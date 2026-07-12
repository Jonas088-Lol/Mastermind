/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wrench, Lock } from "lucide-react";

export default function MaintenancePage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/maintenance/bypass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Ungültige Zugangsdaten");
      }
    } catch {
      setError("Verbindungsfehler");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[hsl(222,24%,7%)] p-6">
      {/* Logo */}
      <div className="mb-10 flex flex-col items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/logo.png"
          alt="Logo"
          className="h-10 w-auto object-contain"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
        />
        <span className="text-xl font-bold tracking-tight text-[hsl(210,16%,96%)]">MasterMind</span>
      </div>

      {/* Wartungs-Icon */}
      <div className="mb-8 grid size-20 place-items-center rounded-full bg-[hsl(222,22%,11%)] border border-[hsl(222,14%,18%)]">
        <Wrench className="size-9 text-[hsl(38,92%,50%)]" strokeWidth={1.5} />
      </div>

      <h1 className="mb-2 text-3xl font-bold tracking-tight text-[hsl(210,16%,96%)]">
        Wartungsarbeiten
      </h1>
      <p className="mb-10 max-w-md text-center text-sm text-[hsl(220,9%,64%)] leading-relaxed">
        Die Plattform wird gerade gewartet und ist bald wieder verfügbar.
        Bitte versuche es in einigen Minuten erneut.
      </p>

      {/* Bypass-Login */}
      <div className="w-full max-w-sm rounded-lg border border-[hsl(222,14%,18%)] bg-[hsl(222,22%,11%)] p-6">
        <div className="mb-4 flex items-center gap-2 text-[hsl(220,9%,64%)]">
          <Lock className="size-4" strokeWidth={1.5} />
          <span className="text-xs font-semibold uppercase tracking-wider">Team-Zugang</span>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            placeholder="E-Mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="rounded border border-[hsl(222,14%,18%)] bg-[hsl(222,24%,7%)] px-3 py-2 text-sm text-[hsl(210,16%,96%)] placeholder:text-[hsl(220,9%,46%)] focus:outline-none focus:border-[hsl(232,78%,56%)]"
          />
          <input
            type="password"
            placeholder="Passwort"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="rounded border border-[hsl(222,14%,18%)] bg-[hsl(222,24%,7%)] px-3 py-2 text-sm text-[hsl(210,16%,96%)] placeholder:text-[hsl(220,9%,46%)] focus:outline-none focus:border-[hsl(232,78%,56%)]"
          />
          {error && (
            <p className="text-xs text-[hsl(0,84%,60%)]">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="rounded bg-[hsl(232,78%,56%)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[hsl(232,78%,46%)] disabled:opacity-50"
          >
            {loading ? "Anmelden …" : "Anmelden"}
          </button>
        </form>
      </div>
    </div>
  );
}
