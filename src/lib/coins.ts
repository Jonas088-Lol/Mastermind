import { prisma } from "@/lib/db/client";

export const COIN_REWARDS = {
  quiz_completed:      5,
  aufgabe_abgabe:     10,
  aufgabe_bewertet:    5,
  karteikarte_session: 2,
  note_geteilt:        3,
  quest_reward:       15,
  weekly_quest_bonus: 30,
  monthly_quest_bonus:75,
  daily_login_reward:  5,
  daily_streak_bonus: 10,
  boss_battle_reward: 25,
  boss_mvp_bonus:     50,
  duel_win:           20,
  duel_participate:    5,
  achievement_unlock: 10,
  lernpfad_completed:       30,
  heft_seite_erstellt:       3,
  streak_7_tage:            50,
  streak_30_tage:          150,
  vokabel_session:           3,
  quiz_perfect_score:       15,
  erste_aufgabe_semester:   10,
  freund_eingeladen:        25,
  profil_foto_gesetzt:       5,
  klasse_platz_1_woche:     40,
} as const;

export type CoinReason = keyof typeof COIN_REWARDS;

export async function awardCoins(
  userId: string,
  reason: CoinReason | string,
  amount?: number,
  referenceId?: string,
): Promise<void> {
  const finalAmount = amount ?? (COIN_REWARDS[reason as CoinReason] ?? 0);
  if (finalAmount <= 0) return;

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { coins: { increment: finalAmount } } }),
    prisma.coinLog.create({ data: { userId, amount: finalAmount, reason, referenceId } }),
  ]);
}

export async function spendCoins(
  userId: string,
  amount: number,
  reason: string,
  referenceId?: string,
): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { coins: true } });
  if (!user || user.coins < amount) return false;

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { coins: { decrement: amount } } }),
    prisma.coinLog.create({ data: { userId, amount: -amount, reason, referenceId } }),
  ]);
  return true;
}

export async function getBalance(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { coins: true } });
  return user?.coins ?? 0;
}
