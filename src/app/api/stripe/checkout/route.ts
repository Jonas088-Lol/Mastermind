/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { type NextRequest, NextResponse } from "next/server";
import { getSession, effectiveRole } from "@/lib/session";
import { getStripe, getCoinPack } from "@/lib/stripe";
import { prisma } from "@/lib/db/client";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { slug?: unknown };
  const slug = typeof body.slug === "string" ? body.slug : "";
  const pack = getCoinPack(slug);
  if (!pack) {
    return NextResponse.json({ error: "Invalid pack" }, { status: 400 });
  }

  const origin = req.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const checkoutSession = await getStripe().checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "eur",
          unit_amount: pack.priceEur,
          product_data: {
            name: pack.label,
            description: `${pack.coins} MasterMind-Münzen`,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      userId: session.userId,
      productSlug: slug,
      coinsAmount: String(pack.coins),
    },
    success_url: `${origin}/app/coins?payment=success`,
    cancel_url: `${origin}/app/coins`,
  });

  // Record pending order
  await prisma.stripeOrder.create({
    data: {
      userId: session.userId,
      sessionId: checkoutSession.id,
      productSlug: slug,
      amount: pack.priceEur,
      currency: "eur",
      status: "pending",
    },
  });

  return NextResponse.json({ url: checkoutSession.url });
}
