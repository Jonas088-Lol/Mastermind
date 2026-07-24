/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Farbwähler im Stil eines Bildbearbeitungsprogramms:
 * links das Spektrum (abgerundet), rechts die Farbwerte (HEX / RGB / HSV).
 * Bewusst ohne Transparenz/Alpha — für Branding nicht sinnvoll.
 *
 * Wird für Primär-, Sekundär- und Hintergrundfarben gleichermaßen verwendet.
 */

export const HEX_RE = /^#[0-9a-fA-F]{6}$/;

// ── Farbraum-Umrechnungen ────────────────────────────────────────────────────

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** HSV mit H 0–360, S/V 0–100 (wie in Bildbearbeitungsprogrammen). */
export function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h: Math.round(h), s: Math.round(max === 0 ? 0 : (d / max) * 100), v: Math.round(max * 100) };
}

export function hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
  const sn = s / 100, vn = v / 100;
  const c = vn * sn;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = vn - c;
  let rp = 0, gp = 0, bp = 0;
  if (h < 60) [rp, gp, bp] = [c, x, 0];
  else if (h < 120) [rp, gp, bp] = [x, c, 0];
  else if (h < 180) [rp, gp, bp] = [0, c, x];
  else if (h < 240) [rp, gp, bp] = [0, x, c];
  else if (h < 300) [rp, gp, bp] = [x, 0, c];
  else [rp, gp, bp] = [c, 0, x];
  return { r: (rp + m) * 255, g: (gp + m) * 255, b: (bp + m) * 255 };
}

// ── Komponente ───────────────────────────────────────────────────────────────

interface Props {
  value: string;
  onChange: (hex: string) => void;
  /** Formularfeld-Name für den Hex-Wert (optional, für Server-Actions). */
  hexName?: string;
  /** Kompakter Modus für die Vorschau-Ansicht (schmalere Spalten). */
  compact?: boolean;
}

export function ColorField({ value, onChange, hexName, compact = false }: Props) {
  const valid = HEX_RE.test(value);
  const rgb = valid ? hexToRgb(value) : { r: 0, g: 0, b: 0 };
  const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);

  // Freitext-Puffer, damit man den Hex-Code tippen kann, ohne dass jede
  // Zwischeneingabe sofort als ungültig zurückgesetzt wird.
  const [hexDraft, setHexDraft] = useState(value);
  useEffect(() => { setHexDraft(value); }, [value]);

  const areaRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const setFromHsv = useCallback((h: number, s: number, v: number) => {
    const { r, g, b } = hsvToRgb(h, s, v);
    onChange(rgbToHex(r, g, b));
  }, [onChange]);

  // Sättigung/Helligkeit über die Fläche wählen.
  const pickFromArea = useCallback((clientX: number, clientY: number) => {
    const el = areaRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    setFromHsv(hsv.h, Math.round(x * 100), Math.round((1 - y) * 100));
  }, [hsv.h, setFromHsv]);

  useEffect(() => {
    function move(e: PointerEvent) { if (dragging.current) pickFromArea(e.clientX, e.clientY); }
    function up() { dragging.current = false; }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
  }, [pickFromArea]);

  const numField = (label: string, val: number, max: number, onNum: (n: number) => void) => (
    <div className="flex items-center gap-2">
      <span className="w-5 shrink-0 text-[11px] font-semibold text-muted-fg">{label}</span>
      <input
        type="range" min={0} max={max} value={val}
        onChange={(e) => onNum(Number(e.target.value))}
        className="h-1 min-w-0 flex-1 cursor-pointer accent-brand"
        aria-label={label}
      />
      <input
        type="number" min={0} max={max} value={val}
        onChange={(e) => onNum(Number(e.target.value))}
        className="w-14 shrink-0 rounded-md border border-border bg-bg px-1.5 py-1 text-right font-mono text-xs text-fg outline-none focus:border-brand"
        aria-label={`${label} Wert`}
      />
    </div>
  );

  return (
    <div className={cn("grid gap-4", compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]")}>
      {/* ── Links: Spektrum ───────────────────────────────────────────────── */}
      <div className="space-y-2">
        <div
          ref={areaRef}
          onPointerDown={(e) => { dragging.current = true; pickFromArea(e.clientX, e.clientY); }}
          className="relative h-40 w-full cursor-crosshair overflow-hidden rounded-xl border border-border"
          style={{ backgroundColor: `hsl(${hsv.h}, 100%, 50%)` }}
          role="application"
          aria-label="Farbfläche — Sättigung und Helligkeit"
        >
          {/* Weiß nach rechts, Schwarz nach unten → klassisches SV-Feld */}
          <div className="absolute inset-0" style={{ background: "linear-gradient(to right, #fff, transparent)" }} />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, #000, transparent)" }} />
          <span
            className="pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
            style={{ left: `${hsv.s}%`, top: `${100 - hsv.v}%` }}
          />
        </div>

        {/* Farbton-Regler */}
        <input
          type="range" min={0} max={360} value={hsv.h}
          onChange={(e) => setFromHsv(Number(e.target.value), hsv.s, hsv.v)}
          className="h-3 w-full cursor-pointer appearance-none rounded-full"
          style={{ background: "linear-gradient(to right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)" }}
          aria-label="Farbton"
        />
      </div>

      {/* ── Rechts: Farbwerte ─────────────────────────────────────────────── */}
      <div className="space-y-3 rounded-xl border border-border bg-surface p-3">
        <div className="flex items-center gap-3">
          <div
            className="size-10 shrink-0 rounded-lg border border-border shadow-sm"
            style={{ background: valid ? value : "#000" }}
            title={value}
          />
          <div className="min-w-0 flex-1">
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-fg">
              Hex
            </label>
            <input
              value={hexDraft}
              onChange={(e) => {
                const v = e.target.value;
                setHexDraft(v);
                if (HEX_RE.test(v)) onChange(v);
              }}
              placeholder="#RRGGBB"
              maxLength={7}
              className="w-full rounded-md border border-border bg-bg px-2 py-1.5 font-mono text-sm uppercase text-fg outline-none focus:border-brand"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-fg">RGB</p>
          {numField("R", rgb.r, 255, (n) => onChange(rgbToHex(n, rgb.g, rgb.b)))}
          {numField("G", rgb.g, 255, (n) => onChange(rgbToHex(rgb.r, n, rgb.b)))}
          {numField("B", rgb.b, 255, (n) => onChange(rgbToHex(rgb.r, rgb.g, n)))}
        </div>

        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-fg">HSV</p>
          {numField("H", hsv.h, 360, (n) => setFromHsv(n, hsv.s, hsv.v))}
          {numField("S", hsv.s, 100, (n) => setFromHsv(hsv.h, n, hsv.v))}
          {numField("V", hsv.v, 100, (n) => setFromHsv(hsv.h, hsv.s, n))}
        </div>

        {hexName && <input type="hidden" name={hexName} value={valid ? value : ""} />}
        {!valid && <p className="text-xs text-danger">Ungültiges Format — erwartet #RRGGBB</p>}
      </div>
    </div>
  );
}
