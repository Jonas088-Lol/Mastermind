import { prisma } from "@/lib/db/client";
import { getActiveEvents } from "@/lib/settings";
import { Zap, Users, School, Swords, AlertTriangle } from "lucide-react";

export default async function SuperAdminDashboard() {
  const [totalUsers, totalSchools, activeEvents, activeBosses] = await Promise.all([
    prisma.user.count(),
    prisma.school.count(),
    getActiveEvents(),
    prisma.bossBattle.count({ where: { isActive: true, currentHp: { gt: 0 } } }),
  ]);

  const studentCount = await prisma.user.count({ where: { role: "student" } });

  const stats = [
    { label: "Gesamt-Nutzer",  value: totalUsers,    icon: Users,   color: "text-blue-400" },
    { label: "Schüler",        value: studentCount,  icon: Users,   color: "text-green-400" },
    { label: "Schulen",        value: totalSchools,  icon: School,  color: "text-purple-400" },
    { label: "Aktive Bosses",  value: activeBosses,  icon: Swords,  color: "text-red-400" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-white">Super Admin Dashboard</h1>
        <p className="mt-1 text-sm text-white/40">Vollzugriff auf alle Schulen und Nutzer</p>
      </div>

      {/* Active events */}
      {(activeEvents.doubleXp || activeEvents.doubleCoins || activeEvents.maintenance) && (
        <div className="rounded-xl border border-yellow-400/30 bg-yellow-400/5 p-4 flex items-center gap-3">
          <AlertTriangle className="size-4 text-yellow-400 shrink-0" />
          <div className="text-sm text-yellow-300">
            <span className="font-bold">Aktive Events: </span>
            {activeEvents.doubleXp && <span>Doppel-XP bis {activeEvents.doubleXpUntil?.toLocaleString("de-DE")} · </span>}
            {activeEvents.doubleCoins && <span>Doppel-Coins bis {activeEvents.doubleCoinsUntil?.toLocaleString("de-DE")} · </span>}
            {activeEvents.maintenance && <span>MAINTENANCE MODE AN</span>}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-xl border border-white/10 bg-white/5 p-5">
              <Icon className={`size-5 ${s.color}`} />
              <p className="mt-3 text-3xl font-black">{s.value.toLocaleString("de-DE")}</p>
              <p className="mt-1 text-xs text-white/40">{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* Quick terminal hint */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="size-4 text-green-400" />
          <p className="text-sm font-bold text-green-400">Schnellbefehle (→ Terminal)</p>
        </div>
        <div className="grid grid-cols-2 gap-2 font-mono text-xs text-white/50">
          {[
            "/doublex 2      — 2h Doppel-XP",
            "/doublec 4      — 4h Doppel-Coins",
            "/bossrush       — Boss sofort spawnen",
            "/givecoin email 500 — Coins vergeben",
            "/announce \"...\" — Push an alle",
            "/superadmin email — Super-Admin machen",
          ].map((cmd) => (
            <div key={cmd} className="rounded-lg bg-black/30 px-3 py-2">{cmd}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
