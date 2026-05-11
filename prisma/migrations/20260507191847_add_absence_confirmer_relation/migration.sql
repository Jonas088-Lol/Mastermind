-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Absence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "fromDate" DATETIME NOT NULL,
    "toDate" DATETIME NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "confirmedById" TEXT,
    "confirmedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Absence_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Absence_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Absence_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Absence_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Absence" ("confirmedAt", "confirmedById", "createdAt", "fromDate", "id", "reason", "reporterId", "schoolId", "status", "studentId", "toDate") SELECT "confirmedAt", "confirmedById", "createdAt", "fromDate", "id", "reason", "reporterId", "schoolId", "status", "studentId", "toDate" FROM "Absence";
DROP TABLE "Absence";
ALTER TABLE "new_Absence" RENAME TO "Absence";
CREATE INDEX "Absence_studentId_idx" ON "Absence"("studentId");
CREATE INDEX "Absence_schoolId_idx" ON "Absence"("schoolId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
