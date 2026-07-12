/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { type NextRequest, NextResponse } from "next/server";
import { getMollie } from "@/lib/mollie";
import { prisma } from "@/lib/db/client";
import { awardCoins } from "@/lib/coins";

// Mollie redirects the buyer back here after checkout (success OR cancel).
// The webhook is the authoritative signal — this is a UX fallback that also
// handles edge cases where the webhook hasn't fired yet.

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  // Mollie appends ?id=tr_xxxx to the redirectUrl when redirecting back
  const mollieId = searchParams.get("id");
  const origin = req.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "";

  if (!mollieId) {
    // No id means user hit back/cancel without a payment being created
    return NextResponse.redirect(`${new URL(req.url).origin}/app/coins?payment=cancelled`);
  }

  try {
    const payment = await getMollie().payments.get(mollieId);
    const status = payment.status;

    // Upsert order row (may already exist from checkout route)
    const order = await prisma.mollieOrder.findUnique({ where: { mollieId } });

    if (order && status === "paid" && order.status !== "paid") {
      // Webhook hasn't arrived yet — fulfil immediately so user doesn't wait.
      // Atomarer Übergang (updateMany + Status-Guard) verhindert Doppel-
      // Gutschrift, wenn der Webhook zeitgleich eintrifft.
      const res = await prisma.mollieOrder.updateMany({
        where: { mollieId, status: { not: "paid" } },
        data: { status: "paid", method: payment.method ?? null, paidAt: new Date() },
      });
      if (res.count === 1) {
        await awardCoins(order.userId, "mollie_purchase", order.coinsAwarded, mollieId);
      }
    } else if (order && status !== order.status) {
      await prisma.mollieOrder.updateMany({
        where: { mollieId, status: { not: "paid" } },
        data: { status, method: payment.method ?? null },
      });
    }

    const destination = new URL(req.url).origin;
    if (status === "paid") {
      return NextResponse.redirect(`${destination}/app/coins?payment=success`);
    } else if (status === "canceled" || status === "expired" || status === "failed") {
      return NextResponse.redirect(`${destination}/app/coins?payment=cancelled`);
    } else {
      // pending / open — webhook will complete it
      return NextResponse.redirect(`${destination}/app/coins?payment=pending`);
    }
  } catch {
    return NextResponse.redirect(`${new URL(req.url).origin}/app/coins`);
  }
}
