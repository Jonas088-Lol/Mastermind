-- AlterTable
ALTER TABLE "Assignment" ADD COLUMN "coverEmoji" TEXT;

-- AlterTable
ALTER TABLE "School" ADD COLUMN "bundeslandCode" TEXT;

-- CreateTable
CREATE TABLE "BossQuestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "battleId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "optionA" TEXT NOT NULL,
    "optionB" TEXT NOT NULL,
    "optionC" TEXT NOT NULL,
    "optionD" TEXT NOT NULL,
    "correct" INTEGER NOT NULL,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BossQuestion_battleId_fkey" FOREIGN KEY ("battleId") REFERENCES "BossBattle" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BossQuestionSeen" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answeredCorrect" BOOLEAN NOT NULL,
    "seenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BossQuestionSeen_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "BossQuestion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MollieOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "mollieId" TEXT NOT NULL,
    "productSlug" TEXT NOT NULL,
    "coinsAwarded" INTEGER NOT NULL,
    "amountEur" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "method" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" DATETIME
);

-- CreateTable
CREATE TABLE "SpaceMessageReaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SpaceMessageReaction_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "SpaceMessage" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SpaceMessageReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserConsent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "activityTracking" BOOLEAN NOT NULL DEFAULT false,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "consentedAt" DATETIME,
    "revokedAt" DATETIME,
    "ipAddress" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserConsent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ActivitySession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "sessionDate" TEXT NOT NULL,
    "currentPage" TEXT NOT NULL DEFAULT '',
    "currentActivity" TEXT NOT NULL DEFAULT '',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "tabFocused" BOOLEAN NOT NULL DEFAULT true,
    "tabSwitches" INTEGER NOT NULL DEFAULT 0,
    "activeSeconds" INTEGER NOT NULL DEFAULT 0,
    "lastHeartbeat" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ActivitySession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VoiceParticipant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "channelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isMuted" BOOLEAN NOT NULL DEFAULT false,
    "isDeaf" BOOLEAN NOT NULL DEFAULT false,
    "isSharingScreen" BOOLEAN NOT NULL DEFAULT false,
    "isCameraOn" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VoiceParticipant_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "SpaceChannel" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VoiceParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Friendship" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requesterId" TEXT NOT NULL,
    "addresseeId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Friendship_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Friendship_addresseeId_fkey" FOREIGN KEY ("addresseeId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PersonalEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startAt" DATETIME NOT NULL,
    "endAt" DATETIME,
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "category" TEXT NOT NULL DEFAULT 'personal',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PersonalEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Unbenanntes Dokument',
    "content" TEXT NOT NULL DEFAULT '[]',
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Document_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Spreadsheet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Unbenannte Tabelle',
    "data" TEXT NOT NULL DEFAULT '{"cols":10,"rows":30,"cells":{},"colWidths":{}}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Spreadsheet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Presentation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Unbenannte Präsentation',
    "slides" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Presentation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Homework" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teacherId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueAt" DATETIME NOT NULL,
    "requiresUpload" BOOLEAN NOT NULL DEFAULT false,
    "notifiedAt48h" BOOLEAN NOT NULL DEFAULT false,
    "notifiedAt24h" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Homework_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Homework_classId_fkey" FOREIGN KEY ("classId") REFERENCES "SchoolClass" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Homework_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HomeworkCompletion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "homeworkId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "fileUrl" TEXT,
    "fileName" TEXT,
    "doneAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "HomeworkCompletion_homeworkId_fkey" FOREIGN KEY ("homeworkId") REFERENCES "Homework" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "HomeworkCompletion_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GlobalSetting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL DEFAULT '',
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT
);

