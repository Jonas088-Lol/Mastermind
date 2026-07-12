/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import { Lock, Wrench, ArrowRight } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { loginGate } from "./actions";

export const metadata: Metadata = { title: "Zugang · MasterMind" };

export default async function GatePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; redirect?: string }>;
}) {
  const { error, redirect } = await searchParams;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-bg px-5 py-12 sm:px-6">
      <div className="w-full max-w-90 space-y-8">

        {/* Logo */}
        <div className="flex justify-center">
          <BrandLogo height="h-9" showName />
        </div>

        {/* Maintenance notice */}
        <div className="flex items-start gap-3 border border-warning/30 bg-warning/6 px-4 py-3">
          <Wrench className="mt-0.5 size-4 shrink-0 text-warning" />
          <div className="space-y-0.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-warning">
              Wartungsarbeiten
            </p>
            <p className="text-xs leading-relaxed text-muted-fg">
              Die Plattform befindet sich in der Entwicklung und ist nur für
              autorisierte Tester zugänglich.
            </p>
          </div>
        </div>

        {/* Login card */}
        <div className="border border-border bg-surface px-6 py-7">
          <div className="mb-6 flex items-center gap-2">
            <Lock className="size-4 text-muted-fg" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-fg">
              Autorisierter Zugang
            </span>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-2.5 border border-danger/40 bg-danger/6 px-3 py-2.5 text-xs text-danger"
            >
              <Lock className="mt-0.5 size-3.5 shrink-0" />
              Benutzername oder Passwort falsch.
            </div>
          )}

          <form action={loginGate} className="space-y-5">
            {redirect && <input type="hidden" name="redirect" value={redirect} />}
            <div className="space-y-1.5">
              <Label htmlFor="username">Benutzername</Label>
              <Input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                autoFocus
                required
                placeholder="Admin"
                className="h-12 text-base"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Passwort</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
                className="h-12 text-base"
              />
            </div>

            <Button type="submit" size="lg" className="w-full">
              Anmelden
              <ArrowRight className="size-4" />
            </Button>
          </form>
        </div>

        <p className="text-center text-[11px] text-muted-fg">
          MasterMind · Nur für interne Tests
        </p>
      </div>
    </div>
  );
}
