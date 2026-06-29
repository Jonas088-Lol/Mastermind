-- CreateTable
CREATE TABLE "MasterTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "subject" TEXT,
    "dueAt" DATETIME,
    "bookName" TEXT,
    "bookPageFrom" INTEGER,
    "bookPageTo" INTEGER,
    "exerciseNr" TEXT,
    "teacherId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MasterTaskFile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MasterTaskFile_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "MasterTask" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MasterTaskProgress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'todo',
    "comment" TEXT,
    "submissionPath" TEXT,
    "submissionName" TEXT,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MasterTaskProgress_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "MasterTask" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "MasterTask_classId_idx" ON "MasterTask"("classId");

-- CreateIndex
CREATE INDEX "MasterTask_teacherId_idx" ON "MasterTask"("teacherId");

-- CreateIndex
CREATE INDEX "MasterTask_schoolId_idx" ON "MasterTask"("schoolId");

-- CreateIndex
CREATE INDEX "MasterTaskFile_taskId_idx" ON "MasterTaskFile"("taskId");

-- CreateIndex
CREATE INDEX "MasterTaskProgress_studentId_idx" ON "MasterTaskProgress"("studentId");

-- CreateIndex
CREATE INDEX "MasterTaskProgress_taskId_idx" ON "MasterTaskProgress"("taskId");

-- CreateIndex
CREATE UNIQUE INDEX "MasterTaskProgress_taskId_studentId_key" ON "MasterTaskProgress"("taskId", "studentId");
