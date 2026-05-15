-- CreateTable
CREATE TABLE "Worksheet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "subjectId" TEXT,
    "gradeLevel" INTEGER,
    "difficulty" TEXT NOT NULL DEFAULT 'mittel',
    "estimatedMinutes" INTEGER NOT NULL DEFAULT 15,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "isTemplate" BOOLEAN NOT NULL DEFAULT false,
    "language" TEXT NOT NULL DEFAULT 'de',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Worksheet_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Worksheet_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Worksheet_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorksheetItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "worksheetId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "config" TEXT NOT NULL,
    "correctAnswer" TEXT,
    "hint" TEXT,
    "points" INTEGER NOT NULL DEFAULT 1,
    "required" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "WorksheetItem_worksheetId_fkey" FOREIGN KEY ("worksheetId") REFERENCES "Worksheet" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorksheetAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "worksheetId" TEXT NOT NULL,
    "classId" TEXT,
    "teacherId" TEXT NOT NULL,
    "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" DATETIME,
    "maxAttempts" INTEGER NOT NULL DEFAULT 1,
    "showHints" BOOLEAN NOT NULL DEFAULT true,
    "showSolution" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "WorksheetAssignment_worksheetId_fkey" FOREIGN KEY ("worksheetId") REFERENCES "Worksheet" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorksheetAssignment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "SchoolClass" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "WorksheetAssignment_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorksheetSubmission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assignmentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" DATETIME,
    "score" INTEGER,
    "maxScore" INTEGER,
    "timeTakenSec" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    CONSTRAINT "WorksheetSubmission_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "WorksheetAssignment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorksheetSubmission_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorksheetItemAnswer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "submissionId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "isCorrect" BOOLEAN,
    "pointsEarned" INTEGER,
    "answeredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorksheetItemAnswer_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "WorksheetSubmission" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorksheetItemAnswer_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "WorksheetItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Worksheet_schoolId_idx" ON "Worksheet"("schoolId");

-- CreateIndex
CREATE INDEX "Worksheet_creatorId_idx" ON "Worksheet"("creatorId");

-- CreateIndex
CREATE INDEX "WorksheetItem_worksheetId_idx" ON "WorksheetItem"("worksheetId");

-- CreateIndex
CREATE INDEX "WorksheetAssignment_worksheetId_idx" ON "WorksheetAssignment"("worksheetId");

-- CreateIndex
CREATE INDEX "WorksheetAssignment_classId_idx" ON "WorksheetAssignment"("classId");

-- CreateIndex
CREATE INDEX "WorksheetSubmission_assignmentId_idx" ON "WorksheetSubmission"("assignmentId");

-- CreateIndex
CREATE INDEX "WorksheetSubmission_studentId_idx" ON "WorksheetSubmission"("studentId");

-- CreateIndex
CREATE INDEX "WorksheetItemAnswer_submissionId_idx" ON "WorksheetItemAnswer"("submissionId");

-- CreateIndex
CREATE UNIQUE INDEX "WorksheetItemAnswer_submissionId_itemId_key" ON "WorksheetItemAnswer"("submissionId", "itemId");