-- CreateTable
CREATE TABLE "SeasonRankingEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "seasonId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "score" BIGINT NOT NULL DEFAULT 0,
    "schoolId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SeasonRankingEntry_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SeasonRankingEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserSkillMastery" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "nodeSlug" TEXT NOT NULL,
    "masteryTier" INTEGER NOT NULL DEFAULT 0,
    "exercisesDone" INTEGER NOT NULL DEFAULT 0,
    "unlockedAt" DATETIME,
    "masteredAt" DATETIME,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserSkillMastery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Bundesland" (
    "code" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Landkreis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "bundeslandCode" TEXT NOT NULL,
    CONSTRAINT "Landkreis_bundeslandCode_fkey" FOREIGN KEY ("bundeslandCode") REFERENCES "Bundesland" ("code") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CurriculumSubject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "Curriculum" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bundeslandCode" TEXT NOT NULL,
    "schulart" TEXT NOT NULL,
    "jahrgangsstufe" INTEGER NOT NULL,
    "subjectId" TEXT NOT NULL,
    "wochenstunden" INTEGER,
    "isWahlpflicht" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Curriculum_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "CurriculumSubject" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TreeNode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "subjectId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "tier" INTEGER NOT NULL DEFAULT 1,
    "isHub" BOOLEAN NOT NULL DEFAULT false,
    "layoutAngle" REAL,
    "layoutRadius" REAL,
    "masteryTiers" INTEGER NOT NULL DEFAULT 3,
    "requiredQuestCount" INTEGER NOT NULL DEFAULT 2,
    "requiredLevel" INTEGER,
    CONSTRAINT "TreeNode_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "CurriculumSubject" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TreeNodePrereq" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nodeId" TEXT NOT NULL,
    "requiresNodeId" TEXT NOT NULL,
    CONSTRAINT "TreeNodePrereq_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "TreeNode" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TreeNodePrereq_requiresNodeId_fkey" FOREIGN KEY ("requiresNodeId") REFERENCES "TreeNode" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserTreeProgress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'HIDDEN',
    "masteryTier" INTEGER NOT NULL DEFAULT 0,
    "questsDone" INTEGER NOT NULL DEFAULT 0,
    "unlockedAt" DATETIME,
    "masteredAt" DATETIME,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserTreeProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserTreeProgress_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "TreeNode" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TreeQuest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "target" INTEGER NOT NULL DEFAULT 10,
    "rewardXp" INTEGER NOT NULL DEFAULT 50,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "TreeQuest_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "TreeNode" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserTreeQuest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "questId" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "completedAt" DATETIME,
    "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME,
    CONSTRAINT "UserTreeQuest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserTreeQuest_questId_fkey" FOREIGN KEY ("questId") REFERENCES "TreeQuest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DailyActivity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "questsDone" INTEGER NOT NULL DEFAULT 0,
    "xpEarned" INTEGER NOT NULL DEFAULT 0,
    "treeProgressPts" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "DailyActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BossDef" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "rarity" TEXT NOT NULL,
    "minGrade" INTEGER NOT NULL DEFAULT 5,
    "maxGrade" INTEGER NOT NULL DEFAULT 12,
    "baseHp" INTEGER NOT NULL,
    "baseXp" INTEGER NOT NULL,
    "baseCoins" INTEGER NOT NULL,
    "loreShort" TEXT NOT NULL DEFAULT '',
    "custom" BOOLEAN NOT NULL DEFAULT false,
    "mvpTarget" INTEGER NOT NULL DEFAULT 10
);

