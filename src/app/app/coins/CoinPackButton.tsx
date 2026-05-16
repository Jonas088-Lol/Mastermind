"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface CoinPackButtonProps {
  slug: string;
  price: string;
  highlight?: boolean;
  disabled?: boolean;
}

export function CoinPackButton({ slug, price, highlight, disabled }: CoinPackButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleBuy() {
    if (disabled) return;
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      const data = await res.json() as { url?: string; error?: string };
      if (data.url) {
        window.location.href = data.url;
      }
    } finally {
      setLoading(false);
    }
  }

  const isDisabled = disabled || loading || !process.env.NEXT_PUBLIC_STRIPE_ENABLED;

  return (
    <button
      type="button"
      onClick={handleBuy}
      disabled={!!isDisabled}
      className={cn(
        "mt-auto w-full rounded px-3 py-2 text-sm font-semibold transition-opacity",
        highlight
          ? "bg-warning text-warning-fg"
          : "bg-surface-2 text-fg",
        isDisabled && "cursor-not-allowed opacity-60",
      )}
    >
      {loading ? "Weiterleiten…" : price}
    </button>
  );
}
