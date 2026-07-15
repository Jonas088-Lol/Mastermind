/* Copyright 2026 Elian Schock, Jonas Schwenk */
/**
 * tree-quest-engine.ts — DEAKTIVIERT.
 *
 * Das Skill-Tree-/Curriculum-Feature wurde entfernt. Diese Datei behält nur noch
 * die exportierten Signaturen bei, damit bestehende Aufrufer weiter kompilieren —
 * alle Funktionen sind No-Ops und schreiben nichts mehr in die Datenbank.
 * `PACING` bleibt als reine Konfigurationskonstante erhalten (z. B. für Sim-Tools).
 */

// ── Pacing config (nur noch Konstante, keine Wirkung) ─────────────────────────
export const PACING = {
  dailyProgressCap:  3,
  minLearningDayXp: 10,
  spacedRepIntervals: [1, 3, 7, 14] as const,
} as const;

// ── Quest-Zuweisung (No-Op) ───────────────────────────────────────────────────
export async function assignFrontierQuests(_userId: string): Promise<void> {
  // Feature entfernt — keine Aktion.
}

// ── Fortschritt (No-Op) ───────────────────────────────────────────────────────
export interface QuestAdvanceResult {
  questCompleted: boolean;
  nodeUnlocked:   boolean;
  newlyAvailable: string[];
  xpEarned:       number;
  cappedByDay:    boolean;
}

const NOOP_RESULT: QuestAdvanceResult = {
  questCompleted: false,
  nodeUnlocked:   false,
  newlyAvailable: [],
  xpEarned:       0,
  cappedByDay:    false,
};

export async function advanceTreeQuestProgress(
  _userId: string,
  _type?: unknown,
  _count?: number,
): Promise<QuestAdvanceResult> {
  return NOOP_RESULT;
}

// ── Feature-Event-Hooks (alle No-Ops) ─────────────────────────────────────────
export async function onExerciseComplete(_userId: string, _count: number = 1): Promise<QuestAdvanceResult> {
  return NOOP_RESULT;
}
export async function onPptxCreated(_userId: string): Promise<QuestAdvanceResult> {
  return NOOP_RESULT;
}
export async function onBossFightWin(_userId: string): Promise<QuestAdvanceResult> {
  return NOOP_RESULT;
}
export async function onFlashcardsReviewed(_userId: string, _count: number = 1): Promise<QuestAdvanceResult> {
  return NOOP_RESULT;
}
export async function onQuizComplete(_userId: string, _count: number = 1): Promise<QuestAdvanceResult> {
  return NOOP_RESULT;
}
export async function onWorksheetComplete(_userId: string): Promise<QuestAdvanceResult> {
  return NOOP_RESULT;
}
export async function onDuelWon(_userId: string): Promise<QuestAdvanceResult> {
  return NOOP_RESULT;
}
export async function onStreakDay(_userId: string): Promise<QuestAdvanceResult> {
  return NOOP_RESULT;
}
