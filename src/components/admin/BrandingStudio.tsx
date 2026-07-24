/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";

import { useState } from "react";
import { Check, Palette, SlidersHorizontal, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { MASTERMIND_PRESET, PRESET_GROUPS, findPresetByPair, type BrandPreset } from "@/lib/brand-presets";
import { ColorField } from "./ColorField";
import { GradientPreview } from "./GradientPreview";
import { BrandingPreviewModal } from "./BrandingPreviewModal";

/**
 * Farbteil des Schul-Brandings.
 *
 * Zwei Wege, bewusst vorab wählbar (damit niemand erst eine Voreinstellung
 * setzt und danach merkt, dass alles frei einstellbar ist):
 *  1. „Farbvoreinstellungen" — fertige Primär/Sekundär-Kombinationen
 *  2. „Personalisierte Farben" — freie Wahl inkl. Hintergrundfarben
 */

type Tab = "presets" | "custom";

const DEFAULT_BG_LIGHT = "#ffffff";
const DEFAULT_BG_DARK = "#0e1117";

export function BrandingStudio({
  defaultAccent,
  defaultSecondary,
  defaultBgLight,
  defaultBgDark,
  faviconSlot,
}: {
  defaultAccent: string;
  defaultSecondary: string;
  defaultBgLight: string | null;
  defaultBgDark: string | null;
  /** Favicon-Feld aus der Server-Komponente (bleibt Teil des Formulars). */
  faviconSlot?: React.ReactNode;
}) {
  const [tab, setTab] = useState<Tab>("presets");
  const [accent, setAccent] = useState(defaultAccent);
  const [secondary, setSecondary] = useState(defaultSecondary);
  const [bgLight, setBgLight] = useState(defaultBgLight || DEFAULT_BG_LIGHT);
  const [bgDark, setBgDark] = useState(defaultBgDark || DEFAULT_BG_DARK);
  const [previewOpen, setPreviewOpen] = useState(false);

  const activePreset = findPresetByPair(accent, secondary);

  function applyPreset(p: BrandPreset) {
    setAccent(p.accent);
    setSecondary(p.secondary);
  }

  return (
    <div className="space-y-6">
      {/* Werte gehen als versteckte Felder mit dem Formular mit. */}
      <input type="hidden" name="accentHex" value={accent} />
      <input type="hidden" name="secondaryHex" value={secondary} />
      <input type="hidden" name="bgLightHex" value={bgLight} />
      <input type="hidden" name="bgDarkHex" value={bgDark} />

      {/* ── Umschalter: Voreinstellung oder Personalisierung ───────────────── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {([
          { id: "presets" as Tab, icon: Palette, title: "Farbvoreinstellungen", desc: "Fertige Kombination auswählen — schnell und stimmig." },
          { id: "custom" as Tab, icon: SlidersHorizontal, title: "Personalisierte Farben", desc: "Farben frei bestimmen, inkl. Hintergrund." },
        ]).map((o) => {
          const Icon = o.icon;
          const active = tab === o.id;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => setTab(o.id)}
              aria-pressed={active}
              className={cn(
                "flex items-start gap-3 rounded-2xl border p-4 text-left transition-colors",
                active ? "border-brand bg-brand/5" : "border-border bg-surface hover:border-brand/40",
              )}
            >
              <span className={cn(
                "grid size-9 shrink-0 place-items-center rounded-full",
                active ? "bg-brand/15 text-brand" : "bg-bg text-muted-fg",
              )}>
                <Icon className="size-4" strokeWidth={1.75} />
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  {o.title}
                  {active && (
                    <span className="grid size-5 place-items-center rounded-full bg-brand/15 text-brand">
                      <Check className="size-3" strokeWidth={3} />
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-muted-fg">{o.desc}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Farbvoreinstellungen ──────────────────────────────────────────── */}
      {tab === "presets" && (
        <div className="space-y-6 rounded-2xl border border-border bg-surface p-5">
          <div>
            <h2 className="flex items-center gap-2 text-base font-bold">
              <Palette className="size-4 text-muted-fg" />
              Farbvoreinstellungen
            </h2>
            <p className="mt-1 text-xs text-muted-fg">
              Fertige Kombinationen aus Primär- und Sekundärfarbe — links im Balken die Primär-,
              rechts die Sekundärfarbe.
            </p>
          </div>
          {/* Haus-Voreinstellung ganz oben, über allen Gruppen */}
          <PresetCard
            preset={MASTERMIND_PRESET}
            active={activePreset?.id === MASTERMIND_PRESET.id}
            onSelect={() => applyPreset(MASTERMIND_PRESET)}
            featured
          />

          {PRESET_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-fg">
                {group.label}
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {group.presets.map((p) => (
                  <PresetCard
                    key={p.id}
                    preset={p}
                    active={activePreset?.id === p.id}
                    onSelect={() => applyPreset(p)}
                  />
                ))}
              </div>
            </div>
          ))}

          <div className="space-y-2 border-t border-border pt-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-fg">
              Vorschau · Farbverlauf
            </p>
            <GradientPreview accent={accent} secondary={secondary} bgLight={bgLight} bgDark={bgDark} />
          </div>
        </div>
      )}

      {/* ── Personalisierte Farben ────────────────────────────────────────── */}
      {tab === "custom" && (
        <div className="space-y-7 rounded-2xl border border-border bg-surface p-5">
          <div>
            <h2 className="flex items-center gap-2 text-base font-bold">
              <SlidersHorizontal className="size-4 text-muted-fg" />
              Personalisierte Farben
            </h2>
            <p className="mt-1 text-xs text-muted-fg">
              Farben frei bestimmen — Spektrum links, Farbwerte rechts.
            </p>
          </div>

          <section className="space-y-3 border-t border-border pt-6">
            <div>
              <h3 className="text-sm font-semibold">Primärfarbe</h3>
              <p className="text-xs text-muted-fg">Hauptfarbe — Buttons, Links, aktive Menüpunkte.</p>
            </div>
            <ColorField value={accent} onChange={setAccent} />
          </section>

          <section className="space-y-3 border-t border-border pt-6">
            <div>
              <h3 className="text-sm font-semibold">Sekundärfarbe</h3>
              <p className="text-xs text-muted-fg">Zweite Farbe — Ziel der Farbverläufe.</p>
            </div>
            <ColorField value={secondary} onChange={setSecondary} />
          </section>

          <section className="space-y-4 border-t border-border pt-6">
            <div>
              <h3 className="text-sm font-semibold">Hintergrund-Farbe</h3>
              <p className="text-xs text-muted-fg">
                Standard-Hintergrund für alle Nutzer der Schule — getrennt für hell und dunkel.
              </p>
            </div>
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-fg">
                Heller Hintergrund
              </p>
              <ColorField value={bgLight} onChange={setBgLight} />
            </div>
            <div className="space-y-3 pt-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-fg">
                Dunkler Hintergrund
              </p>
              <ColorField value={bgDark} onChange={setBgDark} />
            </div>
          </section>

          <section className="space-y-3 border-t border-border pt-6">
            <h3 className="text-sm font-semibold">Farbvorschau</h3>
            <GradientPreview accent={accent} secondary={secondary} bgLight={bgLight} bgDark={bgDark} />
          </section>

          {faviconSlot && (
            <section className="space-y-3 border-t border-border pt-6">{faviconSlot}</section>
          )}

          <div className="border-t border-border pt-6">
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="pastel-cta inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold sm:w-auto"
            >
              <Eye className="size-4" />
              Vorschau-Ansicht
            </button>
            <p className="mt-2 text-xs text-muted-fg">
              Farben live an einer echten App-Ansicht ausprobieren.
            </p>
          </div>
        </div>
      )}

      <BrandingPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        accent={accent} setAccent={setAccent}
        secondary={secondary} setSecondary={setSecondary}
        bgLight={bgLight} setBgLight={setBgLight}
        bgDark={bgDark} setBgDark={setBgDark}
      />
    </div>
  );
}

