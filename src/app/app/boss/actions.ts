/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { pushToUsers } from "@/lib/push";
import { BOSS_TIERS, BOSS_INDEX, type BossTier } from "@/lib/game";
import { getEventMultiplier } from "@/lib/settings";
import { onBossFightWin } from "@/lib/tree-quest-engine";
import { BUILTIN_BOSS_QUESTIONS } from "@/lib/boss-fallback-questions";
import { safeJsonParse } from "@/lib/safe-json";
import { rateLimit } from "@/lib/security/rate-limit";
import { logger } from "@/lib/logger";

/** Antwortzeit unter diesem Wert → kritischer Treffer (doppelter Schaden). */
const CRIT_MS = 3_500;
/** Ab dieser Streak-Länge gibt es +1 Bonusschaden. */
const STREAK_BONUS_AT = 5;

export interface AttackResult {
  correct: boolean;
  /** Verursachter Schaden (0 bei falscher Antwort). */
  damage: number;
  /** Kritischer Treffer (besonders schnell geantwortet). */
  crit: boolean;
  newHp: number;
  maxHp: number;
  defeated: boolean;
  firstBlood: boolean;
  lastHit: boolean;
  coinsEarned: number;
  isMvp?: boolean;
  /** Index der richtigen Option (0-basiert, Originalreihenfolge). */
  correctIndex?: number;
  /** Erklärung, warum die Antwort richtig/falsch ist (falls vorhanden). */
  explanation?: string | null;
  killData?: {
    mvpName: string;
    mvpAnswers: number;
    totalParticipants: number;
    bossTier: string;
    bossName: string;
    bossIcon: string;
  };
}

/**
 * Robustes Parsen des Lösungs-Felds einer Frage.
 * Verkraftet: echtes Array (Postgres String[]), JSON-String ('["a"]'),
 * und nackte Buchstaben ("a" oder "a,b") — wirft nie.
 */
function parseLoesung(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw !== "string" || raw === "") return [];
  const parsed = safeJsonParse<unknown>(raw, null);
  if (Array.isArray(parsed)) return parsed.map(String);
  if (typeof parsed === "string") return [parsed];
  // kein JSON: als Buchstabenliste interpretieren ("a" / "a,b")
  return raw.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
}

export async function attackBoss(
  battleId: string,
  questionId: string,
  selectedOptionIndex: number,
  meta?: { elapsedMs?: number; streak?: number },
): Promise<AttackResult | { error: string }> {
  // Schutz-Wrapper: eine geworfene Exception in einer Server Action rendert
  // sonst die Fehlerseite — der Client soll stattdessen eine Meldung zeigen.
  try {
    return await attackBossInner(battleId, questionId, selectedOptionIndex, meta);
  } catch (err) {
    logger.error("attackBoss failed", err, { battleId, questionId });
    return { error: "Antwort konnte nicht verarbeitet werden" };
  }
}

