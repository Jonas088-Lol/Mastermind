-- AlterTable
ALTER TABLE "School" ADD COLUMN "mailboxAddress" TEXT;
ALTER TABLE "School" ADD COLUMN "mailboxName" TEXT;

-- CreateTable
CREATE TABLE "MailboxEmail" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "fromAddress" TEXT NOT NULL,
    "fromName" TEXT,
    "toAddress" TEXT NOT NULL,
    "toName" TEXT,
    "subject" TEXT NOT NULL,
    "bodyText" TEXT NOT NULL,
    "bodyHtml" TEXT,
    "messageId" TEXT,
    "inReplyTo" TEXT,
    "threadKey" TEXT,
    "readAt" DATETIME,
    "sentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    CONSTRAINT "MailboxEmail_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MailboxEmail_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "MailboxEmail_schoolId_direction_sentAt_idx" ON "MailboxEmail"("schoolId", "direction", "sentAt");

-- CreateIndex
CREATE INDEX "MailboxEmail_threadKey_idx" ON "MailboxEmail"("threadKey");

-- CreateIndex
CREATE INDEX "MailboxEmail_userId_idx" ON "MailboxEmail"("userId");
