/**
 * boss-seed.ts — seeds all 75 BossDef records + achievement catalog
 * Run: npx ts-node --project tsconfig.json prisma/seed/boss-seed.ts
 * Idempotent: uses upsert on id / key.
 */

import { PrismaClient, Rarity } from "@prisma/client";
import { ALL_BOSSES } from "../../src/lib/boss-defs";

const prisma = new PrismaClient();

// ── Achievement catalog ───────────────────────────────────────────────────────
const ACHIEVEMENTS = [
  // Onboarding
  { key: "first_login",       name: "Erster Schritt",        description: "Zum ersten Mal eingeloggt",              icon: "👣", xpReward: 10,  rarity: Rarity.COMMON    },
  { key: "tree_unlocked",     name: "Baum erwacht",          description: "Den Wissens-Skilltree aktiviert",        icon: "🌳", xpReward: 50,  rarity: Rarity.COMMON    },
  // Learning
  { key: "exercises_5",       name: "Aufwärmen",             description: "5 Übungsaufgaben gelöst",                icon: "📝", xpReward: 20,  rarity: Rarity.COMMON    },
  { key: "exercises_50",      name: "Ausdauernd",            description: "50 Übungsaufgaben gelöst",               icon: "💪", xpReward: 75,  rarity: Rarity.UNCOMMON  },
  { key: "exercises_500",     name: "Übungstitan",           description: "500 Übungsaufgaben gelöst",              icon: "⚡", xpReward: 300, rarity: Rarity.RARE      },
  { key: "perfect_quiz",      name: "Perfektionist",         description: "Ein Quiz mit 100% bestanden",            icon: "🎯", xpReward: 100, rarity: Rarity.UNCOMMON  },
  { key: "flashcards_100",    name: "Gedächtnis-Trainee",    description: "100 Karteikarten beantwortet",           icon: "🃏", xpReward: 80,  rarity: Rarity.COMMON    },
  { key: "flashcards_1000",   name: "Erinnerungsmeister",    description: "1000 Karteikarten beantwortet",          icon: "🧠", xpReward: 400, rarity: Rarity.RARE      },
  // Skill Tree
  { key: "node_first",        name: "Erste Erleuchtung",     description: "Ersten Skillbaum-Knoten gemeistert",     icon: "🌟", xpReward: 50,  rarity: Rarity.COMMON    },
  { key: "nodes_10",          name: "Wissenssammler",        description: "10 Knoten gemeistert",                   icon: "💡", xpReward: 150, rarity: Rarity.UNCOMMON  },
  { key: "nodes_50",          name: "Wissensbeherrscher",    description: "50 Knoten gemeistert",                   icon: "🏛️",xpReward: 500, rarity: Rarity.RARE      },
  { key: "tree_complete",     name: "Wissensmeister",        description: "Den kompletten Skilltree gemeistert",    icon: "🌌", xpReward: 5000,rarity: Rarity.LEGENDARY  },
  // Streaks
  { key: "streak_3",          name: "3 Tage am Stück",       description: "3-Tage-Streak erreicht",                 icon: "🔥", xpReward: 30,  rarity: Rarity.COMMON    },
  { key: "streak_7",          name: "Wochenheld",            description: "7-Tage-Streak erreicht",                 icon: "🔥", xpReward: 100, rarity: Rarity.UNCOMMON  },
  { key: "streak_30",         name: "Eiserner Wille",        description: "30-Tage-Streak erreicht",                icon: "⚡", xpReward: 500, rarity: Rarity.EPIC      },
  { key: "streak_100",        name: "Unaufhaltsam",          description: "100-Tage-Streak erreicht",               icon: "🏆", xpReward: 2000,rarity: Rarity.LEGENDARY  },
  // Boss
  { key: "boss_first_kill",   name: "Boss-Slayer",           description: "Ersten Boss besiegt",                    icon: "⚔️", xpReward: 100, rarity: Rarity.COMMON    },
  { key: "boss_first_mvp",    name: "MVP",                   description: "Ersten Boss-MVP-Kill",                   icon: "👑", xpReward: 200, rarity: Rarity.UNCOMMON  },
  { key: "boss_epic_kill",    name: "Epic-Slayer",           description: "Einen Epischen Boss besiegt",            icon: "🐉", xpReward: 500, rarity: Rarity.RARE      },
  { key: "boss_legendary_mvp", name: "Legendenbrecher",        description: "Legendären Boss als MVP besiegt",        icon: "⚡", xpReward: 1000,rarity: Rarity.EPIC      },
  { key: "boss_all_common",   name: "Common-Clearer",        description: "Alle Common-Bosse besiegt",              icon: "🥉", xpReward: 300, rarity: Rarity.UNCOMMON  },
  { key: "boss_all_uncommon", name: "Uncommon-Clearer",      description: "Alle Uncommon-Bosse als MVP besiegt",    icon: "🥈", xpReward: 600, rarity: Rarity.RARE      },
  { key: "boss_all_rare",     name: "Rare-Clearer",          description: "Alle Rare-Bosse als MVP besiegt",        icon: "🥇", xpReward: 1200,rarity: Rarity.EPIC      },
  { key: "boss_all_epic",     name: "Epic-Clearer",          description: "Alle Epischen Bosse als MVP besiegt",    icon: "💎", xpReward: 2500,rarity: Rarity.LEGENDARY  },
  { key: "boss_all_legendary", name: "Legendenleerer",          description: "Alle Legendären Bosse als MVP besiegt", icon: "🌠", xpReward: 5000,rarity: Rarity.MYTHIC    },
  { key: "boss_secret_found", name: "Entdecker",             description: "Einen geheimen Boss entdeckt",           icon: "🔍", xpReward: 500, rarity: Rarity.EPIC,  secret: true },
  { key: "boss_mastermind",   name: "MASTERMIND-Bezwinger",  description: "Den Endboss besiegt",                    icon: "🧠", xpReward: 9999,rarity: Rarity.SECRET, secret: true },
  // Duel
  { key: "duel_first_win",    name: "Erster Duell-Sieg",     description: "Erstes Duell gewonnen",                  icon: "⚔️", xpReward: 100, rarity: Rarity.COMMON    },
  { key: "duel_10_wins",      name: "Duell-Veteran",         description: "10 Duelle gewonnen",                     icon: "🗡️", xpReward: 300, rarity: Rarity.UNCOMMON  },
  { key: "duel_50_wins",      name: "Duell-Meister",         description: "50 Duelle gewonnen",                     icon: "🏆", xpReward: 1000,rarity: Rarity.EPIC      },
  // XP milestones
  { key: "xp_1000",           name: "Aufsteiger",            description: "1.000 XP gesammelt",                     icon: "⚡", xpReward: 50,  rarity: Rarity.COMMON    },
  { key: "xp_10000",          name: "Erfahrener",            description: "10.000 XP gesammelt",                    icon: "💫", xpReward: 200, rarity: Rarity.UNCOMMON  },
  { key: "xp_100000",         name: "Erfahrungsgott",        description: "100.000 XP gesammelt",                   icon: "🌟", xpReward: 1000,rarity: Rarity.LEGENDARY  },
  // Office/Creation
  { key: "pptx_first",        name: "Präsentator",           description: "Erste Präsentation erstellt",            icon: "📊", xpReward: 50,  rarity: Rarity.COMMON    },
  { key: "pptx_10",           name: "Präsentationsprofi",    description: "10 Präsentationen erstellt",             icon: "🎤", xpReward: 200, rarity: Rarity.UNCOMMON  },
  // Hidden
  { key: "night_owl",         name: "Nachteule",             description: "???",                                     icon: "🦉", xpReward: 200, rarity: Rarity.RARE,  secret: true },
  { key: "speed_demon",       name: "Speed-Dämon",           description: "???",                                     icon: "⚡", xpReward: 300, rarity: Rarity.EPIC,  secret: true },
] as const;

