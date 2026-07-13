/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";
import { BossCompendiumWrapper, type BossEntry } from "./BossCompendiumWrapper";

export const metadata: Metadata = { title: "Boss-Kompendium · MasterMind" };
export const dynamic = "force-dynamic";

export default async function BossKompendiumPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect(ROLE_HOME[effectiveRole(session)]);

  // Persönliche Boss-Historie: alle Kämpfe, an denen der Schüler teilgenommen hat.
  const participations = await prisma.bossParticipant.findMany({
    where: { userId: session.userId },
    select: {
      damage: true,
      correctAnswers: true,
      isMvp: true,
      firstBlood: true,
      lastHit: true,
      battle: {
        select: {
          name: true,
          icon: true,
          tier: true,
          subject: true,
          currentHp: true,
          killedByUserId: true,
          createdByUserId: true,
        },
      },
    },
  });

  // Nach Boss-Identität (Name) gruppieren — derselbe Boss mehrfach → ein Eintrag mit ×N.
  const map = new Map<string, BossEntry>();
  for (const p of participations) {
    const b = p.battle;
    if (!b) continue;
    const key = b.name.trim().toLowerCase();
    const defeated = b.killedByUserId != null || b.currentHp <= 0;
    const isTeacher = b.createdByUserId != null;

    let e = map.get(key);
    if (!e) {
      e = {
        key, name: b.name, icon: b.icon, tier: b.tier, subject: b.subject,
        encounters: 0, kills: 0, totalDamage: 0, bestDamage: 0,
        correctAnswers: 0, mvpCount: 0, firstBloods: 0, lastHits: 0, isTeacher: false,
      };
      map.set(key, e);
    }
    e.encounters += 1;
    if (defeated) e.kills += 1;
    e.totalDamage += p.damage;
    e.bestDamage = Math.max(e.bestDamage, p.damage);
    e.correctAnswers += p.correctAnswers;
    if (p.isMvp) e.mvpCount += 1;
    if (p.firstBlood) e.firstBloods += 1;
    if (p.lastHit) e.lastHits += 1;
    if (isTeacher) e.isTeacher = true;
  }

  // Anzeigen: besiegte Bosse ODER Lehrer-Bosse (letztere immer, sobald man mitgekämpft hat).
  const entries = [...map.values()]
    .filter((e) => e.kills > 0 || e.isTeacher)
    .sort((a, b) =>
      Number(b.isTeacher) - Number(a.isTeacher) ||
      b.kills - a.kills ||
      b.totalDamage - a.totalDamage
    );

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <BossCompendiumWrapper entries={entries} />
    </div>
  );
}