-- CreateTable
CREATE TABLE "UserBossProgress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "bossId" TEXT NOT NULL,
    "kills" INTEGER NOT NULL DEFAULT 0,
    "mvpKills" INTEGER NOT NULL DEFAULT 0,
    "titleUnlocked" BOOLEAN NOT NULL DEFAULT false,
    "lastKillAt" DATETIME,
    CONSTRAINT "UserBossProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserBossProgress_bossId_fkey" FOREIGN KEY ("bossId") REFERENCES "BossDef" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TierProgress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "rarity" TEXT NOT NULL,
    "mvpKills" INTEGER NOT NULL DEFAULT 0,
    "unlocked" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "TierProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ItemDef" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "kind" TEXT NOT NULL,
    "rarity" TEXT NOT NULL,
    "priceCoins" INTEGER,
    "pricePremium" INTEGER,
    "componentKey" TEXT NOT NULL,
    "meta" TEXT NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ShopListing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemId" TEXT NOT NULL,
    "activeFrom" DATETIME,
    "activeTo" DATETIME,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "ShopListing_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ItemDef" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "equipped" BOOLEAN NOT NULL DEFAULT false,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "acquiredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ItemDef" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AchievementDef" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "xpReward" INTEGER NOT NULL DEFAULT 0,
    "rarity" TEXT NOT NULL DEFAULT 'COMMON',
    "secret" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "UserEarnedAchievement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "unlockedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserEarnedAchievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserEarnedAchievement_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "AchievementDef" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProvisioningCode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "schoolId" TEXT,
    "classId" TEXT,
    "maxUses" INTEGER NOT NULL DEFAULT 1,
    "uses" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" DATETIME,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProvisioningCode_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ProvisioningCode_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserSubjectMinutes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "subjectKey" TEXT NOT NULL,
    "totalMinutes" REAL NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserSubjectMinutes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserSkillPurchase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "nodeKey" TEXT NOT NULL,
    "purchasedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserSkillPurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Resource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'sonstiges',
    "icon" TEXT,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Resource_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ResourceBooking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "resourceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startsAt" DATETIME NOT NULL,
    "endsAt" DATETIME NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ResourceBooking_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ResourceBooking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GradeScale" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Standard-Notenschlüssel',
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GradeScale_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GradeScaleEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gradeScaleId" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "minPercent" REAL NOT NULL,
    CONSTRAINT "GradeScaleEntry_gradeScaleId_fkey" FOREIGN KEY ("gradeScaleId") REFERENCES "GradeScale" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Frage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schulart" TEXT NOT NULL,
    "bundesland" TEXT NOT NULL,
    "jahrgangsstufe" INTEGER NOT NULL,
    "fach" TEXT NOT NULL,
    "thema" TEXT NOT NULL,
    "unterthema" TEXT,
    "schwierigkeit" INTEGER NOT NULL,
    "schwierigkeitScore" REAL NOT NULL,
    "typ" TEXT NOT NULL DEFAULT 'single_choice',
    "frage" TEXT NOT NULL,
    "antworten" TEXT NOT NULL,
    "loesung" TEXT NOT NULL,
    "erklaerung" TEXT NOT NULL,
    "modell" TEXT NOT NULL DEFAULT 'ki-generiert',
    "quelle" TEXT NOT NULL DEFAULT 'ki-generiert',
    "generiertAm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "DriveFile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "path" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "schoolId" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "CanvaEmbed" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "embedUrl" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "schoolId" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "SchoolWikiEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "subject" TEXT,
    "tags" TEXT NOT NULL DEFAULT '',
    "authorId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_BossBattle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "lore" TEXT,
    "subject" TEXT,
    "gradeLevel" INTEGER,
    "tier" TEXT NOT NULL DEFAULT 'common',
    "maxHp" INTEGER NOT NULL DEFAULT 20,
    "currentHp" INTEGER NOT NULL DEFAULT 20,
    "difficulty" TEXT NOT NULL DEFAULT 'hard',
    "coinReward" INTEGER NOT NULL DEFAULT 8,
    "mvpCoinReward" INTEGER NOT NULL DEFAULT 25,
    "xpReward" INTEGER NOT NULL DEFAULT 100,
    "icon" TEXT NOT NULL DEFAULT '👹',
    "startAt" DATETIME NOT NULL,
    "endAt" DATETIME NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "firstBloodUserId" TEXT,
    "killedByUserId" TEXT,
    "createdByUserId" TEXT,
    "useCustomQuestions" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "BossBattle_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_BossBattle" ("currentHp", "description", "difficulty", "endAt", "gradeLevel", "icon", "id", "isActive", "lore", "maxHp", "name", "schoolId", "startAt", "subject", "xpReward") SELECT "currentHp", "description", "difficulty", "endAt", "gradeLevel", "icon", "id", "isActive", "lore", "maxHp", "name", "schoolId", "startAt", "subject", "xpReward" FROM "BossBattle";
