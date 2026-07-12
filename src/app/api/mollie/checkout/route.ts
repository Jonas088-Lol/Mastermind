/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { type NextRequest, NextResponse } from "next/server";
import { getSession, effectiveRole } from "@/lib/session";
import { getMollie, getCoinPack, totalCoins, PAYMENT_METHODS } from "@/lib/mollie";
import { prisma } from "@/lib/db/client";
import type { Payment } from "@mollie/api-client";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await req.json() as { slug: string };
  const pack = getCoinPack(slug);
  if (!pack) {
    return NextResponse.json({ error: "Ungültiges Paket" }, { status: 400 });
  }

  const origin = req.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const coins = totalCoins(slug);

  // `method` accepts a single method or an array — we pass an array to show a
  // pre-filtered method selection screen (Mollie only shows what's enabled in your account).
  const payment: Payment = await getMollie().payments.create({
    amount: { currency: "EUR", value: pack.priceEur },
    description: `MasterMind · ${pack.label} (${coins} Münzen)`,
    redirectUrl: `${origin}/api/mollie/return`,
    webhookUrl: `${process.env.MOLLIE_WEBHOOK_BASE_URL ?? origin}/api/mollie/webhook`,
    method: PAYMENT_METHODS,
    metadata: {
      userId: session.userId,
      productSlug: slug,
      coinsAwarded: String(coins),
    },
  });

  // Persist pending order immediately so the webhook can look it up
  await prisma.mollieOrder.create({
    data: {
      userId: session.userId,
      mollieId: payment.id,
      productSlug: slug,
      coinsAwarded: coins,
      amountEur: pack.priceEur,
      status: "open",
    },
  });

  // Checkout URL lives in _links.checkout.href
  const checkoutUrl = payment._links.checkout?.href;
  if (!checkoutUrl) {
    return NextResponse.json({ error: "Kein Checkout-Link erhalten" }, { status: 500 });
  }

  return NextResponse.json({ url: checkoutUrl });
}
