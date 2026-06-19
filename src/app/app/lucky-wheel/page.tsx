import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";
import { LuckyWheelClient } from "./LuckyWheelClient";
import { prisma } from "@/lib/db/client";

export const metadata: Metadata = { title: "Glücksrad · MasterMind" };

export default async function LuckyWheelPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect(ROLE_HOME[effectiveRole(session)]);

  // Check if already spun today
  const todayStr = new Date().toISOString().slice(0, 10);
  const lastSpin = await prisma.coinLog.findFirst({
    where: { userId: session.userId, reason: "lucky_wheel", createdAt: { gte: new Date(todayStr) } },
    orderBy: { createdAt: "desc" },
  });

  const alreadySpun = !!lastSpin;

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-8 py-4">
      <header className="w-full">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Gamification</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Glücksrad</h1>
        <p className="mt-1 text-sm text-muted-fg">Einmal täglich drehen für Coins, XP oder Boosts</p>
      </header>
      <LuckyWheelClient alreadySpun={alreadySpun} userId={session.userId} />
    </div>
  );
}