DROP TABLE "BossBattle";
ALTER TABLE "new_BossBattle" RENAME TO "BossBattle";
CREATE INDEX "BossBattle_schoolId_idx" ON "BossBattle"("schoolId");
CREATE INDEX "BossBattle_isActive_idx" ON "BossBattle"("isActive");
CREATE TABLE "new_BossParticipant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "battleId" TEXT NOT NULL,
    "damage" INTEGER NOT NULL DEFAULT 0,
    "correctAnswers" INTEGER NOT NULL DEFAULT 0,
    "wrongAnswers" INTEGER NOT NULL DEFAULT 0,
    "coinsEarned" INTEGER NOT NULL DEFAULT 0,
    "isMvp" BOOLEAN NOT NULL DEFAULT false,
    "firstBlood" BOOLEAN NOT NULL DEFAULT false,
    "lastHit" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BossParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BossParticipant_battleId_fkey" FOREIGN KEY ("battleId") REFERENCES "BossBattle" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_BossParticipant" ("battleId", "correctAnswers", "damage", "id", "joinedAt", "userId") SELECT "battleId", "correctAnswers", "damage", "id", "joinedAt", "userId" FROM "BossParticipant";
DROP TABLE "BossParticipant";
ALTER TABLE "new_BossParticipant" RENAME TO "BossParticipant";
CREATE INDEX "BossParticipant_userId_idx" ON "BossParticipant"("userId");
CREATE INDEX "BossParticipant_battleId_idx" ON "BossParticipant"("battleId");
CREATE INDEX "BossParticipant_userId_damage_idx" ON "BossParticipant"("userId", "damage");
CREATE INDEX "BossParticipant_userId_isMvp_idx" ON "BossParticipant"("userId", "isMvp");
CREATE UNIQUE INDEX "BossParticipant_userId_battleId_key" ON "BossParticipant"("userId", "battleId");
CREATE TABLE "new_SpaceChannel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "spaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'text',
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SpaceChannel_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_SpaceChannel" ("createdAt", "id", "name", "position", "spaceId") SELECT "createdAt", "id", "name", "position", "spaceId" FROM "SpaceChannel";
DROP TABLE "SpaceChannel";
ALTER TABLE "new_SpaceChannel" RENAME TO "SpaceChannel";
CREATE INDEX "SpaceChannel_spaceId_position_idx" ON "SpaceChannel"("spaceId", "position");
CREATE TABLE "new_SpaceMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "channelId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "parentId" TEXT,
    "sentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editedAt" DATETIME,
    "deletedAt" DATETIME,
    "flagged" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "SpaceMessage_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "SpaceChannel" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SpaceMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SpaceMessage_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "SpaceMessage" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);
INSERT INTO "new_SpaceMessage" ("authorId", "channelId", "content", "editedAt", "id", "sentAt") SELECT "authorId", "channelId", "content", "editedAt", "id", "sentAt" FROM "SpaceMessage";
DROP TABLE "SpaceMessage";
ALTER TABLE "new_SpaceMessage" RENAME TO "SpaceMessage";
CREATE INDEX "SpaceMessage_channelId_sentAt_idx" ON "SpaceMessage"("channelId", "sentAt");
CREATE INDEX "SpaceMessage_authorId_idx" ON "SpaceMessage"("authorId");
CREATE INDEX "SpaceMessage_parentId_idx" ON "SpaceMessage"("parentId");
CREATE TABLE "new_Subject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "category" TEXT NOT NULL DEFAULT 'allgemein',
    "schoolId" TEXT NOT NULL,
    CONSTRAINT "Subject_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Subject" ("color", "id", "name", "schoolId", "shortName") SELECT "color", "id", "name", "schoolId", "shortName" FROM "Subject";
