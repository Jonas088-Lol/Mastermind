import { type NextRequest, NextResponse } from "next/server";
import { getMollie } from "@/lib/mollie";
import { prisma } from "@/lib/db/client";
import { awardCoins } from "@/lib/coins";

// Mollie posts a form-encoded body with a single "id" field
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let mollieId: string | null = null;

  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const text = await req.text();
    mollieId = new URLSearchParams(text).get("id");
  } else {
    // Some integrations send JSON
    const body = await req.json().catch(() => ({})) as { id?: string };
    mollieId = body.id ?? null;
  }

  if (!mollieId) {
    return NextResponse.json({ error: "Missing payment id" }, { status: 400 });
  }

  // Fetch current payment status from Mollie (never trust the webhook body alone)
  let payment;
  try {
    payment = await getMollie().payments.get(mollieId);
  } catch {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  const order = await prisma.mollieOrder.findUnique({ where: { mollieId } });
  if (!order) {
    // Could be a payment we don't know about — return 200 so Mollie doesn't retry
    return NextResponse.json({ received: true });
  }

  const newStatus = payment.status; // "paid" | "failed" | "canceled" | "expired" | ...

  // Only act on status changes — idempotent guard
  if (order.status === newStatus) {
    return NextResponse.json({ received: true });
  }

  await prisma.mollieOrder.update({
    where: { mollieId },
    data: {
      status: newStatus,
      method: payment.method ?? null,
      paidAt: newStatus === "paid" ? new Date() : undefined,
    },
  });

  if (newStatus === "paid" && order.status !== "paid") {
    await awardCoins(
      order.userId,
      "mollie_purchase",
      order.coinsAwarded,
      mollieId
    );
  }

  return NextResponse.json({ received: true });
}
