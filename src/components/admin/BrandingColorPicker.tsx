/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";

import { useState, useId } from "react";
import { Check, Pipette } from "lucide-react";
import { PRESET_GROUPS, ALL_PRESETS, findPreset, type BrandPreset } from "@/lib/brand-presets";

interface Props {
  defaultAccent: string;
}

/**
 * Full-featured branding color picker with:
 * - Pre-made design presets (20 themes, 5 groups)
 * - Custom color via color picker + hex input
 * - Live UI preview
 * Outputs to form fields "accent" and "accentHex".
 */
export function BrandingColorPicker({ defaultAccent }: Props) {
  const uid = useId();
  const [accent, setAccent] = useState(defaultAccent);
  const activePreset = findPreset(accent);

  function applyPreset(preset: BrandPreset) {
    setAccent(preset.accent);
  }

  function handleHexInput(val: string) {
    setAccent(val);
  }

  function handleColorInput(val: string) {
    setAccent(val);
  }

  const isValidHex = /^#[0-9a-fA-F]{6}$/.test(accent);

  return (
    <div className="space-y-6">
      {/* ── Preset Groups ─────────────────────────────────────────────────── */}
      <div className="space-y-4">
        {PRESET_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-fg">
              {group.label}
            </p>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-4">
              {group.presets.map((preset) => {
                const isActive = accent.toLowerCase() === preset.accent.toLowerCase();
                return (
                  <button
                    key={preset.id}
                    type="button"
                    title={`${preset.name} — ${preset.mood}`}
                    onClick={() => applyPreset(preset)}
                    className="group relative flex flex-col items-start gap-1.5 rounded border p-2.5 text-left transition-all duration-150"
                    style={{
                      borderColor: isActive ? preset.accent : "transparent",
                      background: isActive
                        ? `${preset.accent}14`
                        : "hsl(var(--surface))",
                      outline: isActive ? `2px solid ${preset.accent}` : "none",
                      outlineOffset: "1px",
                    }}
                  >
                    {/* Swatch */}
                    <div className="relative flex w-full items-center gap-2">
                      <div
                        className="size-7 shrink-0 rounded-sm shadow-sm"
                        style={{ background: preset.accent }}
                      />
                      {/* Active check */}
                      {isActive && (
                        <span
                          className="absolute left-0 top-0 grid size-7 place-items-center rounded-sm"
                          style={{ background: preset.accent }}
                        >
                          <Check className="size-3.5 text-white" strokeWidth={3} />
                        </span>
                      )}
                      {/* Dark swatch */}
                      <div
                        className="size-7 shrink-0 rounded-sm opacity-60 shadow-sm"
                        style={{ background: preset.accentDark ?? preset.accent }}
                      />
                    </div>
                    {/* Name */}
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

      {/* ── Custom Color ──────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-fg flex items-center gap-1.5">
          <Pipette className="size-3" />
          Eigene Farbe
        </p>
        <div className="flex items-center gap-3">
          <label htmlFor={`${uid}-color`} className="cursor-pointer">
            <input
              id={`${uid}-color`}
              name="accent"
              type="color"
              value={isValidHex ? accent : "#000000"}
              onChange={(e) => handleColorInput(e.target.value)}
              className="h-10 w-14 cursor-pointer rounded border border-border p-0.5 bg-transparent"
            />
          </label>
          <input
            name="accentHex"
            value={accent}
            onChange={(e) => handleHexInput(e.target.value)}
            placeholder="#000000"
            pattern="^#[0-9a-fA-F]{6}$"
            maxLength={7}
            className="flex-1 rounded border border-border bg-surface px-3 py-2 font-mono text-sm text-fg placeholder:text-muted-fg focus:outline-none focus:ring-1 focus:ring-[var(--accent-preview)]"
            style={{ "--accent-preview": accent } as React.CSSProperties}
          />
          {isValidHex && (
            <div
              className="size-10 shrink-0 rounded border border-border shadow-sm"
              style={{ background: accent }}
              title={accent}
            />
          )}
        </div>
        {activePreset ? (
          <p className="text-xs text-muted-fg">
            Theme: <strong className="font-semibold text-fg">{activePreset.name}</strong>
            {" · "}{activePreset.mood}
          </p>
        ) : isValidHex ? (
          <p className="text-xs text-muted-fg">Eigene Farbe</p>
        ) : (
          <p className="text-xs text-[hsl(0,84%,60%)]">Ungültiges Format — erwartet: #RRGGBB</p>
        )}
      </div>

      {/* ── Live UI Preview ───────────────────────────────────────────────── */}
      {isValidHex && (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-fg">
            Vorschau
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {/* Light preview */}
            <div className="rounded border border-border bg-white p-4">
              <p className="mb-3 text-[10px] font-medium uppercase tracking-wider text-[#9ca3af]">Hell</p>
              <div className="space-y-2">
                {/* Active nav item */}
                <div
                  className="flex items-center gap-2 rounded px-3 py-2 text-sm font-medium text-white"
                  style={{ background: accent }}
                >
                  <span className="size-3.5 rounded-sm bg-white/30" />
                  <span>Aktiver Menüpunkt</span>
                </div>
                {/* Button */}
                <button
                  type="button"
                  className="w-full rounded px-3 py-2 text-sm font-semibold text-white transition"
                  style={{ background: accent }}
                >
                  Primär-Button
                </button>
                {/* Link + badge */}
                <div className="flex items-center gap-3 px-1 py-1">
                  <span className="text-sm font-medium" style={{ color: accent }}>
                    Link-Farbe
                  </span>
                  <span
                    className="rounded px-2 py-0.5 text-[11px] font-semibold text-white"
                    style={{ background: accent }}
                  >
                    Badge
                  </span>
                  <span
                    className="rounded px-2 py-0.5 text-[11px] font-semibold"
                    style={{ background: `${accent}18`, color: accent }}
                  >
                    Subtil
                  </span>
                </div>
              </div>
            </div>
            {/* Dark preview */}
            <div className="rounded border border-[hsl(222,14%,18%)] bg-[hsl(222,24%,7%)] p-4">
              <p className="mb-3 text-[10px] font-medium uppercase tracking-wider text-[hsl(220,9%,46%)]">Dunkel</p>
              <div className="space-y-2">
                {/* Active nav item */}
                <div
                  className="flex items-center gap-2 rounded px-3 py-2 text-sm font-medium text-white"
                  style={{ background: accent }}
                >
                  <span className="size-3.5 rounded-sm bg-white/30" />
                  <span>Aktiver Menüpunkt</span>
                </div>
                {/* Button */}
                <button
                  type="button"
                  className="w-full rounded px-3 py-2 text-sm font-semibold text-white transition"
                  style={{ background: accent }}
                >
                  Primär-Button
                </button>
                {/* Link + badge */}
                <div className="flex items-center gap-3 px-1 py-1">
                  <span className="text-sm font-medium" style={{ color: accent }}>
                    Link-Farbe
                  </span>
                  <span
                    className="rounded px-2 py-0.5 text-[11px] font-semibold text-white"
                    style={{ background: accent }}
                  >
                    Badge
                  </span>
                  <span
                    className="rounded px-2 py-0.5 text-[11px] font-semibold"
                    style={{ background: `${accent}22`, color: accent }}
                  >
                    Subtil
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