DROP TABLE "Subject";
ALTER TABLE "new_Subject" RENAME TO "Subject";
CREATE INDEX "Subject_schoolId_idx" ON "Subject"("schoolId");
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
    "bio" TEXT,
    "quote" TEXT,
    "favoriteSubject" TEXT,
    "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false,
    "coins" INTEGER NOT NULL DEFAULT 0,
    "premiumCoins" INTEGER NOT NULL DEFAULT 0,
    "streakFreezes" INTEGER NOT NULL DEFAULT 0,
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "premiumUntil" DATETIME,
    "lastSeenAt" DATETIME,
    "bundeslandCode" TEXT,
    "landkreisId" TEXT,
    "schulart" TEXT,
    "jahrgangsstufe" INTEGER,
    "displayName" TEXT,
    "leaderboardOptIn" BOOLEAN NOT NULL DEFAULT false,
    "anonymousMode" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "User_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_classId_fkey" FOREIGN KEY ("classId") REFERENCES "SchoolClass" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_bundeslandCode_fkey" FOREIGN KEY ("bundeslandCode") REFERENCES "Bundesland" ("code") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_landkreisId_fkey" FOREIGN KEY ("landkreisId") REFERENCES "Landkreis" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("avatarUrl", "classId", "coins", "comboStreak", "createdAt", "email", "equippedTitle", "id", "isPremium", "klasse", "lastActiveDate", "lastLoginDate", "name", "notifPrefs", "passwordHash", "pomodoroGoal", "prefs", "premiumUntil", "prestige", "role", "schoolId", "streak", "streakFreezes", "totalDailyLogins", "twoFactor", "twoFactorSecret", "updatedAt", "verifiedAt", "xp") SELECT "avatarUrl", "classId", "coins", "comboStreak", "createdAt", "email", "equippedTitle", "id", "isPremium", "klasse", "lastActiveDate", "lastLoginDate", "name", "notifPrefs", "passwordHash", "pomodoroGoal", "prefs", "premiumUntil", "prestige", "role", "schoolId", "streak", "streakFreezes", "totalDailyLogins", "twoFactor", "twoFactorSecret", "updatedAt", "verifiedAt", "xp" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_role_idx" ON "User"("role");
CREATE INDEX "User_schoolId_idx" ON "User"("schoolId");
CREATE INDEX "User_classId_idx" ON "User"("classId");
CREATE INDEX "User_schoolId_role_idx" ON "User"("schoolId", "role");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "BossQuestion_battleId_idx" ON "BossQuestion"("battleId");

