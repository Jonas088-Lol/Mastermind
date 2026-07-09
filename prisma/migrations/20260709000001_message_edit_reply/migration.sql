-- Message: add editedAt + replyToId (Discord-like reply links)
ALTER TABLE "Message" ADD COLUMN "editedAt" DATETIME;
ALTER TABLE "Message" ADD COLUMN "replyToId" TEXT REFERENCES "Message"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

CREATE INDEX "Message_replyToId_idx" ON "Message"("replyToId");
