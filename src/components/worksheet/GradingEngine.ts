/* Copyright 2026 Elian Schock, Jonas Schwenk */
export function gradeAnswer(
  type: string,
  correctAnswer: string | null,
  studentAnswer: string
): { isCorrect: boolean | null; pointsEarned: number; maxPoints: number } {
  if (type === "drawing") {
    return { isCorrect: null, pointsEarned: 0, maxPoints: 1 };
  }

  if (correctAnswer === null && type === "text_input") {
    return { isCorrect: true, pointsEarned: 1, maxPoints: 1 };
  }

  let correct: unknown;
  let student: unknown;
  try {
    correct = correctAnswer !== null ? JSON.parse(correctAnswer) : null;
    student = JSON.parse(studentAnswer);
  } catch {
    return { isCorrect: false, pointsEarned: 0, maxPoints: 1 };
  }

  // Unbeantwortete Items kommen als "null" an (JSON.parse → null). Ohne diesen
  // Guard crasht z. B. (student as string).trim() oder sZones[k] mit TypeError —
  // sowohl im Player (Lösung anzeigen) als auch in der Submit-API (500).
  if (student === null || student === undefined) {
    return { isCorrect: false, pointsEarned: 0, maxPoints: 1 };
  }

  switch (type) {
    case "text_input": {
      const accepted = correct as string[];
      const ans = (student as string).trim().toLowerCase();
      const isCorrect = accepted.some((a) => a.trim().toLowerCase() === ans);
      return { isCorrect, pointsEarned: isCorrect ? 1 : 0, maxPoints: 1 };
    }

    case "fill_blank": {
      const correctBlanks = correct as string[];
      const studentBlanks = student as string[];
      const total = correctBlanks.length;
      let hits = 0;
      for (let i = 0; i < total; i++) {
        if (
          (studentBlanks[i] ?? "").trim().toLowerCase() ===
          correctBlanks[i].trim().toLowerCase()
        ) {
          hits++;
        }
      }
      const isCorrect = hits === total;
      return { isCorrect, pointsEarned: isCorrect ? 1 : 0, maxPoints: 1 };
    }

    case "multiple_choice": {
      const cStr = JSON.stringify(correct);
      const sStr = JSON.stringify(student);
      const isCorrect = cStr === sStr;
      return { isCorrect, pointsEarned: isCorrect ? 1 : 0, maxPoints: 1 };
    }

    case "true_false": {
      const isCorrect = String(correct) === String(student);
      return { isCorrect, pointsEarned: isCorrect ? 1 : 0, maxPoints: 1 };
    }

    case "drag_drop": {
      const cZones = correct as Record<string, string[]>;
      const sZones = student as Record<string, string[]>;
      const keys = Object.keys(cZones);
      const isCorrect = keys.every((k) => {
        const cArr = [...(cZones[k] ?? [])].sort();
        const sArr = [...(sZones[k] ?? [])].sort();
        return JSON.stringify(cArr) === JSON.stringify(sArr);
      });
      return { isCorrect, pointsEarned: isCorrect ? 1 : 0, maxPoints: 1 };
    }

    case "matching": {
      const cMap = correct as Record<string, string>;
      const sMap = student as Record<string, string>;
      const keys = Object.keys(cMap);
      const isCorrect = keys.every((k) => cMap[k] === sMap[k]);
      return { isCorrect, pointsEarned: isCorrect ? 1 : 0, maxPoints: 1 };
    }

    case "sorting": {
      const isCorrect =
        JSON.stringify(correct as string[]) ===
        JSON.stringify(student as string[]);
      return { isCorrect, pointsEarned: isCorrect ? 1 : 0, maxPoints: 1 };
    }

    case "number_wall": {
      const cCells = correct as Record<string, number>;
      const sCells = student as Record<string, number>;
      const keys = Object.keys(cCells);
      const total = keys.length;
      const hits = keys.filter((k) => cCells[k] === sCells[k]).length;
      const isCorrect = hits === total;
      return { isCorrect, pointsEarned: hits, maxPoints: total };
    }

    case "number_line": {
      const cNums = [...(correct as number[])].sort((a, b) => a - b);
      const sNums = [...(student as number[])].sort((a, b) => a - b);
      const isCorrect = JSON.stringify(cNums) === JSON.stringify(sNums);
      return { isCorrect, pointsEarned: isCorrect ? 1 : 0, maxPoints: 1 };
    }

    case "calculation_wheel": {
      const cSpokes = correct as Record<string, number>;
      const sSpokes = student as Record<string, number>;
      const keys = Object.keys(cSpokes);
      const total = keys.length;
      const hits = keys.filter((k) => cSpokes[k] === sSpokes[k]).length;
      const isCorrect = hits === total;
      return { isCorrect, pointsEarned: hits, maxPoints: total };
    }

    case "hundred_chart": {
      const cSet = new Set(correct as number[]);
      const sSet = new Set(student as number[]);
      const isCorrect =
        cSet.size === sSet.size && [...cSet].every((v) => sSet.has(v));
      return { isCorrect, pointsEarned: isCorrect ? 1 : 0, maxPoints: 1 };
    }

    default:
      return { isCorrect: false, pointsEarned: 0, maxPoints: 1 };
  }
}

export function gradeSubmission(
  items: Array<{
    id: string;
    type: string;
    correctAnswer: string | null;
    points: number;
  }>,
  answers: Map<string, string>
): {
  itemResults: Map<string, { isCorrect: boolean | null; pointsEarned: number }>;
  totalScore: number;
  maxScore: number;
} {
  const itemResults = new Map<
    string,
    { isCorrect: boolean | null; pointsEarned: number }
  >();
  let totalScore = 0;
  let maxScore = 0;

  for (const item of items) {
    const studentAnswer = answers.get(item.id) ?? "null";
    const result = gradeAnswer(item.type, item.correctAnswer, studentAnswer);
    const ratio =
      result.maxPoints > 0 ? result.pointsEarned / result.maxPoints : 0;
    const pointsEarned = ratio * item.points;
    itemResults.set(item.id, {
      isCorrect: result.isCorrect,
      pointsEarned,
    });
    totalScore += pointsEarned;
    maxScore += item.points;
  }

  return { itemResults, totalScore, maxScore };
}
