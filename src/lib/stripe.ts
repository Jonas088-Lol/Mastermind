import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
    _stripe = new Stripe(key);
  }
  return _stripe;
}

export const COIN_PACKS = [
  { slug: "coins_100",  coins: 100,  priceEur: 99,   label: "100 Münzen" },
  { slug: "coins_500",  coins: 500,  priceEur: 399,  label: "500 Münzen" },
  { slug: "coins_2000", coins: 2000, priceEur: 999,  label: "2.000 Münzen", popular: true },
  { slug: "coins_5000", coins: 5000, priceEur: 1999, label: "5.000 Münzen" },
] as const;

export type CoinPackSlug = (typeof COIN_PACKS)[number]["slug"];

export function getCoinPack(slug: string) {
  return COIN_PACKS.find((p) => p.slug === slug);
}