// ── Seed function ──────────────────────────────────────────────────────────────
export async function seedBosses() {
  console.log("⚔️  Seeding 75 BossDefs…");
  for (const boss of ALL_BOSSES) {
    await prisma.bossDef.upsert({
      where: { id: boss.id },
      create: {
        id:        boss.id,
        name:      boss.name,
        subject:   boss.subject,
        emoji:     boss.emoji,
        rarity:    boss.rarity as Rarity,
        minGrade:  boss.minGrade,
        maxGrade:  boss.maxGrade,
        baseHp:    boss.baseHp,
        baseXp:    boss.baseXp,
        baseCoins: boss.baseCoins,
        loreShort: boss.loreShort,
        custom:    boss.custom,
        mvpTarget: boss.mvpTarget,
      },
      update: {
        name:      boss.name,
        subject:   boss.subject,
        emoji:     boss.emoji,
        rarity:    boss.rarity as Rarity,
        loreShort: boss.loreShort,
        custom:    boss.custom,
      },
    });
  }
  console.log(`   ✓ ${ALL_BOSSES.length} bosses upserted`);

  console.log("🏆 Seeding AchievementDefs…");
  for (const ach of ACHIEVEMENTS) {
    await prisma.achievementDef.upsert({
      where:  { key: ach.key },
      create: {
        key:         ach.key,
        name:        (ach as { name?: string }).name ?? ach.key,
        description: ach.description,
        icon:        ach.icon,
        xpReward:    ach.xpReward,
        rarity:      ach.rarity as Rarity,
        secret:      (ach as { secret?: boolean }).secret ?? false,
      },
      update: {
        name:        (ach as { name?: string }).name ?? ach.key,
        description: ach.description,
        xpReward:    ach.xpReward,
      },
    });
  }
  console.log(`   ✓ ${ACHIEVEMENTS.length} achievements upserted`);
}

// ── Direct run ────────────────────────────────────────────────────────────────
if (require.main === module) {
  seedBosses()
    .then(() => { console.log("✅  Boss seed complete"); process.exit(0); })
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
}
