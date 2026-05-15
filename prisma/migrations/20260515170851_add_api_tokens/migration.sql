-- AlterTable
ALTER TABLE "School" ADD COLUMN "accentColor" TEXT;
ALTER TABLE "School" ADD COLUMN "faviconUrl" TEXT;
ALTER TABLE "School" ADD COLUMN "logoUrl" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "notifPrefs" TEXT;
ALTER TABLE "User" ADD COLUMN "prefs" TEXT;

-- CreateTable
CREATE TABLE "SsoConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientSecret" TEXT NOT NULL,
    "tenantId" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SsoConfig_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FeatureFlag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'off',
    "rollout" INTEGER NOT NULL DEFAULT 0,
    "scope" TEXT NOT NULL DEFAULT 'alle',
    "owner" TEXT NOT NULL DEFAULT 'Plattform',
    "metric" TEXT,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ApiToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "scopes" TEXT NOT NULL DEFAULT 'read',
    "lastUsedAt" DATETIME,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ApiToken_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "SsoConfig_schoolId_idx" ON "SsoConfig"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "SsoConfig_schoolId_provider_key" ON "SsoConfig"("schoolId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureFlag_name_key" ON "FeatureFlag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ApiToken_tokenHash_key" ON "ApiToken"("tokenHash");

-- CreateIndex
CREATE INDEX "ApiToken_schoolId_idx" ON "ApiToken"("schoolId");
