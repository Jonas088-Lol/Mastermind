"use client";

import { Printer } from "lucide-react";

interface Props {
  className?: string;
}

export function WorksheetPrintButton({ className }: Props) {
  return (
    <button
      onClick={() => window.print()}
      className={`inline-flex items-center gap-2 border border-border bg-bg px-3 py-1.5 text-xs font-medium text-muted-fg transition-colors hover:border-brand/40 hover:text-brand ${className ?? ""}`}
      title="Als PDF drucken / speichern"
    >
      <Printer className="size-3.5" />
      Drucken / PDF
    </button>
  );
}
