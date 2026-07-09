-- Alter/Elternzustimmung (Art. 8 DSGVO)
ALTER TABLE "User" ADD COLUMN "birthDate" DATETIME;

CREATE TABLE "AgeVerification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "declaredAgeBand" TEXT NOT NULL,
    "isMinor" BOOLEAN NOT NULL DEFAULT true,
    "parentConsent" BOOLEAN NOT NULL DEFAULT false,
    "parentEmail" TEXT,
    "parentConsentAt" DATETIME,
    "consentMethod" TEXT,
    "consentVersion" TEXT NOT NULL DEFAULT '1.0',
    "ipAddress" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AgeVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "AgeVerification_userId_key" ON "AgeVerification"("userId");
CREATE INDEX "AgeVerification_isMinor_parentConsent_idx" ON "AgeVerification"("isMinor", "parentConsent");