async function attackBossInner(
  battleId: string,
  questionId: string,
  selectedOptionIndex: number,
  meta?: { elapsedMs?: number; streak?: number },
): Promise<AttackResult | { error: string }> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "student") return { error: "Unauthorized" };

  const battle = await prisma.bossBattle.findFirst({
    where: {
      id: battleId,
      isActive: true,
      currentHp: { gt: 0 },
      OR: [{ schoolId: null }, { schoolId: session.schoolId ?? "" }],
    },
  });
  if (!battle) return { error: "Boss not active" };

  // Resolve question — builtin-Pool → boss-custom pool → Frage-Pool (fq_ prefix) → general pool
  const isBuiltin = questionId.startsWith("builtin_");
  const builtinQ  = isBuiltin ? BUILTIN_BOSS_QUESTIONS[Number(questionId.slice(8))] ?? null : null;
  const isFrage   = questionId.startsWith("fq_");
  const realId    = isFrage ? questionId.slice(3) : questionId;

  const bossQ  = (!isFrage && !isBuiltin) ? await prisma.bossQuestion.findUnique({ where: { id: realId } }) : null;
  const genQ   = (!isFrage && !isBuiltin && !bossQ) ? await prisma.exerciseQuestion.findUnique({ where: { id: realId } }) : null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const frageQ = isFrage ? await (prisma as any).frage.findUnique({ where: { id: realId } }) as Record<string, unknown> | null : null;

  if (!bossQ && !genQ && !frageQ && !builtinQ) return { error: "Question not found" };

  // Check correctness
  const correct = builtinQ
    ? selectedOptionIndex === builtinQ.correct
    : bossQ
    ? selectedOptionIndex === bossQ.correct
    : genQ
    ? String(selectedOptionIndex) === genQ.correct
    : (() => {
        const letter  = String.fromCharCode(97 + selectedOptionIndex); // 0→"a", 1→"b", …
        const loesung = parseLoesung(frageQ!.loesung);
        return loesung.includes(letter);
      })();

  // Richtige-Antwort-Index + Erklärung fürs Client-Feedback ("warum falsch").
  let correctIndex: number | undefined;
  let explanation: string | null | undefined;
  if (builtinQ) {
    correctIndex = builtinQ.correct;
    explanation = builtinQ.explanation;
  } else if (bossQ) {
    correctIndex = bossQ.correct;
    explanation = null; // BossQuestion hat kein Erklärungsfeld
  } else if (genQ) {
    correctIndex = Number(genQ.correct);
    explanation = genQ.explanation ?? null;
  } else if (frageQ) {
    const loesung = parseLoesung(frageQ.loesung);
    correctIndex = loesung[0] ? loesung[0].toLowerCase().charCodeAt(0) - 97 : undefined;
    explanation = (frageQ.erklaerung as string | undefined) ?? null;
  }

  // Record seen status for boss-custom questions — zugleich Replay-Exploit mindern:
  // Eine bereits korrekt beantwortete Boss-Frage darf kein weiteres Mal Schaden
  // verursachen, sonst wäre dieselbe Frage-ID + korrekter Index beliebig oft für
  // Schaden spammbar (Solo-Kill durch Request-Spam).
  if (bossQ) {
    const existingSeen = await prisma.bossQuestionSeen.findUnique({
      where: { userId_questionId: { userId: session.userId, questionId: bossQ.id } },
      select: { answeredCorrect: true },
    });
    if (existingSeen?.answeredCorrect) {
      return { error: "Frage bereits beantwortet" };
    }
    await prisma.bossQuestionSeen.upsert({
      where: { userId_questionId: { userId: session.userId, questionId: bossQ.id } },
      create: { userId: session.userId, questionId: bossQ.id, answeredCorrect: correct },
      update: { answeredCorrect: correct, seenAt: new Date() },
    }).catch(() => {});
  }
  // frageQ: no per-user seen tracking needed (pool is large enough to randomise)
  const isFirstBlood = battle.firstBloodUserId === null;

  if (!correct) {
    await prisma.bossParticipant.upsert({
      where: { userId_battleId: { userId: session.userId, battleId } },
      create: { userId: session.userId, battleId, wrongAnswers: 1 },
      update: { wrongAnswers: { increment: 1 } },
    });
    return { correct: false, damage: 0, crit: false, newHp: battle.currentHp, maxHp: battle.maxHp, defeated: false, firstBlood: false, lastHit: false, coinsEarned: 0, correctIndex, explanation };
  }

  // Replay-/Spam-Schutz für Fragen ohne per-User Seen-Tracking (Builtin-Pool,
  // Frage-Pool, ExerciseQuestion): dieselbe Frage-ID + korrekter Index ließe sich
  // sonst beliebig oft für Schaden senden. Serverseitiger Cooldown pro User+Battle
  // drosselt den Schaden-Spam, ohne den normalen 1-Frage-1-Antwort-Fluss zu brechen.
  if (!bossQ) {
    const rl = await rateLimit({ scope: "boss-attack", key: `${session.userId}:${battleId}`, limit: 1, windowSec: 2 });
    if (!rl.ok) {
      return { error: "Zu schnell — kurz warten" };
    }
  }

  // Schadensberechnung: 1 Basis, +1 bei Crit (schnelle Antwort), +1 ab 5er-Streak.
  // elapsedMs/streak sind client-gemeldet (wie Herzen: client-seitiges Gameplay) —
  // Werte werden geclampt, der Maximalschaden ist 3 pro Antwort.
  const elapsedMs = Math.max(0, Number(meta?.elapsedMs ?? Number.MAX_SAFE_INTEGER));
  const streak = Math.max(0, Math.floor(Number(meta?.streak ?? 0)));
  const crit = elapsedMs <= CRIT_MS;
  const damage = Math.min(battle.currentHp, 1 + (crit ? 1 : 0) + (streak >= STREAK_BONUS_AT ? 1 : 0));

  const newHp = Math.max(0, battle.currentHp - damage);
  const defeated = newHp === 0;
  let coinsEarned = 0;
  let isMvp = false;
  let gotFirstBlood = false;
  let participantIds: string[] = [];

  const [xpMulti, coinMulti] = await Promise.all([
    getEventMultiplier("xp"),
    getEventMultiplier("coins"),
  ]);

  let alreadyFinished = false;

  await prisma.$transaction(async (tx) => {
    // Update boss HP — nur solange der Boss noch aktiv ist. Verhindert, dass
    // zwei gleichzeitige Todesstöße beide die Reward-Schleife ausführen.
    const hpRes = await tx.bossBattle.updateMany({
      where: { id: battleId, isActive: true },
      data: {
        currentHp: newHp,
        isActive: defeated ? false : true,
        ...(defeated ? { killedByUserId: session.userId } : {}),
      },
    });
    if (hpRes.count === 0) {
      alreadyFinished = true;
      return;
    }

    // First blood atomar claimen (Race: zwei gleichzeitige erste Treffer)
    if (isFirstBlood) {
      const fb = await tx.bossBattle.updateMany({
        where: { id: battleId, firstBloodUserId: null },
        data: { firstBloodUserId: session.userId },
      });
      gotFirstBlood = fb.count === 1;
    }

    // Upsert participant
    await tx.bossParticipant.upsert({
      where: { userId_battleId: { userId: session.userId, battleId } },
      create: { userId: session.userId, battleId, damage, correctAnswers: 1, firstBlood: gotFirstBlood },
      update: { damage: { increment: damage }, correctAnswers: { increment: 1 }, ...(gotFirstBlood ? { firstBlood: true } : {}) },
    });

    // First blood coin bonus
    if (gotFirstBlood) {
      coinsEarned += 10;
      await tx.user.update({ where: { id: session.userId }, data: { coins: { increment: 10 } } });
      await tx.coinLog.create({ data: { userId: session.userId, amount: 10, reason: "boss_first_blood", referenceId: battleId } });
    }

    if (defeated) {
      const tier = (battle.tier as BossTier) in BOSS_TIERS ? battle.tier as BossTier : "common";
      const tierData = BOSS_TIERS[tier];

      const participants = await tx.bossParticipant.findMany({
        where: { battleId },
        orderBy: { damage: "desc" },
        include: { user: { select: { name: true } } },
      });

      participantIds = participants.map((p) => p.userId);
      const totalDamage = participants.reduce((s, p) => s + p.damage, 0);

      for (let i = 0; i < participants.length; i++) {
        const p = participants[i];
        const isPlayerMvp = i === 0;
        const isLastHitter = p.userId === session.userId;
        const shareRatio = totalDamage > 0 ? p.damage / totalDamage : 1 / participants.length;
        const xpShare = Math.round(tierData.xpReward * shareRatio * xpMulti);
        const coins = Math.round((isPlayerMvp ? tierData.mvpCoinReward : tierData.coinReward) * coinMulti);
        const lastHitBonus = isLastHitter ? 15 : 0;
        const totalCoins = coins + lastHitBonus;

        // Update XP
        await tx.user.update({ where: { id: p.userId }, data: { xp: { increment: xpShare } } });
        await tx.xpLog.create({ data: { userId: p.userId, amount: xpShare, reason: "boss_battle_reward", referenceId: battleId } });

        // Award coins
        await tx.user.update({ where: { id: p.userId }, data: { coins: { increment: totalCoins } } });
        await tx.coinLog.create({
          data: { userId: p.userId, amount: coins, reason: isPlayerMvp ? "boss_mvp_bonus" : "boss_battle_reward", referenceId: battleId },
        });
        if (lastHitBonus > 0) {
          await tx.coinLog.create({ data: { userId: p.userId, amount: lastHitBonus, reason: "boss_last_hit", referenceId: battleId } });
        }

        // Update participant record
        await tx.bossParticipant.update({
          where: { id: p.id },
          data: { isMvp: isPlayerMvp, coinsEarned: totalCoins, lastHit: isLastHitter },
        });

        if (p.userId === session.userId) {
          coinsEarned += totalCoins;
          isMvp = isPlayerMvp;
        }
      }
    }
  });

  if (alreadyFinished) return { error: "Boss not active" };

  let killData: AttackResult["killData"] | undefined;

  // Award boss-slayer title to MVP and build kill overlay data (non-critical, after TX)
  if (defeated && participantIds.length > 0) {
    const tier = (battle.tier as BossTier) in BOSS_TIERS ? battle.tier as BossTier : "common";
    const tierData = BOSS_TIERS[tier];

    // Find matching BOSS_INDEX entry by name for title awarding
    const indexEntry = BOSS_INDEX.find((b) => b.name === battle.name);
    if (indexEntry && isMvp) {
      const titleSlug = `boss_mvp_${indexEntry.slug}`;
      await prisma.userTitle.upsert({
        where: { userId_titleSlug: { userId: session.userId, titleSlug } },
        create: { userId: session.userId, titleSlug, unlockedAt: new Date() },
        update: {},
      }).catch(() => {});
    }

    // Fetch MVP name for overlay
    const mvpUser = await prisma.user.findUnique({ where: { id: participantIds[0] }, select: { name: true } });
    const mvpParticipant = await prisma.bossParticipant.findFirst({ where: { battleId, isMvp: true }, select: { correctAnswers: true } });

    killData = {
      mvpName: mvpUser?.name ?? "Unbekannt",
      mvpAnswers: mvpParticipant?.correctAnswers ?? 0,
      totalParticipants: participantIds.length,
      bossTier: battle.tier,
      bossName: battle.name,
      bossIcon: battle.icon,
    };

    pushToUsers(participantIds, {
      title: `${battle.icon} Boss besiegt!`,
      body: `Der ${tierData.label}-Boss "${battle.name}" wurde vernichtet! ${isMvp ? "Du bist MVP! 👑" : ""}`,
      url: "/app/boss",
    }).catch(() => {});

    onBossFightWin(session.userId).catch(() => undefined);
  }

  // Beim Defeat kein revalidatePath — der Client refresht nach der Todesanimation.
  // Für normale Treffer revalidieren wir, damit das Leaderboard aktuell bleibt.
  if (!defeated) {
    revalidatePath("/app/boss");
  }

  return {
    correct: true,
    damage,
    crit,
    newHp,
    maxHp: battle.maxHp,
    defeated,
    firstBlood: gotFirstBlood,
    lastHit: defeated,
    coinsEarned,
    isMvp,
    killData,
    correctIndex,
    explanation,
  };
}
