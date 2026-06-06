"use client";
import { useEffect, useState, useRef } from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
  assignmentId: string;
  studentId: string;
  children: React.ReactNode;
}

export function ExamFocusGuard({ assignmentId, studentId, children }: Props) {
  const [tabSwitches, setTabSwitches] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const switchCount = useRef(0);

  useEffect(() => {
    function handleVisibility() {
      if (document.hidden) {
        switchCount.current += 1;
        setTabSwitches(switchCount.current);
        setShowWarning(true);
        // Report to server (fire and forget)
        fetch("/api/exam/focus-event", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assignmentId, eventType: "tab_switch", count: switchCount.current }),
        }).catch(() => {});
      } else {
        setShowWarning(false);
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [assignmentId]);

  return (
    <div className="relative">
      {showWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/95 backdrop-blur">
          <div className="max-w-sm border-2 border-danger/50 bg-bg p-8 text-center shadow-2xl">
            <AlertTriangle className="mx-auto size-12 text-danger" strokeWidth={1.5} />
            <h2 className="mt-4 text-xl font-black text-danger">Tab-Wechsel erkannt!</h2>
            <p className="mt-2 text-sm text-muted-fg">
              Du hast während der Klausur den Browser-Tab verlassen.
              Dieser Vorfall wurde protokolliert ({tabSwitches}× bisher).
            </p>
            <button
              onClick={() => setShowWarning(false)}
              className="mt-6 w-full bg-fg px-4 py-2.5 text-sm font-semibold text-bg hover:bg-fg/90"
            >
              Zurück zur Klausur
            </button>
          </div>
        </div>
      )}
      {tabSwitches > 0 && (
        <div className="mb-4 flex items-center gap-2 border border-warning/30 bg-warning/5 px-4 py-2">
          <AlertTriangle className="size-4 text-warning" strokeWidth={1.75} />
          <p className="text-xs text-warning font-medium">
            {tabSwitches} Tab-Wechsel registriert — wird an deinen Lehrer gemeldet
          </p>
        </div>
      )}
      {children}
    </div>
  );
}
