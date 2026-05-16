# SP-2: Stripe-Zahlungssystem — Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vollständige Stripe-Integration für Gold-Coin-Pakete, Schüler-Premium-Abo und Schul-Lizenzen inkl. Eltern-Zahlungslink.

**Architecture:** Stripe Checkout Sessions für alle Zahlungsflows. Webhook-Handler unter `/api/webhooks/stripe` verarbeitet alle Events. Keine Zahlungsdaten in eigener DB — nur Stripe-IDs. SP-1 muss abgeschlossen sein (StripePurchase + UserSubscription Modelle bereits vorhanden).

**Tech Stack:** Stripe Node.js SDK (`stripe`), Next.js Route Handlers, Prisma, Resend (für Eltern-E-Mail).

---

## Datei-Übersicht

### Neue Dateien
- `src/lib/stripe.ts` — Stripe-Client Singleton
- `src/app/api/payments/coins/route.ts` — Gold-Coins kaufen → Checkout Session
- `src/app/api/payments/subscribe/route.ts` — Premium-Abo → Checkout Session
- `src/app/api/payments/school-license/route.ts` — Schul-Lizenz → Checkout Session
- `src/app/api/payments/parent-link/route.ts` — Eltern-Zahlungslink per E-Mail
- `src/app/api/webhooks/stripe/route.ts` — Stripe Webhook Handler
- `src/app/app/coins/buy/page.tsx` — Weiterleitung zu Stripe Checkout
- `src/app/app/premium/page.tsx` — Premium-Abo Seite
- `src/app/admin/lizenz/actions.ts` — Schul-Lizenz kaufen Action

### Modifizierte Dateien
- `src/app/app/coins/page.tsx` — Kaufen-Links aktivieren
- `src/app/admin/lizenz/page.tsx` — Stripe-Checkout Button einbauen

---

## Vorbereitung: Stripe installieren

- [ ] **Schritt 1: Stripe installieren**

```bash
npm install stripe @stripe/stripe-js
```

- [ ] **Schritt 2: Umgebungsvariablen in .env.local eintragen**

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Stripe Price IDs (im Stripe Dashboard anlegen)
STRIPE_PRICE_COINS_500=price_...
STRIPE_PRICE_COINS_1500=price_...
STRIPE_PRICE_COINS_4000=price_...
STRIPE_PRICE_COINS_10000=price_...
STRIPE_PRICE_PREMIUM_MONTHLY=price_...
STRIPE_PRICE_SCHOOL_BASIC=price_...
STRIPE_PRICE_SCHOOL_PRO=price_...
```

Hinweis: Stripe-Preise im Dashboard unter Products anlegen:
- 4× One-time Coin-Pakete (500/1500/4000/10000 GC)
- 1× Recurring Premium €4,99/Monat
- 2× Recurring Schul-Lizenz (Basic €1490/Jahr, Pro €9/User/Jahr)

---

## Task 1: Stripe-Client Singleton

**Files:**
- Create: `src/lib/stripe.ts`

- [ ] **Schritt 1: stripe.ts erstellen**

```typescript
import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY ist nicht gesetzt");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-11-20.acacia",
  typescript: true,
});
```

- [ ] **Schritt 2: Commit**

```bash
git add src/lib/stripe.ts
git commit -m "feat: add stripe client singleton"
```

---

## Task 2: Gold-Coins kaufen Flow

**Files:**
- Create: `src/app/api/payments/coins/route.ts`
- Create: `src/app/app/coins/buy/page.tsx`

- [ ] **Schritt 1: coins payment route erstellen**

```typescript
// src/app/api/payments/coins/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { stripe } from "@/lib/stripe";

