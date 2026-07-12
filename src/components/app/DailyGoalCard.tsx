/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Target, Medal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { claimDaily, claimWeekly } from "@/app/app/ziele-claim/actions";

type GoalProps = {
  targetXp: number;
  earnedXp: number;
  reached: boolean;
  claimed: boolean;
};

export function DailyGoalCard({
  daily,
  weekly,
  dailyReward,
  weeklyReward,
}: {
  daily: GoalProps;
  weekly: GoalProps;
  dailyReward: number;
  weeklyReward: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleClaim = (which: "daily" | "weekly") => {
    startTransition(async () => {
      if (which === "daily") await claimDaily();
      else await claimWeekly();
      router.refresh();
    });
  };

  const allDone = daily.claimed && weekly.claimed;

  return (
    <Card
      className={cn(
        "rounded-2xl shadow-sm",
        allDone && "border-success/40 bg-gradient-to-br from-success/6 to-transparent",
      )}
    >
      <CardBody className="p-5!">
        <div className="flex items-center gap-2">
          <Target className="size-4 text-brand" strokeWidth={1.75} />
          <p className="text-xs font-semibold uppercase tracking-wider text-brand">Lernziele</p>
        </div>

        <div className="mt-4 space-y-5">
          <GoalRow
            icon={<Target className="size-3.5" />}
            label="Heute"
            goal={daily}
            reward={dailyReward}
            onClaim={() => handleClaim("daily")}
            isPending={isPending}
          />
          <GoalRow
            icon={<Medal className="size-3.5" />}
            label="Diese Woche"
            goal={weekly}
            reward={weeklyReward}
            onClaim={() => handleClaim("weekly")}
            isPending={isPending}
          />
        </div>
      </CardBody>
    </Card>
  );
}

function GoalRow({
  icon,
  label,
  goal,
  reward,
  onClaim,
  isPending,
}: {
  icon: React.ReactNode;
  label: string;
  goal: GoalProps;
  reward: number;
  onClaim: () => void;
  isPending: boolean;
}) {
  const done = goal.reached && goal.claimed;
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <span className={cn("flex items-center gap-1.5 text-sm font-medium", done ? "text-success" : "text-fg")}>
          {icon}
          {label}
          {done && <span className="text-xs">✓</span>}
        </span>
        <span className="font-mono text-sm font-bold">
          {Math.min(goal.earnedXp, goal.targetXp)}
          <span className="font-normal text-muted-fg"> / {goal.targetXp} XP</span>
        </span>
      </div>
      <Progress
        value={Math.min(100, (goal.earnedXp / goal.targetXp) * 100)}
        tone={goal.reached ? "success" : "brand"}
        className="mt-2"
      />
      {goal.reached && !goal.claimed ? (
        <Button
          size="sm"
          className="mt-2.5 w-full"
          disabled={isPending}
          onClick={onClaim}
        >
          {isPending ? "Wird eingelöst…" : `+${reward} Münzen abholen`}
        </Button>
      ) : (
        <p className="mt-1.5 text-xs text-muted-fg">
          {done
            ? `Belohnung abgeholt (+${reward} Münzen)`
            : `Noch ${Math.max(0, goal.targetXp - goal.earnedXp)} XP bis zur Belohnung (+${reward} Münzen)`}
        </p>
      )}
    </div>
  );
}
