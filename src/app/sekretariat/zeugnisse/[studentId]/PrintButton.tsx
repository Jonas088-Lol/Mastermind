/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex h-9 items-center gap-2 bg-brand px-4 text-sm font-semibold text-brand-fg transition-opacity hover:opacity-90"
    >
      <Printer className="size-4" />
      Drucken / PDF
    </button>
  );
}
