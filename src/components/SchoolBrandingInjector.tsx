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

  const { accentColor, faviconUrl } = branding;
  const hsl = accentColor ? hexToHsl(accentColor) : null;
  const fgHsl = accentColor ? contrastFg(accentColor) : null;

  // Build a darker variant: shift lightness down ~10%
  let darkHsl: string | null = null;
  if (hsl) {
    const parts = hsl.split(" ");
    if (parts.length === 3) {
      const l = parseFloat(parts[2]);
      darkHsl = `${parts[0]} ${parts[1]} ${Math.max(0, l - 10)}%`;
    }
  }

  const css = hsl
    ? `:root{--brand:${hsl};--brand-fg:${fgHsl};--brand-glow:${hsl};--brand-dark:${darkHsl ?? hsl};}`
    : "";

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
