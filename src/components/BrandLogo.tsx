"use client";

import { useState } from "react";

interface BrandLogoProps {
  /** Explicit logo URL (e.g. school logo). Skips file-system fallback when set. */
  src?: string | null;
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
  /** Alt text for the logo image */
  alt?: string;
}

/**
 * Displays a logo image with graceful fallback chain:
 *   1. Explicit `src` prop (school logo from DB)
 *   2. /public/brand/logo.png (platform-wide custom logo)
 *   3. /public/brand/logo-dark.png (inverted variant)
 *   4. "MM" text mark fallback
 */
export function BrandLogo({
  src,
  height = "h-8",
  showName = true,
  variant = "default",
  className,
  alt = "Logo",
}: BrandLogoProps) {
  const platformSrc = variant === "inverted" ? "/brand/logo-dark.png" : "/brand/logo.png";

  // Start with explicit src, fall through to platform logo
  const initialSrc = src ?? platformSrc;
  const [imgSrc, setImgSrc] = useState(initialSrc);
  const [failed, setFailed] = useState(false);

  function handleError() {
    if (imgSrc === src && src !== platformSrc) {
      // Custom school logo failed — try platform logo
      setImgSrc(platformSrc);
    } else if (imgSrc !== "/brand/logo.png" && imgSrc !== "/brand/logo-dark.png") {
      setFailed(true);
    } else if (imgSrc === "/brand/logo-dark.png") {
      setImgSrc("/brand/logo.png");
    } else {
      setFailed(true);
    }
  }

  if (!failed) {
    if (!showName) {
      return (
        <img
          src={imgSrc}
          alt={alt}
          className={`${height} w-auto max-w-45 object-contain object-left ${className ?? ""}`}
          onError={handleError}
        />
      );
    }
    return (
      <span className={`flex items-center gap-2.5 ${className ?? ""}`}>
        <img
          src={imgSrc}
          alt={alt}
          className={`${height} w-auto max-w-10 object-contain object-left shrink-0`}
          onError={handleError}
        />
        <span className="text-base font-bold tracking-tight">MasterMind</span>
      </span>
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
