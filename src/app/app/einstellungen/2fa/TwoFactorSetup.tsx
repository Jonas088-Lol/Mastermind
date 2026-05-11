"use client";

import {
  AlertCircle,
  Check,
  Copy,
  ShieldCheck,
  ShieldOff,
  Smartphone,
} from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  confirmTwoFactorSetup,
  disableTwoFactor,
  startTwoFactorSetup,
} from "./actions";

type Phase = "idle" | "setup" | "confirming";

export interface TwoFactorSetupProps {
  initiallyEnabled: boolean;
}

export function TwoFactorSetup({ initiallyEnabled }: TwoFactorSetupProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const enabled = initiallyEnabled;
  const [secret, setSecret] = useState<string | null>(null);
  const [otpauthUrl, setOtpauthUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  async function start() {
    setError(null);
    startTransition(async () => {
      const res = await startTwoFactorSetup();
      if (!res.ok) {
        setError(res.error ?? "Setup fehlgeschlagen");
        return;
      }
      setSecret(res.secret ?? null);
      setOtpauthUrl(res.otpauthUrl ?? null);
      setPhase("setup");
    });
  }

  function reset() {
    setPhase("idle");
    setSecret(null);
    setOtpauthUrl(null);
    setError(null);
    setCopied(false);
  }

  async function copySecret() {
    if (!secret) return;
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore — Clipboard-Permissions können blockiert sein
    }
  }

  if (enabled && phase === "idle") {
    return (
      <div className="flex flex-col gap-4 border border-success/40 bg-success/[0.04] p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" strokeWidth={1.75} />
          <div className="flex-1">
            <p className="text-sm font-semibold">2-Faktor-Authentifizierung aktiv</p>
            <p className="mt-0.5 text-xs text-muted-fg">
              Bei jedem Login wird zusätzlich ein 6-stelliger Code aus deiner
              Authenticator-App abgefragt.
            </p>
          </div>
        </div>

        <details>
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-muted-fg hover:text-fg">
            2FA deaktivieren
          </summary>
          <form
            action={disableTwoFactor}
            className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="disable-code">Aktuellen 2FA-Code eingeben</Label>
              <Input
                id="disable-code"
                name="code"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                placeholder="123 456"
                required
              />
            </div>
            <Button
              type="submit"
              variant="outline"
              size="md"
              className="text-danger border-danger/40 hover:bg-danger/[0.06]"
            >
              <ShieldOff className="size-3.5" />
              Deaktivieren
            </Button>
          </form>
        </details>
      </div>
    );
  }

  if (phase === "idle") {
    return (
      <div className="flex flex-col gap-3 border border-border bg-bg p-5">
        <div className="flex items-start gap-3">
          <Smartphone className="mt-0.5 size-4 shrink-0 text-muted-fg" strokeWidth={1.75} />
          <div className="flex-1">
            <p className="text-sm font-semibold">2-Faktor-Authentifizierung</p>
            <p className="mt-0.5 text-xs text-muted-fg">
              Schützt deinen Account zusätzlich. Du brauchst eine Authenticator-App
              (Google Authenticator, 1Password, Bitwarden, Authy, Microsoft Authenticator).
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={start}
            disabled={pending}
          >
            {pending ? "…" : "Aktivieren"}
          </Button>
        </div>
        {error && (
          <p className="flex items-center gap-2 text-xs text-danger">
            <AlertCircle className="size-3" />
            {error}
          </p>
        )}
      </div>
    );
  }

  // setup phase — show secret + verify form
  return (
    <div className="flex flex-col gap-5 border border-brand/40 bg-brand/[0.04] p-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-brand">
          Schritt 1 · Authenticator einrichten
        </p>
        <p className="mt-2 text-sm">
          Öffne deine Authenticator-App und füge einen neuen Eintrag hinzu.
          Tippe auf den Link unten oder gib das Secret manuell ein.
        </p>
      </div>

      {otpauthUrl && (
        <a
          href={otpauthUrl}
          className="flex items-center justify-between gap-3 border border-border bg-bg px-4 py-3 transition-colors hover:bg-surface"
        >
          <span className="flex items-center gap-2">
            <Smartphone className="size-4 text-brand" strokeWidth={1.75} />
            <span className="text-sm font-semibold">In Authenticator-App öffnen</span>
          </span>
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-fg">
            otpauth://
          </span>
        </a>
      )}

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-fg">
          Oder Secret manuell eingeben
        </p>
        <div className="mt-2 flex items-stretch gap-2">
          <code className="flex-1 break-all border border-border bg-bg px-3 py-2 font-mono text-xs">
            {secret}
          </code>
          <button
            type="button"
            onClick={copySecret}
            aria-label="Secret kopieren"
            className={cn(
              "grid w-12 place-items-center border transition-colors",
              copied
                ? "border-success bg-success/10 text-success"
                : "border-border bg-bg hover:bg-surface"
            )}
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          </button>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-brand">
          Schritt 2 · Code aus der App eingeben
        </p>
        <form action={confirmTwoFactorSetup} className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
          <input type="hidden" name="secret" value={secret ?? ""} />
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="setup-code">6-stelliger Code</Label>
            <Input
              id="setup-code"
              name="code"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              placeholder="123 456"
              autoComplete="one-time-code"
              required
              autoFocus
            />
          </div>
          <Button type="submit" size="md">
            <ShieldCheck className="size-3.5" />
            Bestätigen + aktivieren
          </Button>
        </form>
      </div>

      <button
        type="button"
        onClick={reset}
        className="self-start text-xs font-medium text-muted-fg transition-colors hover:text-fg"
      >
        Abbrechen
      </button>
    </div>
  );
}