const COIN_PACKAGES: Record<string, { priceId: string; gold: number }> = {
  coins_500:   { priceId: process.env.STRIPE_PRICE_COINS_500!,   gold: 500 },
  coins_1500:  { priceId: process.env.STRIPE_PRICE_COINS_1500!,  gold: 1500 },
  coins_4000:  { priceId: process.env.STRIPE_PRICE_COINS_4000!,  gold: 4000 },
  coins_10000: { priceId: process.env.STRIPE_PRICE_COINS_10000!, gold: 10000 },
};

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const body = await req.json() as { packageId: string };
  const pkg = COIN_PACKAGES[body.packageId];
  if (!pkg) return NextResponse.json({ error: "Ungültiges Paket" }, { status: 400 });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: pkg.priceId, quantity: 1 }],
    success_url: `${baseUrl}/app/coins?success=1&gold=${pkg.gold}`,
    cancel_url: `${baseUrl}/app/coins`,
    client_reference_id: session.userId,
    metadata: {
      userId: session.userId,
      type: "coins",
      gold: String(pkg.gold),
      packageId: body.packageId,
    },
    customer_email: session.email,
  });

  return NextResponse.json({ url: checkoutSession.url });
}
```

- [ ] **Schritt 2: coins/buy/page.tsx erstellen (Weiterleitung)**

```typescript
// src/app/app/coins/buy/page.tsx
"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function BuyCoinsPage() {
  const params = useSearchParams();
  const router = useRouter();
  const packageId = params.get("package");

  useEffect(() => {
    if (!packageId) { router.push("/app/coins"); return; }
    fetch("/api/payments/coins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packageId }),
    })
      .then((r) => r.json())
      .then((data: { url?: string; error?: string }) => {
        if (data.url) window.location.href = data.url;
        else router.push("/app/coins");
      })
      .catch(() => router.push("/app/coins"));
  }, [packageId, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-fg">Weiterleitung zu Stripe…</p>
    </div>
  );
}
```

- [ ] **Schritt 3: Commit**

```bash
git add src/app/api/payments/coins/ src/app/app/coins/buy/
git commit -m "feat: add gold coins purchase via Stripe Checkout"
```

---

## Task 3: Premium-Abo Flow

**Files:**
- Create: `src/app/api/payments/subscribe/route.ts`
- Create: `src/app/app/premium/page.tsx`

- [ ] **Schritt 1: subscribe route erstellen**

```typescript
// src/app/api/payments/subscribe/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db/client";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  // Check if already premium
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { isPremium: true, subscription: { select: { stripeCustomerId: true } } },
  });

  if (user?.isPremium) {
    return NextResponse.json({ error: "Bereits Premium" }, { status: 400 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const customerId = user?.subscription?.stripeCustomerId;

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: process.env.STRIPE_PRICE_PREMIUM_MONTHLY!, quantity: 1 }],
    success_url: `${baseUrl}/app/premium?success=1`,
    cancel_url: `${baseUrl}/app/premium`,
    client_reference_id: session.userId,
    ...(customerId ? { customer: customerId } : { customer_email: session.email }),
    metadata: { userId: session.userId, type: "premium_subscription" },
  });

  return NextResponse.json({ url: checkoutSession.url });
}
```

- [ ] **Schritt 2: premium/page.tsx erstellen**

```typescript
// src/app/app/premium/page.tsx
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Check, Star } from "lucide-react";
import { getSession, effectiveRole } from "@/lib/session";
import { prisma } from "@/lib/db/client";
import { Card, CardBody } from "@/components/ui/card";
import { SubscribeButton } from "./SubscribeButton";
import { CancelButton } from "./CancelButton";

export const metadata: Metadata = { title: "Premium" };

const PREMIUM_BENEFITS = [
  "Tägliche 50 Silber-Coins Bonus",
  "Premium-Badge im Profil & Ranking",
  "Exklusiver Premium Avatar-Frame",
  "Premium-Shop: Gold-Items zu 50% SC-Preis",
  "Doppelter Daily-Login Reward",
  "+1 Daily Quest Slot",
  "Doppelte Loot-Box Chancen",
  "Musik-Player ohne Kauf freigeschaltet",
  "500 GC Rabatt auf jeden Saison-Pass",
];

