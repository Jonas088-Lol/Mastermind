"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { BOSS_INDEX, BOSS_TIERS, BOSS_GRADES, randomBossTier, type BossTier } from "@/lib/game";
import { awardCoins } from "@/lib/coins";
import { pushToUsers } from "@/lib/push";
import { logger } from "@/lib/logger";
import { setSetting, deleteSetting } from "@/lib/settings";

function isSuperAdmin(session: Awaited<ReturnType<typeof getSession>>) {
  if (!session) return false;
  return effectiveRole(session) === "super" || session.isSuperAdmin === true;
}

export async function spawnGlobalBoss(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!isSuperAdmin(session)) return;

  const bossSlug     = String(formData.get("bossSlug") ?? "");
  const gradeLevel   = Number(formData.get("gradeLevel") ?? 10);
  const durationHours = Number(formData.get("durationHours") ?? 24);

  const template = BOSS_INDEX.find((b) => b.slug === bossSlug);
  if (!template) return;

  const tierData = BOSS_TIERS[template.tier];
  const startAt  = new Date();
  const endAt    = new Date(startAt.getTime() + durationHours * 3_600_000);

  await prisma.bossBattle.create({
    data: {
      schoolId:      null, // global — visible to all students
      name:          template.name,
      description:   template.description,
      lore:          template.lore,
      subject:       template.subject,
      gradeLevel,
      tier:          template.tier,
      maxHp:         tierData.hp,
      currentHp:     tierData.hp,
      difficulty:    "hard",
      coinReward:    tierData.coinReward,
      mvpCoinReward: tierData.mvpCoinReward,
      xpReward:      tierData.xpReward,
      icon:          template.icon,
      startAt,
      endAt,
      isActive:      true,
    },
  });

  // Notify all students globally
  const ids = await prisma.user.findMany({ where: { role: "student" }, select: { id: true } });
  pushToUsers(ids.map((u) => u.id), {
    title: `${template.icon} Neuer Boss erscheint!`,
    body:  `${tierData.label}-Boss "${template.name}" greift an! ${tierData.hp} HP — besiegt ihn gemeinsam!`,
    url:   "/app/boss",
  }).catch((err) => logger.warn("boss-spawn push failed", { error: String(err) }));

  revalidatePath("/plattform/gamification");
  revalidatePath("/app/boss");
}

export async function endGlobalBoss(battleId: string): Promise<void> {
  const session = await getSession();
  if (!isSuperAdmin(session)) return;

  await prisma.bossBattle.update({
    where: { id: battleId },
    data: { isActive: false, currentHp: 0 },
  });

  revalidatePath("/plattform/gamification");
  revalidatePath("/app/boss");
}

