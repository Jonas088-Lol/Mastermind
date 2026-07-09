import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, ShoppingBag, TrendingUp } from "lucide-react";
import { CoinIcon } from "@/components/ui/CoinIcon";
import { prisma } from "@/lib/db/client";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";
import { COIN_REWARDS } from "@/lib/coins";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Münzen · MasterMind" };

const REASON_LABELS: Record<string, string> = {
  quiz_completed:      "Quiz abgeschlossen",
  aufgabe_abgabe:      "Aufgabe abgegeben",
  aufgabe_bewertet:    "Aufgabe bewertet",
  karteikarte_session: "Karteikarten-Session",
  note_geteilt:        "Notiz geteilt",
  quest_reward:        "Quest abgeschlossen",
  weekly_quest_bonus:  "Wochen-Quest Bonus",
  monthly_quest_bonus: "Monats-Quest Bonus",
  daily_login_reward:  "Tägliche Anmeldung",
  daily_streak_bonus:  "Streak-Bonus",
  boss_battle_reward:  "Boss-Battle Belohnung",
  boss_mvp_bonus:      "Boss-Battle MVP",
  duel_win:            "Duell gewonnen",
  duel_participate:    "Duell teilgenommen",
  achievement_unlock:  "Erfolg freigeschaltet",
  shop_purchase:       "Shop-Kauf",
  mollie_purchase:     "Münz-Kauf",
  stripe_purchase:     "Münz-Kauf (alt)",
};

