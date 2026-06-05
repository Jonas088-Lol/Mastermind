-- CreateTable
CREATE TABLE "Quest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "lore" TEXT,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "targetCount" INTEGER NOT NULL DEFAULT 1,
    "xpReward" INTEGER NOT NULL DEFAULT 50,
    "titleReward" TEXT,
    "icon" TEXT NOT NULL DEFAULT '⚔️',
    "difficulty" TEXT NOT NULL DEFAULT 'normal',
    "rarity" TEXT NOT NULL DEFAULT 'common',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "UserQuest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "questId" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "completedAt" DATETIME,
    "claimedAt" DATETIME,
    "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME,
    CONSTRAINT "UserQuest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserQuest_questId_fkey" FOREIGN KEY ("questId") REFERENCES "Quest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserTitle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "titleSlug" TEXT NOT NULL,
    "unlockedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserTitle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DailyLoginReward" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "day" INTEGER NOT NULL,
    "xpAwarded" INTEGER NOT NULL,
    "claimedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DailyLoginReward_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Season" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT,
    "name" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "theme" TEXT,
    "startAt" DATETIME NOT NULL,
    "endAt" DATETIME NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Season_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserSeasonPass" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "xpEarned" INTEGER NOT NULL DEFAULT 0,
    "tier" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "UserSeasonPass_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserSeasonPass_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BossBattle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "lore" TEXT,
    "subject" TEXT,
    "gradeLevel" INTEGER,
    "maxHp" INTEGER NOT NULL DEFAULT 10000,
    "currentHp" INTEGER NOT NULL DEFAULT 10000,
    "difficulty" TEXT NOT NULL DEFAULT 'hard',
    "xpReward" INTEGER NOT NULL DEFAULT 500,
    "icon" TEXT NOT NULL DEFAULT '👹',
    "startAt" DATETIME NOT NULL,
    "endAt" DATETIME NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "BossBattle_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BossParticipant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "battleId" TEXT NOT NULL,
    "damage" INTEGER NOT NULL DEFAULT 0,
    "correctAnswers" INTEGER NOT NULL DEFAULT 0,
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BossParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BossParticipant_battleId_fkey" FOREIGN KEY ("battleId") REFERENCES "BossBattle" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SkillNode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subject" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "tier" INTEGER NOT NULL DEFAULT 1,
    "requiredXp" INTEGER NOT NULL DEFAULT 0,
    "icon" TEXT NOT NULL DEFAULT '⭐',
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "parentSlug" TEXT,
    "xpBonus" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "UserSkillNode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "unlockedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserSkillNode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserSkillNode_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "SkillNode" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CoinLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "referenceId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CoinLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ShopItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "coinPrice" INTEGER NOT NULL DEFAULT 0,
    "realPrice" INTEGER,
    "icon" TEXT NOT NULL DEFAULT '🎁',
    "rarity" TEXT NOT NULL DEFAULT 'common',
    "effect" TEXT,
    "effectValue" TEXT,
    "isLimited" BOOLEAN NOT NULL DEFAULT false,
    "stock" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "UserInventoryItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "itemSlug" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "acquiredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME,
    CONSTRAINT "UserInventoryItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserBooster" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "boosterSlug" TEXT NOT NULL,
    "multiplier" REAL NOT NULL,
    "activatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    CONSTRAINT "UserBooster_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StripeOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "productSlug" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'eur',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME
);