export default async function PremiumPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect("/");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      isPremium: true,
      premiumSince: true,
      subscription: { select: { status: true, currentPeriodEnd: true } },
    },
  });

  const isPremium = user?.isPremium ?? false;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <header className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Upgrade</p>
        <h1 className="mt-2 flex items-center justify-center gap-2 text-4xl font-bold">
          <Star className="size-8 text-warning" />
          Premium
        </h1>
        <p className="mt-2 text-muted-fg">Das beste MasterMind-Erlebnis</p>
      </header>

      <Card className="border-warning/40 bg-gradient-to-br from-warning/[0.06] to-transparent">
        <CardBody className="!p-8">
          <div className="text-center">
            <p className="font-mono text-5xl font-bold">€ 4,99</p>
            <p className="mt-1 text-muted-fg">pro Monat · jederzeit kündbar</p>
          </div>

          <ul className="mt-8 space-y-3">
            {PREMIUM_BENEFITS.map((b) => (
              <li key={b} className="flex items-start gap-3 text-sm">
                <Check className="mt-0.5 size-4 shrink-0 text-success" strokeWidth={2.5} />
                {b}
              </li>
            ))}
          </ul>

          <div className="mt-8">
            {isPremium ? (
              <div className="space-y-3">
                <p className="text-center text-success font-semibold">✓ Du bist Premium-Mitglied!</p>
                {user?.subscription?.currentPeriodEnd && (
                  <p className="text-center text-xs text-muted-fg">
                    Verlängert sich am {user.subscription.currentPeriodEnd.toLocaleDateString("de-DE")}
                  </p>
                )}
                <CancelButton />
              </div>
            ) : (
              <SubscribeButton />
            )}
          </div>

          <p className="mt-4 text-center text-xs text-muted-fg">
            Inkl. 19% MwSt. · Zahlung via Stripe · Sicher und verschlüsselt
          </p>
        </CardBody>
      </Card>

      <p className="text-center text-xs text-muted-fg">
        Unter 18 Jahre? <button className="text-brand underline">Eltern bezahlen lassen →</button>
      </p>
    </div>
  );
}
```

- [ ] **Schritt 3: SubscribeButton + CancelButton erstellen**

```typescript
// src/app/app/premium/SubscribeButton.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";

export function SubscribeButton() {
  const [loading, setLoading] = useState(false);

  async function handleSubscribe() {
    setLoading(true);
    const res = await fetch("/api/payments/subscribe", { method: "POST" });
    const data = await res.json() as { url?: string; error?: string };
    if (data.url) window.location.href = data.url;
    else { setLoading(false); alert(data.error ?? "Fehler"); }
  }

  return (
    <Button size="lg" className="w-full" disabled={loading} onClick={handleSubscribe}>
      <Star className="size-4" />
      {loading ? "Weiterleitung…" : "Jetzt Premium werden"}
    </Button>
  );
}
```

```typescript
// src/app/app/premium/CancelButton.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function CancelButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleCancel() {
    if (!confirm("Abo wirklich kündigen?")) return;
    setLoading(true);
    const res = await fetch("/api/payments/cancel-subscription", { method: "POST" });
    setLoading(false);
    if (res.ok) router.refresh();
  }

  return (
    <Button size="sm" variant="ghost" className="w-full text-muted-fg" disabled={loading} onClick={handleCancel}>
      {loading ? "…" : "Abo kündigen"}
    </Button>
  );
}
```

- [ ] **Schritt 4: Cancel-Subscription Route**

```typescript
// src/app/api/payments/cancel-subscription/route.ts
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db/client";
import { stripe } from "@/lib/stripe";

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const sub = await prisma.userSubscription.findUnique({ where: { userId: session.userId } });
  if (!sub?.stripeSubId) return NextResponse.json({ error: "Kein aktives Abo" }, { status: 400 });

  await stripe.subscriptions.cancel(sub.stripeSubId);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Schritt 5: Commit**

```bash
git add src/app/api/payments/ src/app/app/premium/
git commit -m "feat: add premium subscription flow via Stripe"
```

---

## Task 4: Webhook-Handler

**Files:**
- Create: `src/app/api/webhooks/stripe/route.ts`

- [ ] **Schritt 1: Webhook-Handler erstellen**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db/client";
import { awardCoins } from "@/lib/coins";
import type Stripe from "stripe";

export const config = { api: { bodyParser: false } };

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const type = session.metadata?.type;
  if (!userId) return;

  if (type === "coins") {
    const gold = Number(session.metadata?.gold ?? 0);
    if (gold > 0) {
      await awardCoins(userId, gold, "gold", "stripe_purchase", session.id);
      await prisma.stripePurchase.create({
        data: {
          userId,
          stripePaymentId: session.payment_intent as string,
          amount: session.amount_total ?? 0,
          type: "coins",
          metadata: JSON.stringify({ gold, packageId: session.metadata?.packageId }),
        },
      });
    }
  }
}

