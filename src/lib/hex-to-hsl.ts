/* Copyright 2026 Elian Schock, Jonas Schwenk */
/**
 * Converts a 6-digit hex color (#rrggbb) to HSL component string for CSS vars.
 * Returns e.g. "232 78% 56%" (no leading "hsl(" wrapper).
 * Returns null for invalid input.
 */
export function hexToHsl(hex: string): string | null {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;

  const r = parseInt(m[1].slice(0, 2), 16) / 255;
  const g = parseInt(m[1].slice(2, 4), 16) / 255;
  const b = parseInt(m[1].slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/** Pick white or dark text based on luminance of background hex. */
export function contrastFg(hex: string): "0 0% 100%" | "222 22% 11%" {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return "0 0% 100%";
  const r = parseInt(m[1].slice(0, 2), 16);
  const g = parseInt(m[1].slice(2, 4), 16);
  const b = parseInt(m[1].slice(4, 6), 16);
  // Relative luminance
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.55 ? "222 22% 11%" : "0 0% 100%";
}