-- CreateTable
CREATE TABLE "SchoolEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startAt" DATETIME NOT NULL,
    "endAt" DATETIME,
    "allDay" BOOLEAN NOT NULL DEFAULT true,
    "category" TEXT NOT NULL DEFAULT 'event',
    "classIds" TEXT,
    "color" TEXT,
    "createdBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SchoolEvent_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SubstitutionEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "period" INTEGER NOT NULL,
    "classId" TEXT NOT NULL,
    "absentTeacherId" TEXT,
    "substituteTeacherId" TEXT,
    "subjectName" TEXT,
    "note" TEXT,
    "type" TEXT NOT NULL DEFAULT 'substitution',
    "room" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SubstitutionEntry_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SubstitutionEntry_classId_fkey" FOREIGN KEY ("classId") REFERENCES "SchoolClass" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SubstitutionEntry_absentTeacherId_fkey" FOREIGN KEY ("absentTeacherId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SubstitutionEntry_substituteTeacherId_fkey" FOREIGN KEY ("substituteTeacherId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TeacherMeetingNote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teacherId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "parentName" TEXT,
    "meetingAt" DATETIME NOT NULL,
    "notes" TEXT NOT NULL,
    "followUp" TEXT,
    "isPrivate" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TeacherMeetingNote_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TeacherMeetingNote_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SeatingPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "classId" TEXT NOT NULL,
    "subjectId" TEXT,
    "label" TEXT NOT NULL DEFAULT 'Standard',
    "layout" TEXT NOT NULL,
    "rows" INTEGER NOT NULL DEFAULT 5,
    "cols" INTEGER NOT NULL DEFAULT 6,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SeatingPlan_classId_fkey" FOREIGN KEY ("classId") REFERENCES "SchoolClass" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ConsentForm" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "deadline" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "targetClassIds" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ConsentForm_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ConsentResponse" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "formId" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "agreed" BOOLEAN NOT NULL,
    "signature" TEXT,
    "respondedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ConsentResponse_formId_fkey" FOREIGN KEY ("formId") REFERENCES "ConsentForm" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ConsentResponse_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ConsentResponse_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ParentTeacherSlot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teacherId" TEXT NOT NULL,
    "startsAt" DATETIME NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 10,
    "isBooked" BOOLEAN NOT NULL DEFAULT false,
    "location" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ParentTeacherSlot_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ParentTeacherBooking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slotId" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ParentTeacherBooking_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "ParentTeacherSlot" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ParentTeacherBooking_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notebook" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subject" TEXT,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "icon" TEXT NOT NULL DEFAULT '📓',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Notebook_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NotebookPage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "notebookId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Neue Seite',
    "content" TEXT NOT NULL DEFAULT '[]',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "NotebookPage_notebookId_fkey" FOREIGN KEY ("notebookId") REFERENCES "Notebook" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "klasse" TEXT,
    "classId" TEXT,
    "pomodoroGoal" INTEGER NOT NULL DEFAULT 4,
    "twoFactor" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorSecret" TEXT,
    "notifPrefs" TEXT,
    "prefs" TEXT,
    "verifiedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "schoolId" TEXT,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "streak" INTEGER NOT NULL DEFAULT 0,
    "lastActiveDate" DATETIME,
    "prestige" INTEGER NOT NULL DEFAULT 0,
    "equippedTitle" TEXT,
    "comboStreak" INTEGER NOT NULL DEFAULT 0,
    "totalDailyLogins" INTEGER NOT NULL DEFAULT 0,
    "lastLoginDate" TEXT,
    "avatarUrl" TEXT,
    "coins" INTEGER NOT NULL DEFAULT 0,
    "streakFreezes" INTEGER NOT NULL DEFAULT 0,
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "premiumUntil" DATETIME,
    CONSTRAINT "User_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_classId_fkey" FOREIGN KEY ("classId") REFERENCES "SchoolClass" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("classId", "createdAt", "email", "id", "klasse", "lastActiveDate", "name", "notifPrefs", "passwordHash", "prefs", "role", "schoolId", "streak", "twoFactor", "twoFactorSecret", "updatedAt", "verifiedAt", "xp") SELECT "classId", "createdAt", "email", "id", "klasse", "lastActiveDate", "name", "notifPrefs", "passwordHash", "prefs", "role", "schoolId", "streak", "twoFactor", "twoFactorSecret", "updatedAt", "verifiedAt", "xp" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_role_idx" ON "User"("role");
CREATE INDEX "User_schoolId_idx" ON "User"("schoolId");
CREATE INDEX "User_classId_idx" ON "User"("classId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Quest_slug_key" ON "Quest"("slug");

-- CreateIndex
CREATE INDEX "UserQuest_userId_idx" ON "UserQuest"("userId");

-- CreateIndex
CREATE INDEX "UserQuest_questId_idx" ON "UserQuest"("questId");

-- CreateIndex
CREATE UNIQUE INDEX "UserQuest_userId_questId_key" ON "UserQuest"("userId", "questId");

-- CreateIndex
CREATE INDEX "UserTitle_userId_idx" ON "UserTitle"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserTitle_userId_titleSlug_key" ON "UserTitle"("userId", "titleSlug");

-- CreateIndex
CREATE INDEX "DailyLoginReward_userId_idx" ON "DailyLoginReward"("userId");

-- CreateIndex
CREATE INDEX "Season_schoolId_idx" ON "Season"("schoolId");

-- CreateIndex
CREATE INDEX "Season_isActive_idx" ON "Season"("isActive");

-- CreateIndex
CREATE INDEX "UserSeasonPass_userId_idx" ON "UserSeasonPass"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserSeasonPass_userId_seasonId_key" ON "UserSeasonPass"("userId", "seasonId");

-- CreateIndex
CREATE INDEX "BossBattle_schoolId_idx" ON "BossBattle"("schoolId");

-- CreateIndex
CREATE INDEX "BossBattle_isActive_idx" ON "BossBattle"("isActive");

-- CreateIndex
CREATE INDEX "BossParticipant_userId_idx" ON "BossParticipant"("userId");

-- CreateIndex
CREATE INDEX "BossParticipant_battleId_idx" ON "BossParticipant"("battleId");

-- CreateIndex
CREATE UNIQUE INDEX "BossParticipant_userId_battleId_key" ON "BossParticipant"("userId", "battleId");

-- CreateIndex
CREATE UNIQUE INDEX "SkillNode_subject_slug_key" ON "SkillNode"("subject", "slug");

-- CreateIndex
CREATE INDEX "UserSkillNode_userId_idx" ON "UserSkillNode"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserSkillNode_userId_nodeId_key" ON "UserSkillNode"("userId", "nodeId");

-- CreateIndex
CREATE INDEX "CoinLog_userId_createdAt_idx" ON "CoinLog"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ShopItem_slug_key" ON "ShopItem"("slug");

-- CreateIndex
CREATE INDEX "UserInventoryItem_userId_idx" ON "UserInventoryItem"("userId");

-- CreateIndex
CREATE INDEX "UserInventoryItem_itemSlug_idx" ON "UserInventoryItem"("itemSlug");

-- CreateIndex
CREATE INDEX "UserBooster_userId_idx" ON "UserBooster"("userId");

-- CreateIndex
CREATE INDEX "UserBooster_expiresAt_idx" ON "UserBooster"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "StripeOrder_sessionId_key" ON "StripeOrder"("sessionId");

-- CreateIndex
CREATE INDEX "StripeOrder_userId_idx" ON "StripeOrder"("userId");

-- CreateIndex
CREATE INDEX "StripeOrder_sessionId_idx" ON "StripeOrder"("sessionId");

-- CreateIndex
CREATE INDEX "SchoolEvent_schoolId_startAt_idx" ON "SchoolEvent"("schoolId", "startAt");

-- CreateIndex
CREATE INDEX "SubstitutionEntry_schoolId_date_idx" ON "SubstitutionEntry"("schoolId", "date");

-- CreateIndex
CREATE INDEX "SubstitutionEntry_classId_idx" ON "SubstitutionEntry"("classId");

-- CreateIndex
CREATE INDEX "TeacherMeetingNote_teacherId_idx" ON "TeacherMeetingNote"("teacherId");

-- CreateIndex
CREATE INDEX "TeacherMeetingNote_studentId_idx" ON "TeacherMeetingNote"("studentId");

-- CreateIndex
CREATE INDEX "SeatingPlan_classId_idx" ON "SeatingPlan"("classId");

-- CreateIndex
CREATE INDEX "ConsentForm_schoolId_idx" ON "ConsentForm"("schoolId");

-- CreateIndex
CREATE INDEX "ConsentResponse_formId_idx" ON "ConsentResponse"("formId");

-- CreateIndex
CREATE INDEX "ConsentResponse_parentId_idx" ON "ConsentResponse"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "ConsentResponse_formId_parentId_studentId_key" ON "ConsentResponse"("formId", "parentId", "studentId");

-- CreateIndex
CREATE INDEX "ParentTeacherSlot_teacherId_startsAt_idx" ON "ParentTeacherSlot"("teacherId", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "ParentTeacherBooking_slotId_key" ON "ParentTeacherBooking"("slotId");

-- CreateIndex
CREATE INDEX "ParentTeacherBooking_parentId_idx" ON "ParentTeacherBooking"("parentId");

-- CreateIndex
CREATE INDEX "Notebook_userId_idx" ON "Notebook"("userId");

-- CreateIndex
CREATE INDEX "NotebookPage_notebookId_idx" ON "NotebookPage"("notebookId");
