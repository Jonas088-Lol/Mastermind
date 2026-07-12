/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";

import { useEffect, useState } from "react";
import { X, ShieldCheck, Eye, Clock, TabletSmartphone, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

type ConsentState = "loading" | "needed" | "done";

export function ConsentBanner() {
  const [state, setState] = useState<ConsentState>("loading");
  const [activityChecked, setActivityChecked] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  useEffect(() => {
    fetch("/api/activity/consent")
      .then((r) => r.json())
      .then((d) => {
        // If consent record exists (granted or explicitly declined), banner is done
        if (d.consent !== null && d.consent !== undefined) {
          setState("done");
        } else {
          setState("needed");
        }
      })
      .catch(() => setState("done")); // On error, don't block the user
  }, []);

  async function handleSave() {
    setSaving(true);
    await fetch("/api/activity/consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activityTracking: activityChecked }),
    }).catch(() => null);
    setSaving(false);
    setState("done");
  }

  function handleDecline() {
    // Save explicit "no" so we don't ask again
    fetch("/api/activity/consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activityTracking: false }),
    }).catch(() => null);
    setState("done");
  }

  if (state !== "needed") return null;

  return (
    <>
      {/* Backdrop (subtle) */}
      <div className="fixed inset-0 z-[300] bg-black/20 backdrop-blur-[2px]" />

      {/* Banner */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Datenschutz-Einwilligung"
        className="fixed bottom-0 left-0 right-0 z-[301] mx-auto max-w-2xl p-4 sm:bottom-6 sm:left-1/2 sm:right-auto sm:-translate-x-1/2"
      >
        <div className="overflow-hidden rounded-2xl border border-border bg-bg shadow-2xl">
          {/* Header */}
          <div className="flex items-start gap-3 border-b border-border bg-surface px-5 py-4">
            <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand/10">
              <ShieldCheck className="size-5 text-brand" />
            </div>
            <div className="flex-1">
              <h2 className="text-base font-bold">Datenschutz & Einwilligung</h2>
              <p className="mt-0.5 text-sm text-muted-fg">
                MasterMind verwendet ausschließlich technisch notwendige Cookies.
                Optional kannst du der Aktivitätsverfolgung zustimmen.
              </p>
            </div>
          </div>

          {/* Body */}
          <div className="px-5 py-4">
            {/* Mandatory notice */}
            <div className="mb-4 flex items-start gap-3 rounded-xl border border-border bg-surface px-4 py-3">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-green-500" />
              <div>
                <p className="text-sm font-semibold">Technisch notwendige Cookies (immer aktiv)</p>
                <p className="mt-0.5 text-xs text-muted-fg">
                  Session-Cookie für deine Anmeldung. Ohne diese Cookies funktioniert MasterMind nicht.
                  Keine Einwilligung erforderlich (Art. 6 Abs. 1 lit. b DSGVO).
                </p>
              </div>
              <span className="ml-auto shrink-0 rounded-full bg-green-500/15 px-2.5 py-0.5 text-[10px] font-bold text-green-600">
                Aktiv
              </span>
            </div>

            {/* Optional tracking */}
            <div
              className={cn(
                "rounded-xl border px-4 py-3 transition-colors",
                activityChecked ? "border-brand/30 bg-brand/4" : "border-border bg-surface"
              )}
            >
              <label className="flex cursor-pointer items-start gap-3">
                <div className="mt-0.5">
                  <input
                    type="checkbox"
                    checked={activityChecked}
                    onChange={(e) => setActivityChecked(e.target.checked)}
                    className="sr-only"
                    id="consent-activity"
                  />
                  <div
                    className={cn(
                      "flex size-5 items-center justify-center rounded border-2 transition-colors",
                      activityChecked
                        ? "border-brand bg-brand text-white"
                        : "border-border bg-bg"
                    )}
                    onClick={() => setActivityChecked((v) => !v)}
                  >
                    {activityChecked && (
                      <svg viewBox="0 0 12 12" className="size-3 fill-none stroke-current stroke-[2.5]">
                        <polyline points="1.5,6 4.5,9 10.5,3" />
                      </svg>
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">Aktivitätsverfolgung (freiwillig)</p>
                  <p className="mt-0.5 text-xs text-muted-fg">
                    Ermöglicht Lehrern zu sehen, wie lange du auf MasterMind aktiv bist und
                    wie oft du den Tab wechselst. Hilft beim Erkennen von Ablenkungen.
                  </p>
                </div>
              </label>

              {/* Details toggle */}
              <button
                onClick={() => setDetailsOpen((v) => !v)}
                className="mt-2.5 flex items-center gap-1.5 text-xs font-medium text-muted-fg hover:text-fg"
              >
                {detailsOpen ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                Was genau wird gespeichert?
              </button>

              {detailsOpen && (
                <div className="mt-3 space-y-2.5 border-t border-border pt-3">
                  <DataItem icon={<Eye className="size-3.5 text-brand" />} label="Aktuelle Seite" value='z.B. "Macht Übungen", "Lernt Karteikarten"' />
                  <DataItem icon={<Clock className="size-3.5 text-brand" />} label="Aktive Zeit" value="Sekunden mit Maus-/Tastaturaktivität auf MasterMind" />
                  <DataItem icon={<TabletSmartphone className="size-3.5 text-brand" />} label="Tab-Wechsel" value="Wie oft du zwischen Tabs/Apps wechselst (pro Tag)" />

                  <div className="rounded-xl border border-warning/30 bg-warning/8 px-3 py-2.5">
                    <p className="text-[11px] font-semibold text-warning">Wichtiger Hinweis</p>
                    <p className="mt-0.5 text-[11px] text-muted-fg">
                      Wir können <strong>nicht</strong> sehen welche anderen Webseiten du besuchst oder
                      was du auf anderen Tabs machst. Tab-Wechsel sind ein Hinweis — kein Beweis —
                      und ersetzen kein pädagogisches Gespräch.
                    </p>
                  </div>

                  <div className="space-y-1 text-[11px] text-muted-fg">
                    <p><strong>Zweck:</strong> Lernzeit-Analyse & Unterstützung durch Lehrkräfte</p>
                    <p><strong>Zugriff:</strong> Deine Lehrkräfte & Schuladmins an deiner Schule</p>
                    <p><strong>Speicherdauer:</strong> 30 Tage, danach automatische Löschung</p>
                    <p><strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. a DSGVO (Einwilligung)</p>
                    <p><strong>Widerruf:</strong> Jederzeit unter Einstellungen → Datenschutz möglich</p>
                  </div>
                </div>
              )}
            </div>

            {/* Privacy link */}
            <button
              onClick={() => setShowPrivacy(true)}
              className="mt-2 text-xs text-muted-fg underline-offset-2 hover:underline"
            >
              Vollständige Datenschutzerklärung lesen
            </button>
          </div>

          {/* Footer */}
          <div className="flex flex-col gap-2 border-t border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[10px] text-muted-fg">
              Diese Einwilligung gilt für Schuljahr 2025/26. Version 1.0.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleDecline}
                disabled={saving}
                className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted-fg transition-colors hover:bg-muted sm:flex-none"
              >
                Nur notwendige
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60 sm:flex-none"
              >
                {saving ? "Speichere…" : activityChecked ? "Einwilligen & Speichern" : "Nur notwendige speichern"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Privacy policy overlay */}
      {showPrivacy && <PrivacyModal onClose={() => setShowPrivacy(false)} />}
    </>
  );
}

function DataItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div>
        <span className="text-[11px] font-semibold">{label}:</span>{" "}
        <span className="text-[11px] text-muted-fg">{value}</span>
      </div>
    </div>
  );
}