async function handleSubscriptionUpsert(sub: Stripe.Subscription) {
  const userId = sub.metadata?.userId ?? sub.client_reference_id;
  if (!userId) return;

  const isActive = ["active", "trialing"].includes(sub.status);

  await prisma.userSubscription.upsert({
    where: { userId },
    create: {
      userId,
      stripeCustomerId: sub.customer as string,
      stripeSubId: sub.id,
      status: sub.status,
      currentPeriodEnd: new Date((sub as Stripe.Subscription & { current_period_end: number }).current_period_end * 1000),
    },
    update: {
      stripeSubId: sub.id,
      status: sub.status,
      currentPeriodEnd: new Date((sub as Stripe.Subscription & { current_period_end: number }).current_period_end * 1000),
    },
  });

  await prisma.user.update({
    where: { id: userId },
    data: {
      isPremium: isActive,
      premiumSince: isActive ? new Date() : undefined,
    },
  });

  // Award premium frame on first activation
  if (isActive) {
    const frameItem = await prisma.shopItem.findUnique({ where: { slug: "frame_premium" } });
    if (frameItem) {
      await prisma.userInventory.upsert({
        where: { userId_itemId: { userId, itemId: frameItem.id } },
        create: { userId, itemId: frameItem.id },
        update: {},
      });
    }
  }
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Fehlende Signatur" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: "Ungültige Signatur" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutComplete(event.data.object as Stripe.Checkout.Session);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpsert(event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionUpsert(event.data.object as Stripe.Subscription);
        break;
    }
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json({ error: "Webhook-Verarbeitung fehlgeschlagen" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
```

- [ ] **Schritt 2: Commit**

```bash
git add src/app/api/webhooks/stripe/
git commit -m "feat: add Stripe webhook handler for coins and subscriptions"
```

---

## Task 5: Eltern-Zahlungslink

**Files:**
- Create: `src/app/api/payments/parent-link/route.ts`

- [ ] **Schritt 1: parent-link route erstellen**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { stripe } from "@/lib/stripe";
import { sendEmail } from "@/lib/email";
import { prisma } from "@/lib/db/client";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const body = await req.json() as { type: "coins" | "premium"; packageId?: string; parentEmail?: string };

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { name: true, parentEmail: true },
  });

  const targetEmail = body.parentEmail ?? user?.parentEmail;
  if (!targetEmail) return NextResponse.json({ error: "Keine Eltern-E-Mail hinterlegt" }, { status: 400 });

  // Save parentEmail for future use
  if (body.parentEmail && body.parentEmail !== user?.parentEmail) {
    await prisma.user.update({ where: { id: session.userId }, data: { parentEmail: body.parentEmail } });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  let paymentLink: string;

  if (body.type === "premium") {
    const link = await stripe.paymentLinks.create({
      line_items: [{ price: process.env.STRIPE_PRICE_PREMIUM_MONTHLY!, quantity: 1 }],
      metadata: { userId: session.userId, type: "premium_subscription" },
      after_completion: { type: "redirect", redirect: { url: `${baseUrl}/app/premium?success=1` } },
    });
    paymentLink = link.url;
  } else {
    const PACKAGES: Record<string, string> = {
      coins_500: process.env.STRIPE_PRICE_COINS_500!,
      coins_1500: process.env.STRIPE_PRICE_COINS_1500!,
      coins_4000: process.env.STRIPE_PRICE_COINS_4000!,
      coins_10000: process.env.STRIPE_PRICE_COINS_10000!,
    };
    const priceId = PACKAGES[body.packageId ?? "coins_500"];
    const link = await stripe.paymentLinks.create({
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { userId: session.userId, type: "coins" },
    });
    paymentLink = link.url;
  }

  await sendEmail({
    to: targetEmail,
    subject: `MasterMind: Zahlungsanfrage von ${user?.name ?? session.name}`,
    html: `
      <p>Hallo,</p>
      <p>${user?.name ?? session.name} möchte ${body.type === "premium" ? "das MasterMind Premium-Abo (€4,99/Monat)" : "Gold-Coins"} kaufen.</p>
      <p><a href="${paymentLink}" style="background:#1d4ed8;color:white;padding:12px 24px;text-decoration:none;border-radius:4px;">Jetzt bezahlen</a></p>
      <p style="color:#6b7280;font-size:12px;">Dieser Link ist einmalig verwendbar und sicher. MasterMind · DSGVO-konform · Server in Deutschland</p>
    `,
  });

  return NextResponse.json({ ok: true, sentTo: targetEmail });
}
```

- [ ] **Schritt 2: Commit**

```bash
git add src/app/api/payments/parent-link/
git commit -m "feat: add parent payment link generation and email"
```

---

## Task 6: Schul-Lizenz Flow

**Files:**
- Modify: `src/app/admin/lizenz/page.tsx`

- [ ] **Schritt 1: LizenzCheckoutButton Client Component erstellen**

```typescript
// src/app/admin/lizenz/LizenzCheckoutButton.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function LizenzCheckoutButton({ plan }: { plan: "basic" | "pro" }) {
  const [loading, setLoading] = useState(false);

  async function handleCheckout() {
    setLoading(true);
    const res = await fetch("/api/payments/school-license", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    const data = await res.json() as { url?: string; error?: string };
    if (data.url) window.location.href = data.url;
    else { setLoading(false); alert(data.error ?? "Fehler"); }
  }

  return (
    <Button onClick={handleCheckout} disabled={loading} size="lg" className="w-full">
      {loading ? "Weiterleitung…" : plan === "basic" ? "Basic kaufen — €1.490/Jahr" : "Pro anfragen"}
    </Button>
  );
}
```

- [ ] **Schritt 2: school-license route erstellen**

```typescript
// src/app/api/payments/school-license/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSession, effectiveRole } from "@/lib/session";
import { stripe } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "admin") {
    return NextResponse.json({ error: "Nur für Admins" }, { status: 403 });
  }

  const body = await req.json() as { plan: "basic" | "pro" };
  const priceId = body.plan === "basic"
    ? process.env.STRIPE_PRICE_SCHOOL_BASIC!
    : process.env.STRIPE_PRICE_SCHOOL_PRO!;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}/admin/lizenz?success=1`,
    cancel_url: `${baseUrl}/admin/lizenz`,
    customer_email: session.email,
    metadata: { schoolId: session.schoolId ?? "", type: "school_license", plan: body.plan },
  });

  return NextResponse.json({ url: checkoutSession.url });
}
```

- [ ] **Schritt 3: Commit**

```bash
git add src/app/api/payments/ src/app/admin/lizenz/
git commit -m "feat: add school license checkout flow"
```

---

## Task 7: Webhook für Schul-Lizenzen erweitern

**Files:**
- Modify: `src/app/api/webhooks/stripe/route.ts`

- [ ] **Schritt 1: School-Lizenz-Handler in handleCheckoutComplete ergänzen**

Im `handleCheckoutComplete` nach dem `coins` Block einfügen:

```typescript
  if (type === "school_license") {
    const schoolId = session.metadata?.schoolId;
    const plan = session.metadata?.plan ?? "basic";
    if (schoolId) {
      await prisma.school.update({ where: { id: schoolId }, data: { plan } });
      await prisma.stripePurchase.create({
        data: {
          schoolId,
          stripePaymentId: session.payment_intent as string ?? session.id,
          amount: session.amount_total ?? 0,
          type: "school_license",
          metadata: JSON.stringify({ plan }),
        },
      });
    }
  }
```

- [ ] **Schritt 2: Commit**

```bash
git add src/app/api/webhooks/stripe/route.ts
git commit -m "feat: handle school license activation in Stripe webhook"
```

---

## Abschluss SP-2

- [ ] **Webhook lokal testen**

```bash
# Stripe CLI installieren, dann:
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Einen Test-Kauf durchführen und prüfen ob Coins gutgeschrieben werden.

- [ ] **Build-Check**

```bash
npm run build
```

- [ ] **Finaler Commit**

```bash
git add -A
git commit -m "feat: SP-2 complete — Stripe payments for coins, premium, school licenses"
```
