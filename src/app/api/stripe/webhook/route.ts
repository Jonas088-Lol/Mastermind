/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { type NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/db/client";
import { awardCoins } from "@/lib/coins";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature") ?? "";
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[stripe/webhook] STRIPE_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  let event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Webhook signature invalid" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const { userId, productSlug, coinsAmount } = session.metadata ?? {};

    if (!userId || !coinsAmount) {
      return NextResponse.json({ error: "Missing metadata" }, { status: 400 });
    }

    const coins = Number(coinsAmount);

    await prisma.$transaction([
      prisma.stripeOrder.updateMany({
        where: { sessionId: session.id },
        data: { status: "completed", completedAt: new Date() },
      }),
    ]);

    await awardCoins(userId, "stripe_purchase", coins, session.id);
  }

  return NextResponse.json({ received: true });
}