function translateReason(reason: string): string {
  return REASON_LABELS[reason] ?? reason;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const EARN_WAYS = [
  { reason: "quiz_completed",      icon: "📝", label: "Quiz abschließen",      amount: COIN_REWARDS.quiz_completed },
  { reason: "daily_login_reward",  icon: "📅", label: "Täglich einloggen",     amount: COIN_REWARDS.daily_login_reward },
  { reason: "daily_streak_bonus",  icon: "🔥", label: "Streak-Bonus",          amount: COIN_REWARDS.daily_streak_bonus },
  { reason: "aufgabe_abgabe",      icon: "📋", label: "Aufgabe abgeben",       amount: COIN_REWARDS.aufgabe_abgabe },
  { reason: "karteikarte_session", icon: "🃏", label: "Karteikarten-Session",  amount: COIN_REWARDS.karteikarte_session },
  { reason: "quest_reward",        icon: "⚡", label: "Quest abschließen",     amount: COIN_REWARDS.quest_reward },
  { reason: "boss_battle_reward",  icon: "👾", label: "Boss besiegen",         amount: COIN_REWARDS.boss_battle_reward },
  { reason: "boss_mvp_bonus",      icon: "🏆", label: "Boss-Battle MVP",       amount: COIN_REWARDS.boss_mvp_bonus },
  { reason: "duel_win",            icon: "⚔️", label: "Duell gewinnen",        amount: COIN_REWARDS.duel_win },
  { reason: "achievement_unlock",  icon: "🎖️", label: "Erfolg freischalten",   amount: COIN_REWARDS.achievement_unlock },
  { reason: "weekly_quest_bonus",  icon: "📆", label: "Wochen-Quest",          amount: COIN_REWARDS.weekly_quest_bonus },
  { reason: "monthly_quest_bonus", icon: "🗓️", label: "Monats-Quest",          amount: COIN_REWARDS.monthly_quest_bonus },
  { reason: "lernpfad_completed",     icon: "📖", label: "Lernpfad abgeschlossen",  amount: COIN_REWARDS.lernpfad_completed },
  { reason: "streak_7_tage",          icon: "🔥", label: "7-Tage-Streak",           amount: COIN_REWARDS.streak_7_tage },
  { reason: "streak_30_tage",         icon: "🔥", label: "30-Tage-Streak",          amount: COIN_REWARDS.streak_30_tage },
  { reason: "vokabel_session",        icon: "🔤", label: "Vokabel-Session",         amount: COIN_REWARDS.vokabel_session },
  { reason: "quiz_perfect_score",     icon: "💯", label: "Quiz mit 100%",           amount: COIN_REWARDS.quiz_perfect_score },
  { reason: "heft_seite_erstellt",    icon: "📓", label: "Heft-Seite erstellt",     amount: COIN_REWARDS.heft_seite_erstellt },
  { reason: "freund_eingeladen",      icon: "👥", label: "Freund eingeladen",       amount: COIN_REWARDS.freund_eingeladen },
  { reason: "klasse_platz_1_woche",   icon: "🥇", label: "Platz 1 Klassen-Ranking",amount: COIN_REWARDS.klasse_platz_1_woche },
  { reason: "note_geteilt",           icon: "📝", label: "Notiz teilen",            amount: COIN_REWARDS.note_geteilt },
  { reason: "aufgabe_bewertet",       icon: "✅", label: "Aufgabe bewertet",        amount: COIN_REWARDS.aufgabe_bewertet },
  { reason: "duel_participate",       icon: "⚔️", label: "An Duell teilnehmen",     amount: COIN_REWARDS.duel_participate },
  { reason: "profil_foto_gesetzt",    icon: "🖼️", label: "Profilfoto hochladen",    amount: COIN_REWARDS.profil_foto_gesetzt },
  { reason: "erste_aufgabe_semester", icon: "🎯", label: "Erste Aufgabe im Semester",amount: COIN_REWARDS.erste_aufgabe_semester },
] as const;

export default async function CoinsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect(ROLE_HOME[effectiveRole(session)]);

  const userId = session.userId;

  const [user, coinLogs] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { coins: true },
    }),
    prisma.coinLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  const balance = user?.coins ?? 0;
  const totalEarned = coinLogs.filter((l) => l.amount > 0).reduce((s, l) => s + l.amount, 0);
  const totalSpent = coinLogs.filter((l) => l.amount < 0).reduce((s, l) => s + Math.abs(l.amount), 0);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      {/* Header */}
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Gamification</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Münzen</h1>
          <p className="mt-1 text-sm text-muted-fg">
            Verdiene und verwalte deine Münzen
          </p>
        </div>
        <TrendingUp className="size-10 text-warning opacity-20" strokeWidth={1} />
      </header>

      {/* Balance Card */}
      <div className="border border-warning/30 bg-warning/3 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <CoinIcon className="size-12 text-warning" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-fg">Kontostand</p>
              <p className="mt-0.5 text-4xl font-bold tabular-nums">
                {balance.toLocaleString("de-DE")}
              </p>
              <p className="mt-0.5 text-sm text-muted-fg">Münzen verfügbar</p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-1.5">
                <ArrowDownLeft className="size-4 text-success" />
                <span className="text-muted-fg">Einnahmen</span>
                <span className="font-semibold text-success">+{totalEarned.toLocaleString("de-DE")}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ArrowUpRight className="size-4 text-danger" />
                <span className="text-muted-fg">Ausgaben</span>
                <span className="font-semibold text-danger">-{totalSpent.toLocaleString("de-DE")}</span>
              </div>
            </div>
            <Link
              href="/app/shop"
              className="inline-flex items-center gap-2 rounded bg-warning/20 px-4 py-2 text-sm font-semibold text-warning transition-opacity hover:opacity-80"
            >
              <ShoppingBag className="size-4" />
              Im Shop ausgeben
            </Link>
          </div>
        </div>
      </div>

      {/* How to Earn */}
      <section>
        <div className="mb-3">
          <h2 className="text-lg font-bold">So verdienst du Münzen</h2>
          <p className="text-xs text-muted-fg">Alle Möglichkeiten, dein Konto aufzufüllen</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {EARN_WAYS.map(({ icon, label, amount }) => (
            <div key={label} className="flex items-center gap-3 rounded-2xl border border-border bg-bg px-3 py-2.5">
              <span className="shrink-0 text-lg leading-none">{icon}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium">{label}</p>
                <p className="mt-0.5 flex items-center gap-1 text-xs font-bold text-warning">+{amount} <CoinIcon className="size-3" /></p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Transaction History */}
      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <div>
            <h2 className="text-lg font-bold">Transaktionen</h2>
            <p className="text-xs text-muted-fg">Letzte 50 Einträge</p>
          </div>
          {coinLogs.length > 0 && (
            <span className="font-mono text-sm text-muted-fg">{coinLogs.length} Einträge</span>
          )}
        </div>

        {coinLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 border border-dashed border-border py-12 text-center">
            <CoinIcon className="size-10 text-warning opacity-30" />
            <div>
              <p className="font-semibold text-muted-fg">Noch keine Transaktionen</p>
              <p className="mt-1 text-sm text-muted-fg/70">
                Absolviere Quizze, Quests und mehr, um Münzen zu verdienen.
              </p>
            </div>
          </div>
        ) : (
          <div className="border border-border">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 border-b border-border bg-surface-2 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-fg">
              <span>Grund</span>
              <span className="text-right">Betrag</span>
              <span className="text-right">Datum</span>
            </div>
            {/* Rows */}
            <div className="divide-y divide-border">
              {coinLogs.map((log) => {
                const isPositive = log.amount >= 0;
                return (
                  <div
                    key={log.id}
                    className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 px-4 py-3 hover:bg-surface-2/50"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {isPositive ? (
                        <ArrowDownLeft className="size-3.5 shrink-0 text-success" />
                      ) : (
                        <ArrowUpRight className="size-3.5 shrink-0 text-danger" />
                      )}
                      <span className="truncate text-sm">{translateReason(log.reason)}</span>
                    </div>
                    <span
                      className={cn(
                        "whitespace-nowrap font-mono text-sm font-semibold tabular-nums",
                        isPositive ? "text-success" : "text-danger",
                      )}
                    >
                      <span className="inline-flex items-center gap-1">{isPositive ? "+" : ""}{log.amount.toLocaleString("de-DE")} <CoinIcon className="size-3.5 align-middle" /></span>
                    </span>
                    <span className="whitespace-nowrap text-right text-xs text-muted-fg">
                      {formatDate(log.createdAt)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