-- CreateIndex
CREATE INDEX "BossQuestionSeen_userId_questionId_idx" ON "BossQuestionSeen"("userId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "BossQuestionSeen_userId_questionId_key" ON "BossQuestionSeen"("userId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "MollieOrder_mollieId_key" ON "MollieOrder"("mollieId");

-- CreateIndex
CREATE INDEX "MollieOrder_userId_idx" ON "MollieOrder"("userId");

-- CreateIndex
CREATE INDEX "MollieOrder_status_idx" ON "MollieOrder"("status");

-- CreateIndex
CREATE INDEX "SpaceMessageReaction_messageId_idx" ON "SpaceMessageReaction"("messageId");

-- CreateIndex
CREATE INDEX "SpaceMessageReaction_userId_idx" ON "SpaceMessageReaction"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SpaceMessageReaction_messageId_userId_emoji_key" ON "SpaceMessageReaction"("messageId", "userId", "emoji");

-- CreateIndex
CREATE UNIQUE INDEX "UserConsent_userId_key" ON "UserConsent"("userId");

-- CreateIndex
CREATE INDEX "ActivitySession_userId_idx" ON "ActivitySession"("userId");

-- CreateIndex
CREATE INDEX "ActivitySession_sessionDate_idx" ON "ActivitySession"("sessionDate");

-- CreateIndex
CREATE UNIQUE INDEX "ActivitySession_userId_sessionDate_key" ON "ActivitySession"("userId", "sessionDate");

-- CreateIndex
CREATE INDEX "VoiceParticipant_channelId_idx" ON "VoiceParticipant"("channelId");

-- CreateIndex
CREATE INDEX "VoiceParticipant_userId_idx" ON "VoiceParticipant"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VoiceParticipant_channelId_userId_key" ON "VoiceParticipant"("channelId", "userId");

-- CreateIndex
CREATE INDEX "Friendship_requesterId_idx" ON "Friendship"("requesterId");

-- CreateIndex
CREATE INDEX "Friendship_addresseeId_idx" ON "Friendship"("addresseeId");

-- CreateIndex
CREATE UNIQUE INDEX "Friendship_requesterId_addresseeId_key" ON "Friendship"("requesterId", "addresseeId");

-- CreateIndex
CREATE INDEX "PersonalEvent_userId_startAt_idx" ON "PersonalEvent"("userId", "startAt");

-- CreateIndex
CREATE INDEX "Document_userId_idx" ON "Document"("userId");

-- CreateIndex
CREATE INDEX "Spreadsheet_userId_idx" ON "Spreadsheet"("userId");

-- CreateIndex
CREATE INDEX "Presentation_userId_idx" ON "Presentation"("userId");

-- CreateIndex
CREATE INDEX "Homework_classId_idx" ON "Homework"("classId");

-- CreateIndex
CREATE INDEX "Homework_teacherId_idx" ON "Homework"("teacherId");

-- CreateIndex
CREATE INDEX "Homework_classId_dueAt_idx" ON "Homework"("classId", "dueAt");

-- CreateIndex
CREATE INDEX "HomeworkCompletion_studentId_idx" ON "HomeworkCompletion"("studentId");

-- CreateIndex
CREATE INDEX "HomeworkCompletion_homeworkId_idx" ON "HomeworkCompletion"("homeworkId");

-- CreateIndex
CREATE UNIQUE INDEX "HomeworkCompletion_homeworkId_studentId_key" ON "HomeworkCompletion"("homeworkId", "studentId");

-- CreateIndex
CREATE INDEX "SeasonRankingEntry_seasonId_idx" ON "SeasonRankingEntry"("seasonId");

-- CreateIndex
CREATE INDEX "SeasonRankingEntry_userId_idx" ON "SeasonRankingEntry"("userId");

-- CreateIndex
CREATE INDEX "SeasonRankingEntry_category_idx" ON "SeasonRankingEntry"("category");

-- CreateIndex
CREATE UNIQUE INDEX "SeasonRankingEntry_seasonId_userId_category_key" ON "SeasonRankingEntry"("seasonId", "userId", "category");

-- CreateIndex
CREATE INDEX "UserSkillMastery_userId_idx" ON "UserSkillMastery"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserSkillMastery_userId_nodeSlug_key" ON "UserSkillMastery"("userId", "nodeSlug");

-- CreateIndex
CREATE INDEX "Landkreis_bundeslandCode_idx" ON "Landkreis"("bundeslandCode");

-- CreateIndex
CREATE UNIQUE INDEX "CurriculumSubject_key_key" ON "CurriculumSubject"("key");

-- CreateIndex
CREATE INDEX "Curriculum_bundeslandCode_schulart_jahrgangsstufe_idx" ON "Curriculum"("bundeslandCode", "schulart", "jahrgangsstufe");

-- CreateIndex
CREATE UNIQUE INDEX "Curriculum_bundeslandCode_schulart_jahrgangsstufe_subjectId_key" ON "Curriculum"("bundeslandCode", "schulart", "jahrgangsstufe", "subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "TreeNode_slug_key" ON "TreeNode"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "TreeNodePrereq_nodeId_requiresNodeId_key" ON "TreeNodePrereq"("nodeId", "requiresNodeId");

-- CreateIndex
CREATE INDEX "UserTreeProgress_userId_idx" ON "UserTreeProgress"("userId");

-- CreateIndex
CREATE INDEX "UserTreeProgress_nodeId_idx" ON "UserTreeProgress"("nodeId");

-- CreateIndex
CREATE UNIQUE INDEX "UserTreeProgress_userId_nodeId_key" ON "UserTreeProgress"("userId", "nodeId");

-- CreateIndex
CREATE UNIQUE INDEX "TreeQuest_slug_key" ON "TreeQuest"("slug");

-- CreateIndex
CREATE INDEX "TreeQuest_nodeId_idx" ON "TreeQuest"("nodeId");

-- CreateIndex
CREATE INDEX "UserTreeQuest_userId_idx" ON "UserTreeQuest"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserTreeQuest_userId_questId_key" ON "UserTreeQuest"("userId", "questId");

-- CreateIndex
CREATE INDEX "DailyActivity_userId_idx" ON "DailyActivity"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyActivity_userId_day_key" ON "DailyActivity"("userId", "day");

-- CreateIndex
CREATE INDEX "BossDef_rarity_idx" ON "BossDef"("rarity");

-- CreateIndex
CREATE INDEX "BossDef_subject_idx" ON "BossDef"("subject");

-- CreateIndex
CREATE INDEX "UserBossProgress_userId_idx" ON "UserBossProgress"("userId");

-- CreateIndex
CREATE INDEX "UserBossProgress_bossId_idx" ON "UserBossProgress"("bossId");

-- CreateIndex
CREATE UNIQUE INDEX "UserBossProgress_userId_bossId_key" ON "UserBossProgress"("userId", "bossId");

-- CreateIndex
CREATE INDEX "TierProgress_userId_idx" ON "TierProgress"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TierProgress_userId_rarity_key" ON "TierProgress"("userId", "rarity");

-- CreateIndex
CREATE UNIQUE INDEX "ItemDef_key_key" ON "ItemDef"("key");

-- CreateIndex
CREATE INDEX "ItemDef_kind_idx" ON "ItemDef"("kind");

-- CreateIndex
CREATE INDEX "ItemDef_rarity_idx" ON "ItemDef"("rarity");

-- CreateIndex
CREATE INDEX "ShopListing_itemId_idx" ON "ShopListing"("itemId");

-- CreateIndex
CREATE INDEX "UserItem_userId_idx" ON "UserItem"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserItem_userId_itemId_key" ON "UserItem"("userId", "itemId");

-- CreateIndex
CREATE UNIQUE INDEX "AchievementDef_key_key" ON "AchievementDef"("key");

-- CreateIndex
CREATE INDEX "UserEarnedAchievement_userId_idx" ON "UserEarnedAchievement"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserEarnedAchievement_userId_achievementId_key" ON "UserEarnedAchievement"("userId", "achievementId");

-- CreateIndex
CREATE UNIQUE INDEX "ProvisioningCode_code_key" ON "ProvisioningCode"("code");

-- CreateIndex
CREATE INDEX "ProvisioningCode_schoolId_idx" ON "ProvisioningCode"("schoolId");

-- CreateIndex
CREATE INDEX "ProvisioningCode_code_idx" ON "ProvisioningCode"("code");

-- CreateIndex
CREATE INDEX "ProvisioningCode_kind_idx" ON "ProvisioningCode"("kind");

-- CreateIndex
CREATE INDEX "UserSubjectMinutes_userId_idx" ON "UserSubjectMinutes"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserSubjectMinutes_userId_subjectKey_key" ON "UserSubjectMinutes"("userId", "subjectKey");

-- CreateIndex
CREATE INDEX "UserSkillPurchase_userId_idx" ON "UserSkillPurchase"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserSkillPurchase_userId_nodeKey_key" ON "UserSkillPurchase"("userId", "nodeKey");

-- CreateIndex
CREATE INDEX "Resource_schoolId_idx" ON "Resource"("schoolId");

-- CreateIndex
CREATE INDEX "ResourceBooking_resourceId_idx" ON "ResourceBooking"("resourceId");

-- CreateIndex
CREATE INDEX "ResourceBooking_userId_idx" ON "ResourceBooking"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GradeScale_schoolId_key" ON "GradeScale"("schoolId");

-- CreateIndex
CREATE INDEX "GradeScaleEntry_gradeScaleId_idx" ON "GradeScaleEntry"("gradeScaleId");

-- CreateIndex
CREATE UNIQUE INDEX "GradeScaleEntry_gradeScaleId_grade_key" ON "GradeScaleEntry"("gradeScaleId", "grade");

-- CreateIndex
CREATE INDEX "Frage_schulart_bundesland_jahrgangsstufe_fach_thema_schwierigkeit_schwierigkeitScore_idx" ON "Frage"("schulart", "bundesland", "jahrgangsstufe", "fach", "thema", "schwierigkeit", "schwierigkeitScore");

-- CreateIndex
CREATE INDEX "Frage_fach_jahrgangsstufe_schwierigkeit_idx" ON "Frage"("fach", "jahrgangsstufe", "schwierigkeit");

-- CreateIndex
CREATE INDEX "DriveFile_userId_idx" ON "DriveFile"("userId");

-- CreateIndex
CREATE INDEX "DriveFile_schoolId_idx" ON "DriveFile"("schoolId");

-- CreateIndex
CREATE INDEX "CanvaEmbed_userId_idx" ON "CanvaEmbed"("userId");

-- CreateIndex
CREATE INDEX "CanvaEmbed_schoolId_idx" ON "CanvaEmbed"("schoolId");

-- CreateIndex
CREATE INDEX "SchoolWikiEntry_schoolId_idx" ON "SchoolWikiEntry"("schoolId");

-- CreateIndex
CREATE INDEX "SchoolWikiEntry_authorId_idx" ON "SchoolWikiEntry"("authorId");