// ── Eine Voreinstellung als Karte (Primär links, Sekundär rechts) ────────────

function PresetCard({
  preset, active, onSelect, featured = false,
}: {
  preset: BrandPreset;
  active: boolean;
  onSelect: () => void;
  featured?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      title={`${preset.name} — ${preset.mood}`}
      className={cn(
        "group relative flex gap-3 rounded-xl border p-3 text-left transition-colors",
        featured ? "w-full items-center" : "flex-col",
        active ? "border-brand bg-brand/5" : "border-border bg-surface hover:border-brand/40",
      )}
    >
      {/* Farbpaar: links Primär, rechts Sekundär — wie der spätere Verlauf */}
      <span
        className={cn("shrink-0 overflow-hidden rounded-lg border border-border", featured ? "h-10 w-24" : "h-8 w-full")}
        style={{ backgroundImage: `linear-gradient(90deg, ${preset.accent} 0%, ${preset.secondary} 100%)` }}
      />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold">{preset.name}</span>
          {active && (
            <span className="grid size-5 shrink-0 place-items-center rounded-full bg-brand/15 text-brand">
              <Check className="size-3" strokeWidth={3} />
            </span>
          )}
        </span>
        <span className="mt-0.5 block truncate text-[11px] text-muted-fg">{preset.mood}</span>
      </span>
    </button>
  );
}