export async function runSuperAdminCommand(raw: string): Promise<{ ok: boolean; message: string }> {
  const session = await getSession();
  if (!isSuperAdmin(session)) return { ok: false, message: "Nicht autorisiert." };

  const parts = raw.trim().split(/\s+/);
  const cmd   = parts[0]?.toLowerCase();

  try {
    if (cmd === "/doublex") {
      const h     = Math.max(1, Math.min(168, Number(parts[1]) || 2));
      const until = new Date(Date.now() + h * 3_600_000);
      await setSetting("EVENT_DOUBLE_XP_UNTIL", until.toISOString(), session!.userId);
      revalidatePath("/app");
      return { ok: true, message: `✓ Doppel-XP aktiv bis ${until.toLocaleString("de-DE")} (${h}h)` };
    }

    if (cmd === "/doublec") {
      const h     = Math.max(1, Math.min(168, Number(parts[1]) || 2));
      const until = new Date(Date.now() + h * 3_600_000);
      await setSetting("EVENT_DOUBLE_COINS_UNTIL", until.toISOString(), session!.userId);
      revalidatePath("/app");
      return { ok: true, message: `✓ Doppel-Coins aktiv bis ${until.toLocaleString("de-DE")} (${h}h)` };
    }

    if (cmd === "/event" && parts[1] === "stop") {
      await Promise.all([
        deleteSetting("EVENT_DOUBLE_XP_UNTIL"),
        deleteSetting("EVENT_DOUBLE_COINS_UNTIL"),
      ]);
      revalidatePath("/app");
      return { ok: true, message: "✓ Alle globalen Events gestoppt." };
    }

    if (cmd === "/bossrush") {
      const tier     = randomBossTier();
      const tierData = BOSS_TIERS[tier];
      const pool     = BOSS_INDEX.filter((b) => b.tier === tier);
      const template = pool[Math.floor(Math.random() * pool.length)] ?? BOSS_INDEX[0];
      const grade    = BOSS_GRADES[Math.floor(Math.random() * BOSS_GRADES.length)];
      const now      = new Date();
      const battle = await prisma.bossBattle.create({
        data: {
          schoolId: null,
          name: template.name, description: template.description, lore: template.lore,
          subject: template.subject, gradeLevel: grade, tier,
          maxHp: tierData.hp, currentHp: tierData.hp, difficulty: "hard",
          coinReward: tierData.coinReward, mvpCoinReward: tierData.mvpCoinReward, xpReward: tierData.xpReward,
          icon: template.icon, startAt: now, endAt: new Date(now.getTime() + 12 * 3_600_000), isActive: true,
        },
      });
      const ids = await prisma.user.findMany({ where: { role: "student" }, select: { id: true } });
      pushToUsers(ids.map((u) => u.id), {
        title: `${template.icon} Boss-Rush!`,
        body: `${tierData.label}-Boss "${template.name}" spawnt jetzt!`,
        url: "/app/boss",
      }).catch(() => {});
      revalidatePath("/plattform/gamification");
      revalidatePath("/app/boss");
      return { ok: true, message: `✓ Boss-Rush: "${template.name}" (${tierData.label}) spawnt! ID: ${battle.id}` };
    }

    if (cmd === "/maintenance") {
      const on = parts[1] === "on";
      await setSetting("MAINTENANCE_MODE", on ? "true" : "false", session!.userId);
      return { ok: true, message: `✓ Maintenance-Mode: ${on ? "AN" : "AUS"}` };
    }

    if (cmd === "/announce") {
      const text = raw.replace(/^\/announce\s+/i, "").replace(/^"|"$/g, "");
      if (!text) return { ok: false, message: 'Syntax: /announce "Deine Nachricht"' };
      await setSetting("ANNOUNCE_BANNER", text, session!.userId);
      const ids = await prisma.user.findMany({ where: { role: "student" }, select: { id: true } });
      pushToUsers(ids.map((u) => u.id), { title: "📢 Plattform-Nachricht", body: text, url: "/app" }).catch(() => {});
      revalidatePath("/app");
      return { ok: true, message: `✓ Banner gesetzt & Push an ${ids.length} Nutzer:\n"${text}"` };
    }

    if (cmd === "/clearbanner") {
      await deleteSetting("ANNOUNCE_BANNER");
      revalidatePath("/app");
      return { ok: true, message: "✓ Banner entfernt." };
    }

    if (cmd === "/givecoin") {
      const [, email, amtStr] = parts;
      const amount = Number(amtStr);
      if (!email || !amount) return { ok: false, message: "Syntax: /givecoin email@schule.de 500" };
      const user = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true } });
      if (!user) return { ok: false, message: `Nutzer "${email}" nicht gefunden.` };
      await awardCoins(user.id, "admin_grant", amount);
      return { ok: true, message: `✓ ${amount} Münzen an ${user.name} (${email}) vergeben.` };
    }

    if (cmd === "/givexp") {
      const [, email, amtStr] = parts;
      const amount = Number(amtStr);
      if (!email || !amount) return { ok: false, message: "Syntax: /givexp email@schule.de 1000" };
      const user = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true } });
      if (!user) return { ok: false, message: `Nutzer "${email}" nicht gefunden.` };
      await prisma.user.update({ where: { id: user.id }, data: { xp: { increment: amount } } });
      await prisma.xpLog.create({ data: { userId: user.id, amount, reason: "admin_grant" } });
      return { ok: true, message: `✓ ${amount} XP an ${user.name} (${email}) vergeben.` };
    }

    if (cmd === "/ban") {
      const email  = parts[1];
      const reason = parts.slice(2).join(" ") || "Kein Grund angegeben";
      if (!email) return { ok: false, message: "Syntax: /ban email@schule.de Grund" };
      const user = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true } });
      if (!user) return { ok: false, message: `Nutzer "${email}" nicht gefunden.` };
      await prisma.session.deleteMany({ where: { userId: user.id } });
      await prisma.auditLog.create({ data: { actorId: session!.userId, targetId: user.id, action: "ban", details: reason } });
      return { ok: true, message: `✓ ${user.name} gesperrt. Grund: ${reason}` };
    }

    if (cmd === "/unban") {
      const email = parts[1];
      if (!email) return { ok: false, message: "Syntax: /unban email@schule.de" };
      const user = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true } });
      if (!user) return { ok: false, message: `Nutzer "${email}" nicht gefunden.` };
      await prisma.auditLog.create({ data: { actorId: session!.userId, targetId: user.id, action: "unban", details: "Sperre aufgehoben" } });
      return { ok: true, message: `✓ Sperre für ${user.name} aufgehoben.` };
    }

    if (cmd === "/superadmin") {
      const email = parts[1];
      if (!email) return { ok: false, message: "Syntax: /superadmin email@schule.de" };
      const user = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true, isSuperAdmin: true } });
      if (!user) return { ok: false, message: `Nutzer "${email}" nicht gefunden.` };
      const newState = !user.isSuperAdmin;
      await prisma.user.update({ where: { id: user.id }, data: { isSuperAdmin: newState } });
      return { ok: true, message: `✓ ${user.name}: Super-Admin ${newState ? "aktiviert" : "deaktiviert"}.` };
    }

    if (cmd === "/help") {
      return {
        ok: true,
        message: [
          "📋 Verfügbare Befehle:",
          "/doublex <h>     — Doppel-XP für h Stunden",
          "/doublec <h>     — Doppel-Coins für h Stunden",
          "/event stop      — Alle Events stoppen",
          "/bossrush        — Zufälligen Boss spawnen (12h)",
          "/announce <text> — Banner + Push an alle",
          "/clearbanner     — Banner entfernen",
          "/maintenance on|off — Wartungsmodus",
          "/givecoin <email> <n> — Münzen vergeben",
          "/givexp <email> <n>   — XP vergeben",
          "/ban <email> <grund>  — Nutzer sperren",
          "/unban <email>        — Sperre aufheben",
          "/superadmin <email>   — Super-Admin toggle",
        ].join("\n"),
      };
    }

    return { ok: false, message: `Unbekannter Befehl: "${cmd}". Tippe /help.` };
  } catch (err) {
    logger.error("super admin command failed", { cmd, error: String(err) });
    return { ok: false, message: `Fehler: ${String(err)}` };
  }
}
