"use client";

import { useState } from "react";

interface BrandLogoProps {
  /** Height class e.g. "h-8" */
  height?: string;
  /** Show "MasterMind" text next to MM fallback mark */
  showName?: boolean;
  /**
   * "inverted" uses logo-dark.png (for dark/coloured backgrounds).
   * Falls back to logo.png if logo-dark.png is absent.
   */
  variant?: "default" | "inverted";
  className?: string;
}

/**
 * Displays /public/brand/logo.png when present, otherwise falls back to the
 * "MM" text mark (+ optional name). Drop logo.png into public/brand/ and the
 * image is picked up automatically on the next page load — no code changes needed.
 *
 * For dark backgrounds supply variant="inverted" — it tries logo-dark.png first.
 */
export function BrandLogo({
  height = "h-8",
  showName = true,
  variant = "default",
  className,
}: BrandLogoProps) {
  const primarySrc = variant === "inverted" ? "/brand/logo-dark.png" : "/brand/logo.png";
  const [src, setSrc] = useState(primarySrc);
  const [failed, setFailed] = useState(false);

  function handleError() {
    if (src === "/brand/logo-dark.png") {
      // Fall back to the light logo before giving up
      setSrc("/brand/logo.png");
    } else {
      setFailed(true);
    }
  }

  if (!failed) {
    return (
      <img
        src={src}
        alt="Logo"
        className={`${height} w-auto max-w-45 object-contain object-left ${className ?? ""}`}
        onError={handleError}
      />
    );
  }

  // Text fallback
  const markCls =
    variant === "inverted"
      ? "grid size-7 shrink-0 place-items-center bg-bg text-fg text-[11px] font-black"
      : "grid size-7 shrink-0 place-items-center bg-fg text-bg text-[11px] font-black";

  return (
    <span className={`flex items-center gap-2 ${className ?? ""}`}>
      <span className={markCls}>MM</span>
      {showName && <span className="text-base font-bold tracking-tight">MasterMind</span>}
    </span>
  );
}
