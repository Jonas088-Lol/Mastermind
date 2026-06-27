import { createMollieClient, type MollieClient, PaymentMethod } from "@mollie/api-client";

// ── Singleton client ───────────────────────────────────────────────────────

let _client: MollieClient | null = null;

export function getMollie(): MollieClient {
  if (!_client) {
    const key = process.env.MOLLIE_API_KEY;
    if (!key) throw new Error("MOLLIE_API_KEY is not configured");
    _client = createMollieClient({ apiKey: key });
  }
  return _client;
}

// ── Product catalogue ──────────────────────────────────────────────────────

export const COIN_PACKS = [
  { slug: "coins_100",  coins: 100,  bonusCoins: 0,    priceEur: "0.99",  label: "100 Münzen" },
  { slug: "coins_500",  coins: 500,  bonusCoins: 50,   priceEur: "3.99",  label: "500 Münzen" },
  { slug: "coins_2000", coins: 2000, bonusCoins: 300,  priceEur: "9.99",  label: "2.000 Münzen" },
  { slug: "coins_5000", coins: 5000, bonusCoins: 1000, priceEur: "19.99", label: "5.000 Münzen" },
] as const;

export type CoinPackSlug = (typeof COIN_PACKS)[number]["slug"];

export function getCoinPack(slug: string) {
  return COIN_PACKS.find((p) => p.slug === slug);
}

// Total coins including bonus
export function totalCoins(slug: string): number {
  const pack = getCoinPack(slug);
  if (!pack) return 0;
  return pack.coins + pack.bonusCoins;
}

// ── Supported payment methods ──────────────────────────────────────────────
// Mollie activates methods per account in the dashboard.
// We request these — Mollie shows only what's enabled + available for the buyer.

export const PAYMENT_METHODS: PaymentMethod[] = [
  PaymentMethod.creditcard,   // Visa, Mastercard, Amex
  PaymentMethod.paypal,
  PaymentMethod.applepay,
  // Google Pay is included automatically via creditcard wallet detection
  // and can also be enabled separately in the Mollie dashboard
];
