-- Add missing indexes
CREATE INDEX IF NOT EXISTS "Assignment_classId_dueAt_idx" ON "Assignment"("classId", "dueAt");
CREATE INDEX IF NOT EXISTS "Submission_status_submittedAt_idx" ON "Submission"("status", "submittedAt");
CREATE INDEX IF NOT EXISTS "Submission_assignmentId_studentId_status_idx" ON "Submission"("assignmentId", "studentId", "status");
CREATE INDEX IF NOT EXISTS "TeacherSubjectClass_subjectId_idx" ON "TeacherSubjectClass"("subjectId");
CREATE INDEX IF NOT EXISTS "Message_threadId_senderId_sentAt_idx" ON "Message"("threadId", "senderId", "sentAt");
CREATE INDEX IF NOT EXISTS "MessageParticipant_userId_lastReadAt_idx" ON "MessageParticipant"("userId", "lastReadAt");

-- AuditLog table
CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT,
    "actorId" TEXT,
    "targetId" TEXT,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AuditLog_schoolId_createdAt_idx" ON "AuditLog"("schoolId", "createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");
