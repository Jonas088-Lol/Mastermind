"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { BOSS_INDEX, BOSS_TIERS, BOSS_GRADES, randomBossTier, type BossTier } from "@/lib/game";
import { awardCoins } from "@/lib/coins";
import { pushToUsers } from "@/lib/push";
import { logger } from "@/lib/logger";
import { setSetting, deleteSetting } from "@/lib/settings";

export async function runAdminCommand(raw: string): Promise<{ ok: boolean; message: string }> {
  const session = await getSession();
  if (!session || (effectiveRole(session) !== "admin" && !session.isSuperAdmin)) {
    return { ok: false, message: "Nicht autorisiert." };
  }

  const parts = raw.trim().split(/\s+/);
  const cmd   = parts[0]?.toLowerCase();

  try {
    // ── /doublex <hours> ──────────────────────────────────
    if (cmd === "/doublex") {
      const h = Math.max(1, Math.min(168, Number(parts[1]) || 2));
      const until = new Date(Date.now() + h * 3_600_000);
      await setSetting("EVENT_DOUBLE_XP_UNTIL", until.toISOString(), session.userId);
      revalidatePath("/app");
      return { ok: true, message: `✓ Doppel-XP aktiv bis ${until.toLocaleString("de-DE")} (${h}h)` };
    }

    // ── /doublec <hours> ──────────────────────────────────
    if (cmd === "/doublec") {
      const h = Math.max(1, Math.min(168, Number(parts[1]) || 2));
      const until = new Date(Date.now() + h * 3_600_000);
      await setSetting("EVENT_DOUBLE_COINS_UNTIL", until.toISOString(), session.userId);
      revalidatePath("/app");
      return { ok: true, message: `✓ Doppel-Coins aktiv bis ${until.toLocaleString("de-DE")} (${h}h)` };
    }

    // ── /event stop ───────────────────────────────────────
    if (cmd === "/event" && parts[1] === "stop") {
      await Promise.all([
        deleteSetting("EVENT_DOUBLE_XP_UNTIL"),
        deleteSetting("EVENT_DOUBLE_COINS_UNTIL"),
      ]);
      revalidatePath("/app");
      return { ok: true, message: "✓ Alle Events gestoppt." };
    }

    // ── /bossrush ─────────────────────────────────────────
    if (cmd === "/bossrush") {
      const tier     = randomBossTier();
      const tierData = BOSS_TIERS[tier];
      const pool     = BOSS_INDEX.filter((b) => b.tier === tier);
      const template = pool[Math.floor(Math.random() * pool.length)] ?? BOSS_INDEX[0];
      const grade    = BOSS_GRADES[Math.floor(Math.random() * BOSS_GRADES.length)];
      const now      = new Date();
      const battle = await prisma.bossBattle.create({
        data: {
          schoolId: session.schoolId ?? null,
          name: template.name, description: template.description, lore: template.lore,
          subject: template.subject, gradeLevel: grade, tier,
          maxHp: tierData.hp, currentHp: tierData.hp, difficulty: "hard",
          coinReward: tierData.coinReward, mvpCoinReward: tierData.mvpCoinReward, xpReward: tierData.xpReward,
          icon: template.icon, startAt: now, endAt: new Date(now.getTime() + 12 * 3_600_000), isActive: true,
        },
      });
      const ids = await prisma.user.findMany({ where: { role: "student", schoolId: session.schoolId ?? undefined }, select: { id: true } });
      pushToUsers(ids.map((u) => u.id), { title: `${template.icon} Boss-Rush!`, body: `${tierData.label}-Boss "${template.name}" spawnt jetzt!`, url: "/app/boss" }).catch(() => {});
      revalidatePath("/app/boss");
      return { ok: true, message: `✓ Boss-Rush: "${template.name}" (${tierData.label}) spawnt! ID: ${battle.id}` };
    }

    // ── /maintenance on|off ───────────────────────────────
    if (cmd === "/maintenance") {
      const on = parts[1] === "on";
      await setSetting("MAINTENANCE_MODE", on ? "true" : "false", session.userId);
      return { ok: true, message: `✓ Maintenance-Mode: ${on ? "AN" : "AUS"}` };
    }

    // ── /announce "<text>" ────────────────────────────────
    if (cmd === "/announce") {
      const text = raw.replace(/^\/announce\s+/i, "").replace(/^"|"$/g, "");
      if (!text) return { ok: false, message: "Bitte Text angeben: /announce \"Deine Nachricht\"" };
      await setSetting("ANNOUNCE_BANNER", text, session.userId);
      const ids = await prisma.user.findMany({ where: { role: "student" }, select: { id: true } });
      pushToUsers(ids.map((u) => u.id), { title: "📢 Admin-Nachricht", body: text, url: "/app" }).catch(() => {});
      revalidatePath("/app");
      return { ok: true, message: `✓ Banner gesetzt & Push an ${ids.length} Schüler gesendet:\n"${text}"` };
    }

    // ── /clearbanner ──────────────────────────────────────
    if (cmd === "/clearbanner") {
      await deleteSetting("ANNOUNCE_BANNER");
      revalidatePath("/app");
      return { ok: true, message: "✓ Banner entfernt." };
    }

    // ── /givecoin <email> <n> ─────────────────────────────
    if (cmd === "/givecoin") {
      const email  = parts[1];
      const amount = Number(parts[2]);
      if (!email || !amount) return { ok: false, message: "Syntax: /givecoin email@schule.de 500" };
      const user = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true } });
      if (!user) return { ok: false, message: `Nutzer "${email}" nicht gefunden.` };
      await awardCoins(user.id, "admin_grant", amount);
      return { ok: true, message: `✓ ${amount} Münzen an ${user.name} (${email}) vergeben.` };
    }

    // ── /givexp <email> <n> ───────────────────────────────
    if (cmd === "/givexp") {
      const email  = parts[1];
      const amount = Number(parts[2]);
      if (!email || !amount) return { ok: false, message: "Syntax: /givexp email@schule.de 1000" };
      const user = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true } });
      if (!user) return { ok: false, message: `Nutzer "${email}" nicht gefunden.` };
      await prisma.user.update({ where: { id: user.id }, data: { xp: { increment: amount } } });
      await prisma.xpLog.create({ data: { userId: user.id, amount, reason: "admin_grant" } });
      return { ok: true, message: `✓ ${amount} XP an ${user.name} (${email}) vergeben.` };
    }

    // ── /ban <email> <grund> ──────────────────────────────
    if (cmd === "/ban") {
      const email  = parts[1];
      const reason = parts.slice(2).join(" ") || "Kein Grund angegeben";
      if (!email) return { ok: false, message: "Syntax: /ban email@schule.de Grund" };
      const user = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true } });
      if (!user) return { ok: false, message: `Nutzer "${email}" nicht gefunden.` };
      await prisma.session.deleteMany({ where: { userId: user.id } });
      await prisma.auditLog.create({ data: { schoolId: session.schoolId, actorId: session.userId, targetId: user.id, action: "ban", details: reason } });
      return { ok: true, message: `✓ ${user.name} gesperrt (alle Sessions gelöscht). Grund: ${reason}` };
    }

    // ── /unban <email> ────────────────────────────────────
    if (cmd === "/unban") {
      const email = parts[1];
      if (!email) return { ok: false, message: "Syntax: /unban email@schule.de" };
      const user = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true } });
      if (!user) return { ok: false, message: `Nutzer "${email}" nicht gefunden.` };
      await prisma.auditLog.create({ data: { schoolId: session.schoolId, actorId: session.userId, targetId: user.id, action: "unban", details: "Sperre aufgehoben" } });
      return { ok: true, message: `✓ Sperre für ${user.name} aufgehoben.` };
    }

    // ── /superadmin <email> ───────────────────────────────
    if (cmd === "/superadmin") {
      const email = parts[1];
      if (!email) return { ok: false, message: "Syntax: /superadmin email@schule.de" };
      const user = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true, isSuperAdmin: true } });
      if (!user) return { ok: false, message: `Nutzer "${email}" nicht gefunden.` };
      const newState = !user.isSuperAdmin;
      await prisma.user.update({ where: { id: user.id }, data: { isSuperAdmin: newState } });
      return { ok: true, message: `✓ ${user.name}: Super-Admin ${newState ? "aktiviert" : "deaktiviert"}.` };
    }

    return { ok: false, message: `Unbekannter Befehl: "${cmd}". Tippe /help.` };
  } catch (err) {
    logger.error("admin command failed", { cmd, error: String(err) });
    return { ok: false, message: `Fehler: ${String(err)}` };
  }
}

