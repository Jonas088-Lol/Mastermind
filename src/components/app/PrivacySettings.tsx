/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, Eye, Clock, TabletSmartphone, Trash2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

type ConsentRecord = {
  activityTracking: boolean;
  consentedAt: string | null;
  revokedAt: string | null;
  version: string;
} | null;

type DayStat = { sessionDate: string; activeSeconds: number; tabSwitches: number };

function fmtSeconds(s: number): string {
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} Min.`;
  return `${Math.floor(m / 60)}h ${m % 60} Min.`;
}

export function PrivacySettings() {
  const [consent, setConsent] = useState<ConsentRecord>(null);
  const [last7, setLast7] = useState<DayStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activityChecked, setActivityChecked] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/activity").then((r) => r.json()).catch(() => ({}));
    setConsent(res.consent ?? null);
    setLast7(res.last7 ?? []);
    setActivityChecked(res.consent?.activityTracking ?? false);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleSave() {
    setSaving(true);
    await fetch("/api/activity/consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activityTracking: activityChecked }),
    });
    setSaving(false);
    load();
  }

  async function handleRevoke() {
    if (!confirm("Alle Aktivitätsdaten löschen und Einwilligung widerrufen?")) return;
    setDeleting(true);
    await fetch("/api/activity/consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ revoke: true }),
    });
    setDeleting(false);
    load();
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-muted-fg">
        <RefreshCw className="size-4 animate-spin" />
        Lade Datenschutz-Einstellungen…
      </div>
    );
  }

  const hasConsented = consent?.activityTracking === true;

  return (
    <div className="space-y-5">
      {/* Consent card */}
      <div className="rounded-2xl border border-border bg-surface p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand/10 mt-0.5">
            <ShieldCheck className="size-5 text-brand" />
          </div>
          <div>
            <h3 className="text-sm font-bold">Aktivitätsverfolgung</h3>
            <p className="mt-0.5 text-xs text-muted-fg">
              Wenn aktiviert, können deine Lehrkräfte sehen wie lange du aktiv bist
              und wie oft du den Tab wechselst.
            </p>
          </div>
          <span
            className={cn(
              "ml-auto shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold",
              hasConsented
                ? "bg-green-500/15 text-green-600"
                : "bg-muted text-muted-fg"
            )}
          >
            {hasConsented ? "Eingewilligt" : "Nicht aktiv"}
          </span>
        </div>

        {/* What's tracked */}
        <div className="mb-4 space-y-2">
          <TrackItem icon={<Eye className="size-3.5 text-brand" />} text='Aktuelle Seite auf MasterMind (z.B. "Macht Übungen")' />
          <TrackItem icon={<Clock className="size-3.5 text-brand" />} text="Aktive Zeit mit Maus-/Tastaturaktivität" />
          <TrackItem icon={<TabletSmartphone className="size-3.5 text-brand" />} text="Anzahl Tab-Wechsel pro Tag" />
          <p className="text-[11px] text-muted-fg bg-muted rounded-lg px-3 py-2">
            Nicht erfasst: externe Webseiten, andere Tab-Inhalte, Tastatureingaben oder Bildschirmaufnahmen.
          </p>
        </div>

        <label className="flex cursor-pointer items-center gap-3">
          <div
            className={cn(
              "flex size-5 items-center justify-center rounded border-2 transition-colors",
              activityChecked ? "border-brand bg-brand text-brand-fg" : "border-border bg-bg"
            )}
            onClick={() => setActivityChecked((v) => !v)}
          >
            {activityChecked && (
              <svg viewBox="0 0 12 12" className="size-3 fill-none stroke-current stroke-[2.5]">
                <polyline points="1.5,6 4.5,9 10.5,3" />
              </svg>
            )}
          </div>
          <span className="text-sm font-medium">Aktivitätsverfolgung erlauben</span>
        </label>

        <div className="mt-4 flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "Speichere…" : "Einstellung speichern"}
          </button>
          {hasConsented && (
            <button
              onClick={handleRevoke}
              disabled={deleting}
              className="flex items-center gap-1.5 rounded-xl border border-danger/30 px-4 py-2 text-sm font-medium text-danger hover:bg-danger/5 disabled:opacity-60"
            >
              <Trash2 className="size-3.5" />
              {deleting ? "Lösche…" : "Widerrufen & Daten löschen"}
            </button>
          )}
        </div>

        {consent?.consentedAt && (
          <p className="mt-3 text-[11px] text-muted-fg">
            Eingewilligt am: {new Date(consent.consentedAt).toLocaleString("de-DE")} · Version {consent.version}
          </p>
        )}
        {consent?.revokedAt && (
          <p className="mt-1 text-[11px] text-muted-fg">
            Widerrufen am: {new Date(consent.revokedAt).toLocaleString("de-DE")}
          </p>
        )}
      </div>

      {/* My data — last 7 days */}
      {last7.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface p-5">
          <h3 className="mb-3 text-sm font-bold">Meine gespeicherten Aktivitätsdaten (letzte 7 Tage)</h3>
          <div className="space-y-2">
            {last7.map((d) => (
              <div key={d.sessionDate} className="flex items-center gap-4 rounded-xl bg-muted/40 px-4 py-2.5">
                <span className="w-24 shrink-0 text-xs font-mono text-muted-fg">{d.sessionDate}</span>
                <div className="flex flex-1 gap-4 text-xs">
                  <span className="flex items-center gap-1">
                    <Clock className="size-3 text-brand" />
                    {fmtSeconds(d.activeSeconds)} aktiv
                  </span>
                  <span className="flex items-center gap-1">
                    <TabletSmartphone className="size-3 text-muted-fg" />
                    {d.tabSwitches} Tab-Wechsel
                  </span>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-muted-fg">
            Daten werden nach 30 Tagen automatisch gelöscht. Du kannst sie jederzeit oben widerrufen.
          </p>
        </div>
      )}
    </div>
  );
}

function TrackItem({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-start gap-2 text-xs text-muted-fg">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <span>{text}</span>
    </div>
  );
}
