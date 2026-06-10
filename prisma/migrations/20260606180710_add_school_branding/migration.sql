/*
  Warnings:

  - You are about to alter the column `createdAt` on the `AuditLog` table. The data in that column could be lost. The data in that column will be cast from `Unsupported("timestamp(3)")` to `DateTime`.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT,
    "actorId" TEXT,
    "targetId" TEXT,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "ip" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_AuditLog" ("action", "actorId", "createdAt", "details", "id", "ip", "schoolId", "targetId") SELECT "action", "actorId", "createdAt", "details", "id", "ip", "schoolId", "targetId" FROM "AuditLog";
DROP TABLE "AuditLog";
ALTER TABLE "new_AuditLog" RENAME TO "AuditLog";
CREATE INDEX "AuditLog_schoolId_createdAt_idx" ON "AuditLog"("schoolId", "createdAt");
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");
CREATE TABLE "new_School" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT,
    "state" TEXT,
    "plan" TEXT NOT NULL DEFAULT 'basic',
    "seats" INTEGER NOT NULL DEFAULT 100,
    "logoUrl" TEXT,
    "logoDarkUrl" TEXT,
    "faviconUrl" TEXT,
    "accentColor" TEXT,
    "brandName" TEXT,
    "featureSettings" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_School" ("accentColor", "city", "createdAt", "faviconUrl", "id", "logoUrl", "name", "plan", "seats", "slug", "state", "updatedAt") SELECT "accentColor", "city", "createdAt", "faviconUrl", "id", "logoUrl", "name", "plan", "seats", "slug", "state", "updatedAt" FROM "School";
DROP TABLE "School";
ALTER TABLE "new_School" RENAME TO "School";
CREATE UNIQUE INDEX "School_slug_key" ON "School"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "ParentTeacherSlot_isBooked_startsAt_idx" ON "ParentTeacherSlot"("isBooked", "startsAt");
