import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getLeaderboard, type LeaderboardScope } from "@/lib/leaderboard";
import { prisma } from "@/lib/db/client";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const scope = (req.nextUrl.searchParams.get("scope") ?? "national") as LeaderboardScope;
  if (!["national", "bundesland", "landkreis"].includes(scope)) {
    return NextResponse.json({ error: "Invalid scope" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where:  { id: session.userId },
    select: { bundeslandCode: true, landkreisId: true, leaderboardOptIn: true },
  });

  const result = await getLeaderboard(
    scope,
    user?.bundeslandCode ?? null,
    user?.landkreisId    ?? null,
    session.userId,
  );

  if (!result) {
    return NextResponse.json({ error: "Leaderboard unavailable (no Redis)" }, { status: 503 });
  }

  return NextResponse.json(result);
}
