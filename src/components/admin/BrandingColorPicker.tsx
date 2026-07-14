/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";

import { useState, useId } from "react";
import { Check, Pipette } from "lucide-react";
import { PRESET_GROUPS, findPreset, type BrandPreset } from "@/lib/brand-presets";

interface Props {
  /** Gespeicherte Primärfarbe (Hex). */
  defaultAccent: string;
  /** Gespeicherte Sekundärfarbe (Hex). */
  defaultSecondary: string;
}

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

/**
 * Branding-Farbwähler für Primär- und Sekundärfarbe.
 * - Vorgefertigte Presets + eigene Farbe je Farbe
 * - Live-Vorschau inkl. Primär→Sekundär-Farbverlauf
 * Gibt die Felder "accent"/"accentHex" (primär) und
 * "secondary"/"secondaryHex" (sekundär) aus.
 */
export function BrandingColorPicker({ defaultAccent, defaultSecondary }: Props) {
  const [accent, setAccent] = useState(defaultAccent);
  const [secondary, setSecondary] = useState(defaultSecondary);

  const accentValid = HEX_RE.test(accent);
  const secondaryValid = HEX_RE.test(secondary);

  return (
    <div className="space-y-8">
      <ColorSection
        title="Primärfarbe"
        hint="Hauptfarbe — Buttons, Links, aktive Menüpunkte."
        colorName="accent"
        hexName="accentHex"
        value={accent}
        onChange={setAccent}
      />

      <div className="h-px bg-border" />

      <ColorSection
        title="Sekundärfarbe"
        hint="Zweite Farbe — Ziel der Farbverläufe (z. B. in Buttons)."
        colorName="secondary"
        hexName="secondaryHex"
        value={secondary}
        onChange={setSecondary}
      />

      {/* ── Gradient-Vorschau ─────────────────────────────────────────────── */}
      {accentValid && secondaryValid && (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-fg">
            Vorschau · Farbverlauf
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {(["#ffffff", "hsl(222,24%,7%)"] as const).map((bg, i) => (
              <div
                key={i}
                className="rounded-xl border p-4"
                style={{ background: bg, borderColor: i === 0 ? "hsl(var(--border))" : "hsl(222,14%,18%)" }}
              >
                <p
                  className="mb-3 text-[10px] font-medium uppercase tracking-wider"
                  style={{ color: i === 0 ? "#9ca3af" : "hsl(220,9%,46%)" }}
                >
                  {i === 0 ? "Hell" : "Dunkel"}
                </p>
                <button
                  type="button"
                  className="w-full rounded-lg px-3 py-2.5 text-sm font-semibold text-white shadow-sm"
                  style={{ backgroundImage: `linear-gradient(135deg, ${accent} 0%, ${secondary} 100%)` }}
                >
                  Gradient-Button
                </button>
                <div className="mt-2 flex items-center gap-2">
                  <span className="size-5 rounded" style={{ background: accent }} title="Primär" />
                  <div
                    className="h-2 flex-1 rounded-full"
                    style={{ backgroundImage: `linear-gradient(90deg, ${accent}, ${secondary})` }}
                  />
                  <span className="size-5 rounded" style={{ background: secondary }} title="Sekundär" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Eine Farbe: Presets + eigene Farbe ────────────────────────────────────────

function ColorSection({
  title,
  hint,
  colorName,
  hexName,
  value,
  onChange,
}: {
  title: string;
  hint: string;
  colorName: string;
  hexName: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const uid = useId();
  const isValid = HEX_RE.test(value);
  const activePreset = findPreset(value);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-fg">{title}</p>
        <p className="text-xs text-muted-fg">{hint}</p>
      </div>

      {/* Presets */}
      <div className="space-y-4">
        {PRESET_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-fg">
              {group.label}
            </p>
            <div className="grid grid-cols-4 gap-2">
              {group.presets.map((preset: BrandPreset) => {
                const isActive = value.toLowerCase() === preset.accent.toLowerCase();
                return (
                  <button
                    key={preset.id}
                    type="button"
                    title={`${preset.name} — ${preset.mood}`}
                    onClick={() => onChange(preset.accent)}
                    className="group relative flex flex-col items-start gap-1.5 rounded-lg border p-2.5 text-left transition-all duration-150"
                    style={{
                      borderColor: isActive ? preset.accent : "transparent",
                      background: isActive ? `${preset.accent}14` : "hsl(var(--surface))",
                      outline: isActive ? `2px solid ${preset.accent}` : "none",
                      outlineOffset: "1px",
                    }}
                  >
                    <div className="relative flex w-full items-center gap-2">
                      <div className="size-7 shrink-0 rounded-sm shadow-sm" style={{ background: preset.accent }} />
                      {isActive && (
                        <span
                          className="absolute left-0 top-0 grid size-7 place-items-center rounded-sm"
                          style={{ background: preset.accent }}
                        >
                          <Check className="size-3.5 text-white" strokeWidth={3} />
                        </span>
                      )}
                      <div
                        className="size-7 shrink-0 rounded-sm opacity-60 shadow-sm"
                        style={{ background: preset.accentDark ?? preset.accent }}
                      />
                    </div>
                    <span className="line-clamp-1 w-full text-[11px] font-semibold leading-tight text-fg">
                      {preset.name}
                    </span>
                    <span className="line-clamp-1 w-full text-[10px] leading-tight text-muted-fg">
                      {preset.mood.split(" · ")[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Eigene Farbe */}
      <div className="space-y-2">
        <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-fg">
          <Pipette className="size-3" />
          Eigene Farbe
        </p>
        <div className="flex items-center gap-3">
          <label htmlFor={`${uid}-color`} className="cursor-pointer">
            <input
              id={`${uid}-color`}
              name={colorName}
              type="color"
              value={isValid ? value : "#000000"}
              onChange={(e) => onChange(e.target.value)}
              className="h-10 w-14 cursor-pointer rounded border border-border bg-transparent p-0.5"
            />
          </label>
          <input
            name={hexName}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="#000000"
            pattern="^#[0-9a-fA-F]{6}$"
            maxLength={7}
            className="flex-1 rounded border border-border bg-surface px-3 py-2 font-mono text-sm text-fg placeholder:text-muted-fg focus:outline-none focus:ring-1 focus:ring-brand"
          />
          {isValid && (
            <div
              className="size-10 shrink-0 rounded border border-border shadow-sm"
              style={{ background: value }}
              title={value}
            />
          )}
        </div>
        {activePreset ? (
          <p className="text-xs text-muted-fg">
            Theme: <strong className="font-semibold text-fg">{activePreset.name}</strong>
            {" · "}
            {activePreset.mood}
          </p>
        ) : isValid ? (
          <p className="text-xs text-muted-fg">Eigene Farbe</p>
        ) : (
          <p className="text-xs text-danger">Ungültiges Format — erwartet: #RRGGBB</p>
        )}
      </div>
    </div>
  );
}