export async function spawnBossBattle(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "admin") return;

  const bossSlug    = String(formData.get("bossSlug") ?? "");
  const gradeLevel  = Number(formData.get("gradeLevel") ?? 10);
  const durationHours = Number(formData.get("durationHours") ?? 24);

  const template = BOSS_INDEX.find((b) => b.slug === bossSlug);
  if (!template) return;

  const safeTier = template.tier in BOSS_TIERS ? template.tier : "common";
  const tierData = BOSS_TIERS[safeTier];

  const startAt = new Date();
  const endAt   = new Date(startAt.getTime() + durationHours * 3_600_000);

  const battle = await prisma.bossBattle.create({
    data: {
      schoolId:     session.schoolId ?? null,
      name:         template.name,
      description:  template.description,
      lore:         template.lore,
      subject:      template.subject,
      gradeLevel,
      tier:         safeTier,
      maxHp:        tierData.hp,
      currentHp:    tierData.hp,
      difficulty:   "hard",
      coinReward:   tierData.coinReward,
      mvpCoinReward:tierData.mvpCoinReward,
      xpReward:     tierData.xpReward,
      icon:         template.icon,
      startAt,
      endAt,
      isActive:     true,
    },
  });

  // Notify students in this school (or all if no schoolId)
  const studentIds = await prisma.user.findMany({
    where: {
      role: "student",
      ...(session.schoolId ? { schoolId: session.schoolId } : {}),
    },
    select: { id: true },
  });

  const ids = studentIds.map((u) => u.id);
  if (ids.length > 0) {
    pushToUsers(ids, {
      title: `${template.icon} Neuer Boss spawnt!`,
      body:  `${tierData.label}-Boss "${template.name}" greift an! ${tierData.hp} HP — besiegt ihn gemeinsam!`,
      url:   "/app/boss",
    }).catch((err) => logger.warn("admin boss-spawn push failed", { error: String(err) }));
  }

  revalidatePath("/admin/gamification");
  revalidatePath("/app/boss");
}

