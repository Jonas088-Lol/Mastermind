"use client";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="no-print inline-flex items-center gap-2 border border-border bg-fg px-4 py-2 text-sm font-semibold text-bg transition-colors hover:bg-fg/90"
    >
      Zeugnis drucken
    </button>
  );
}
