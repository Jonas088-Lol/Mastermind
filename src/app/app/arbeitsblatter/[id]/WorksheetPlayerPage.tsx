"use client";

import { WorksheetPlayer, type WorksheetData } from "@/components/worksheet/WorksheetPlayer";

interface Props {
  assignmentId: string;
  worksheet: WorksheetData;
  existingAnswers?: Record<string, string>;
  showHints: boolean;
  showSolution: boolean;
  estimatedMinutes: number;
}

export function WorksheetPlayerPage({
  assignmentId,
  worksheet,
  existingAnswers,
}: Props) {
  const handleSubmit = async (
    answers: Record<string, string>,
    timeTakenSec: number
  ): Promise<{ ok: boolean; score?: number; maxScore?: number }> => {
    const res = await fetch("/api/worksheets/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignmentId, answers, timeTakenSec }),
    });
    if (!res.ok) return { ok: false };
    const data = (await res.json()) as { score?: number; maxScore?: number };
    return { ok: true, score: data.score, maxScore: data.maxScore };
  };

  return (
    <div className="border border-border bg-bg">
      <WorksheetPlayer
        worksheet={worksheet}
        existingAnswers={existingAnswers}
        onSubmit={handleSubmit}
        mode="student"
      />
    </div>
  );
}