// ── Inline Datenschutzerklärung (kompakt) ─────────────────────────────────

function PrivacyModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative flex max-h-[85dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-bg shadow-2xl">
        <div className="flex items-center gap-3 border-b border-border bg-surface px-5 py-4">
          <ShieldCheck className="size-5 text-brand" />
          <h2 className="flex-1 text-base font-bold">Datenschutzerklärung</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-fg hover:bg-muted">
            <X className="size-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5 text-sm leading-relaxed text-muted-fg space-y-4">
          <Section title="1. Verantwortlicher">
            <p>
              Verantwortlich für die Datenverarbeitung ist die jeweilige Schule,
              die MasterMind einsetzt. Der Plattformbetreiber agiert als Auftragsverarbeiter
              gemäß Art. 28 DSGVO.
            </p>
          </Section>

          <Section title="2. Technisch notwendige Daten">
            <p>
              Zur Bereitstellung des Dienstes verarbeiten wir: Anmeldedaten (E-Mail, Passwort-Hash),
              Session-Cookies (httpOnly, Secure), IP-Adresse bei der Anmeldung,
              User-Agent. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO.
              Speicherdauer: Dauer der aktiven Session + 30 Tage.
            </p>
          </Section>

          <Section title="3. Optionale Aktivitätsverfolgung">
            <p>
              <strong>Nur bei ausdrücklicher Einwilligung</strong> (Art. 6 Abs. 1 lit. a DSGVO)
              werden folgende Daten erfasst:
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>Aktuelle Unterseite auf MasterMind (z.B. „Übungen", „Karteikarten")</li>
              <li>Tägliche aktive Nutzungszeit (Sekunden mit Maus-/Tastaturaktivität)</li>
              <li>Anzahl der Tab-Wechsel pro Tag (unser Tab geht in den Hintergrund)</li>
              <li>Ob unser Tab aktuell im Vordergrund ist (ja/nein)</li>
            </ul>
            <p className="mt-2 rounded-lg bg-warning/8 px-3 py-2 text-[12px] text-warning font-medium">
              Wir erfassen NICHT: besuchte externe Webseiten, Inhalte anderer Tabs,
              Tastatureingaben oder Bildschirmaufnahmen.
            </p>
            <p className="mt-2">
              <strong>Zugriff:</strong> Lehrkräfte und Administratoren deiner Schule.<br />
              <strong>Speicherdauer:</strong> 30 Tage, danach automatische Löschung.<br />
              <strong>Widerruf:</strong> Jederzeit unter Einstellungen → Datenschutz.
              Bei Widerruf werden alle gespeicherten Aktivitätsdaten sofort gelöscht.
            </p>
          </Section>

          <Section title="4. Deine Rechte (DSGVO)">
            <ul className="list-inside list-disc space-y-1">
              <li>Auskunft über gespeicherte Daten (Art. 15)</li>
              <li>Berichtigung unrichtiger Daten (Art. 16)</li>
              <li>Löschung deiner Daten (Art. 17)</li>
              <li>Einschränkung der Verarbeitung (Art. 18)</li>
              <li>Datenübertragbarkeit (Art. 20)</li>
              <li>Widerspruch gegen die Verarbeitung (Art. 21)</li>
              <li>Widerruf einer Einwilligung jederzeit ohne Angabe von Gründen</li>
            </ul>
            <p className="mt-2">
              Zur Ausübung deiner Rechte oder bei Fragen wende dich an den
              Datenschutzbeauftragten deiner Schule.
            </p>
          </Section>

          <Section title="5. Minderjährige">
            <p>
              MasterMind richtet sich auch an minderjährige Schülerinnen und Schüler.
              Die optionale Aktivitätsverfolgung kann vom Schüler selbst aktiviert werden.
              Eltern können die erteilte Einwilligung jederzeit widerrufen lassen
              (über die Schule oder direkt in den Einstellungen).
            </p>
          </Section>

          <Section title="6. Keine Weitergabe an Dritte">
            <p>
              Deine Daten werden nicht an Werbetreibende oder andere Dritte verkauft oder
              weitergegeben. Eine Übertragung erfolgt ausschließlich an die Schule im Rahmen
              des Auftragsverarbeitungsvertrags.
            </p>
          </Section>

          <Section title="7. Beschwerderecht">
            <p>
              Du hast das Recht, dich bei der zuständigen Datenschutz-Aufsichtsbehörde
              zu beschweren. In Deutschland sind dies die Landesbeauftragten für Datenschutz
              (je nach Bundesland).
            </p>
          </Section>
        </div>
        <div className="border-t border-border px-5 py-3">
          <button
            onClick={onClose}
            className="w-full rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
          >
            Verstanden, schließen
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-1.5 text-sm font-bold text-fg">{title}</h3>
      {children}
    </div>
  );
}
