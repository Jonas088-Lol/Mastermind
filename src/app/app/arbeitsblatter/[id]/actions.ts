/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";

import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";

/**
 * Liefert die Musterlösungen eines Arbeitsblatts – aber ausschließlich, nachdem
 * der Schüler abgegeben hat und nur wenn die Zuweisung Lösungen freigibt
 * (showSolution). So landen die Lösungen NIE im Client-Payload, während der
 * Schüler das Blatt noch bearbeitet (sonst via DevTools auslesbar).
 *
 * Rückgabe: Map itemId → correctAnswer (JSON-String) für die Review-Ansicht.
 */
export async function getWorksheetSolutions(
  assignmentId: string
): Promise<Record<string, string>> {
  const session = await getSession();
  if (!session) return {};
  if (effectiveRole(session) !== "student") return {};

  const assignment = await prisma.worksheetAssignment.findUnique({
    where: { id: assignmentId },
    include: {
      worksheet: {
        include: { items: { select: { id: true, correctAnswer: true } } },
      },
    },
  });

  if (!assignment) return {};

  // Lösungen nur freigeben, wenn der Lehrer sie freigeschaltet hat.
  if (!assignment.showSolution) return {};

  // Gleiche Schul-/Klassen-Prüfung wie beim Rendern des Blatts.
  if (assignment.worksheet.schoolId !== session.schoolId) return {};
  if (assignment.classId && assignment.classId !== session.classId) return {};

  // Erst nach echter Abgabe herausgeben.
  const submittedCount = await prisma.worksheetSubmission.count({
    where: {
      assignmentId,
      studentId: session.userId,
      status: "submitted",
    },
  });
  if (submittedCount === 0) return {};

  const solutions: Record<string, string> = {};
  for (const item of assignment.worksheet.items) {
    if (item.correctAnswer !== null) {
      solutions[item.id] = item.correctAnswer;
    }
  }
  return solutions;
}
