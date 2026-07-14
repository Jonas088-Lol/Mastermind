/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { hexToHsl, contrastFg } from "@/lib/hex-to-hsl";
import type { SchoolBranding } from "@/lib/school-branding";

interface Props {
  branding: SchoolBranding | null;
}

/**
 * Server component — injects per-school CSS variables and overrides the
 * favicon/apple-touch-icon when a school has custom branding set.
 * Place inside the <head> of authenticated layout routes.
 */
export function SchoolBrandingInjector({ branding }: Props) {
  if (!branding) return null;

  const { accentColor, secondaryColor, faviconUrl } = branding;

  // Lightness um `delta` verschieben (für -dark/-glow-Varianten).
  const shiftL = (hsl: string, delta: number): string => {
    const parts = hsl.split(" ");
    if (parts.length !== 3) return hsl;
    const l = parseFloat(parts[2]);
    return `${parts[0]} ${parts[1]} ${Math.min(100, Math.max(0, l + delta))}%`;
  };

  const brandHsl = accentColor ? hexToHsl(accentColor) : null;
  const brandFg = accentColor ? contrastFg(accentColor) : null;
  const secHsl = secondaryColor ? hexToHsl(secondaryColor) : null;
  const secFg = secondaryColor ? contrastFg(secondaryColor) : null;

  const decls: string[] = [];
  if (brandHsl) {
    decls.push(
      `--brand:${brandHsl}`,
      `--brand-fg:${brandFg}`,
      `--brand-glow:${shiftL(brandHsl, 8)}`,
      `--brand-dark:${shiftL(brandHsl, -12)}`,
    );
  }
  if (secHsl) {
    decls.push(
      `--accent:${secHsl}`,
      `--accent-fg:${secFg}`,
      `--accent-dark:${shiftL(secHsl, -12)}`,
    );
  }
  // Fällt keine Sekundärfarbe an, aber eine Primärfarbe → Verläufe trotzdem
  // sinnvoll: Akzent = Primärfarbe, damit Gradients nicht "kaputt" wirken.
  if (brandHsl && !secHsl) {
    decls.push(`--accent:${brandHsl}`, `--accent-fg:${brandFg}`, `--accent-dark:${shiftL(brandHsl, -12)}`);
  }

  const css = decls.length ? `:root{${decls.join(";")};}` : "";

  return (
    <>
      {css && (
        <style
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: css }}
        />
      )}
      {faviconUrl && (
        <>
          <link rel="icon" href={faviconUrl} />
          <link rel="apple-touch-icon" href={faviconUrl} />
          <link rel="shortcut icon" href={faviconUrl} />
        </>
      )}
    </>
  );
}