export async function endBossBattle(battleId: string): Promise<void> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "admin") return;

  await prisma.bossBattle.update({
    where: { id: battleId },
    data: { isActive: false, currentHp: 0 },
  });

  revalidatePath("/admin/gamification");
  revalidatePath("/app/boss");
}

export async function createSeason(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "admin") return;

  const name        = String(formData.get("name") ?? "");
  const theme       = String(formData.get("theme") ?? "");
  const durationDays = Number(formData.get("durationDays") ?? 30);
  if (!name) return;

  const existing = await prisma.season.count({ where: { schoolId: session.schoolId ?? undefined } });
  const seasonNumber = existing + 1;

  const startAt = new Date();
  const endAt   = new Date(startAt.getTime() + durationDays * 86_400_000);

  await prisma.season.updateMany({
    where: { schoolId: session.schoolId ?? undefined },
    data:  { isActive: false },
  });

  await prisma.season.create({
    data: {
      schoolId: session.schoolId ?? null,
      name,
      number: seasonNumber,
      theme:  theme || null,
      startAt,
      endAt,
      isActive: true,
    },
  });

  revalidatePath("/admin/gamification");
  revalidatePath("/app/saison");
}

export async function awardWeeklyClassRankings(): Promise<void> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "admin") return;

  const schoolId = session.schoolId ?? "";

  const now        = new Date();
  const dayOfWeek  = now.getDay() === 0 ? 7 : now.getDay();
  const lastMonday = new Date(now.getTime() - (dayOfWeek - 1 + 7) * 86_400_000);
  lastMonday.setHours(0, 0, 0, 0);
  const lastSunday = new Date(lastMonday.getTime() + 7 * 86_400_000 - 1);

  const weekKey = lastMonday.toISOString().slice(0, 10);

  const alreadyAwarded = await prisma.coinLog.findFirst({
    where: { reason: "klasse_platz_1_woche", referenceId: `week-${weekKey}-${schoolId}` },
  });
  if (alreadyAwarded) return;

  const classes = await prisma.schoolClass.findMany({
    where: { schoolId },
    select: { id: true },
  });

  for (const cls of classes) {
    const xpLogs = await prisma.xpLog.groupBy({
      by: ["userId"],
      _sum: { amount: true },
      where: {
        user:      { classId: cls.id, role: "student" },
        createdAt: { gte: lastMonday, lte: lastSunday },
      },
      orderBy: { _sum: { amount: "desc" } },
      take: 1,
    });
    if (xpLogs.length === 0 || (xpLogs[0]._sum.amount ?? 0) === 0) continue;
    await awardCoins(xpLogs[0].userId, "klasse_platz_1_woche", undefined, `week-${weekKey}-${schoolId}`);
  }

  revalidatePath("/admin/gamification");
}
