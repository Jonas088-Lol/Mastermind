-- CreateTable
CREATE TABLE "ExerciseTopic" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subject" TEXT NOT NULL,
    "grade" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "ExerciseLesson" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "topicId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "videoUrl" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ExerciseLesson_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "ExerciseTopic" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExerciseQuestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "topicId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "options" TEXT,
    "correct" TEXT NOT NULL,
    "explanation" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ExerciseQuestion_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "ExerciseTopic" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExerciseAnswer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExerciseAnswer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ExerciseAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "ExerciseQuestion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExerciseProgress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "completedAt" DATETIME,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExerciseProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ExerciseProgress_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "ExerciseTopic" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SchoolTeam" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "season" TEXT,
    "coach" TEXT,
    "results" TEXT,
    CONSTRAINT "SchoolTeam_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ExerciseTopic_subject_grade_idx" ON "ExerciseTopic"("subject", "grade");

-- CreateIndex
CREATE INDEX "ExerciseLesson_topicId_idx" ON "ExerciseLesson"("topicId");

-- CreateIndex
CREATE INDEX "ExerciseQuestion_topicId_idx" ON "ExerciseQuestion"("topicId");

-- CreateIndex
CREATE INDEX "ExerciseAnswer_userId_idx" ON "ExerciseAnswer"("userId");

-- CreateIndex
CREATE INDEX "ExerciseAnswer_questionId_idx" ON "ExerciseAnswer"("questionId");

-- CreateIndex
CREATE INDEX "ExerciseProgress_userId_idx" ON "ExerciseProgress"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ExerciseProgress_userId_topicId_key" ON "ExerciseProgress"("userId", "topicId");

-- CreateIndex
CREATE INDEX "SchoolTeam_schoolId_idx" ON "SchoolTeam"("schoolId");
