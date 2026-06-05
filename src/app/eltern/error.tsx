"use client";
import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function ElternError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-6 p-8">
      <div className="grid size-16 place-items-center border border-danger/30 bg-danger/10">
        <AlertTriangle className="size-8 text-danger" strokeWidth={1.5} />
      </div>
      <div className="text-center">
        <h2 className="text-xl font-bold">Fehler</h2>
        <p className="mt-2 text-sm text-muted-fg">{error.message || "Ein Fehler ist aufgetreten."}</p>
      </div>
      <button onClick={reset} className="flex items-center gap-2 border border-border bg-bg px-4 py-2 text-sm font-medium hover:bg-surface">
        <RefreshCw className="size-4" strokeWidth={1.75} /> Erneut versuchen
      </button>
    </div>
  );
}
