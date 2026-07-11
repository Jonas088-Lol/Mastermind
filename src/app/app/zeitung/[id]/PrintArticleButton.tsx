"use client";

import { Printer } from "lucide-react";

export function PrintArticleButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="print-hidden flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-fg hover:bg-surface"
    >
      <Printer className="size-3.5" /> Als PDF/Drucken
    </button>
  );
}
