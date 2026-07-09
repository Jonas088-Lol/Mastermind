-- Teacher-created exercises for classes + completions; Grade.topic for competence heatmap
CREATE TABLE "TeacherExercise" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teacherId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TeacherExercise_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TeacherExercise_classId_fkey" FOREIGN KEY ("classId") REFERENCES "SchoolClass" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "TeacherExercise_classId_createdAt_idx" ON "TeacherExercise"("classId", "createdAt");
CREATE INDEX "TeacherExercise_teacherId_idx" ON "TeacherExercise"("teacherId");

CREATE TABLE "TeacherExerciseCompletion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "exerciseId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "completedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TeacherExerciseCompletion_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "TeacherExercise" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TeacherExerciseCompletion_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "TeacherExerciseCompletion_exerciseId_studentId_key" ON "TeacherExerciseCompletion"("exerciseId", "studentId");
CREATE INDEX "TeacherExerciseCompletion_studentId_idx" ON "TeacherExerciseCompletion"("studentId");

ALTER TABLE "Grade" ADD COLUMN "topic" TEXT;
