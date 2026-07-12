/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function AdminError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.error(error);
    }
  }, [error]);

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-6 p-8">
      <div className="grid size-16 place-items-center border border-danger/30 bg-danger/10">
        <AlertTriangle className="size-8 text-danger" strokeWidth={1.5} />
      </div>
      <div className="text-center">
        <h2 className="text-xl font-bold">Admin-Fehler</h2>
        <p className="mt-2 text-sm text-muted-fg">
          {error.message || "Ein unerwarteter Fehler ist aufgetreten."}
        </p>
        {error.digest && (
          <p className="mt-1 font-mono text-[11px] text-muted-fg">ID: {error.digest}</p>
        )}
      </div>
      <button
        type="button"
        onClick={unstable_retry}
        className="flex items-center gap-2 border border-border bg-bg px-4 py-2 text-sm font-medium transition-colors hover:bg-surface"
      >
        <RefreshCw className="size-4" strokeWidth={1.75} />
        Erneut versuchen
      </button>
    </div>
  );
}
