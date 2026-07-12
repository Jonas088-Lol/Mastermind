/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { Zap, Flame, Coins, ShoppingBag, Swords, Trophy, Shield, Crown } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { CoinIcon } from "@/components/ui/CoinIcon";
import { Container } from "@/components/ui/container";
import { AnimateOnScroll } from "./AnimateOnScroll";

const RAINBOW = "linear-gradient(to right, #2FC5E7, #4B9EF5, #8B5CF6, #EC4899, #F97316, #10B981)";
function headerStyle(index: number): React.CSSProperties {
  return {
    background: RAINBOW,
    backgroundSize: "600% 100%",
    backgroundPosition: `${index * 20}% 0%`,
  };
}

const features: { Icon: LucideIcon; title: string; body: string }[] = [
  {
    Icon: Zap,
    title: "XP & Level",
    body: "Erfahrungspunkte (XP) und Level fördern Motivation durch sichtbare Fortschritte.",
  },
  {
    Icon: Flame,
    title: "Streak-System",
    body: "Streaks fördern regelmäßiges Lernen und helfen, langfristige Lerngewohnheiten aufzubauen.",
  },
  {
    Icon: Coins,
    title: "Münz-Wirtschaft",
    body: "Erfolgreiches Üben wird mit Münzen belohnt, die im integrierten Shop eingelöst werden können.",
  },
  {
    Icon: ShoppingBag,
    title: "Virtueller Shop",
    body: "Gesammelte Münzen lassen sich im Shop gegen virtuelle Inhalte eintauschen.",
  },
  {
    Icon: Swords,
    title: "Boss-Battles",
    body: "Kooperative Herausforderungen schaffen gemeinsame Erfolgserlebnisse und stärken die Klassengemeinschaft.",
  },
  {
    Icon: Trophy,
    title: "Quests & Saisons",
    body: "Quests fördern kontinuierliches Lernen durch abwechslungsreiche Herausforderungen.",
  },
];

// ── Shop-Vorschau ─────────────────────────────────────────────────────────────

interface ShopItem {
  Icon: LucideIcon;
  name: string;
  desc: string;
  price: number;
  rarity: string;
  gradient: string;
  rarityClass: string;
}

const shopPreview: ShopItem[] = [
  {
    Icon: Shield,
    name: "Streak-Schutz",
    desc: "Schutz für deinen Streak",
    price: 1000,
    rarity: "Ungewöhnlich",
    gradient: "linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)",
    rarityClass: "bg-green-500/10 text-green-500",
  },
  {
    Icon: Zap,
    name: "XP-Booster ×2",
    desc: "1 Stunde",
    price: 150,
    rarity: "Selten",
    gradient: "linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)",
    rarityClass: "bg-blue-500/10 text-blue-500",
  },
  {
    Icon: Zap,
    name: "XP-Booster ×2",
    desc: "24 Stunden",
    price: 800,
    rarity: "Episch",
    gradient: "linear-gradient(135deg, #7c3aed 0%, #db2777 100%)",
    rarityClass: "bg-purple-500/10 text-purple-500",
  },
  {
    Icon: Crown,
    name: "Kronen-Badge",
    desc: "Profil-Dekoration",
    price: 5000,
    rarity: "Legendär",
    gradient: "linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)",
    rarityClass: "bg-orange-500/10 text-orange-500",
  },
];

export function Gamification() {
  return (
    <section
      id="gamification"
      className="section bg-bg"
    >
      <Container>
        <AnimateOnScroll animation="fade-up" className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">Gamification</span>
          <h2 className="mt-4 text-4xl sm:text-5xl">
            Das Lernen wird zum Spiel.
          </h2>
          <p className="mt-5 text-lg text-muted-fg">
            Unsere Gamification motiviert Schüler zum regelmäßigen Lernen und macht Lernerfolge deutlich sichtbar.
          </p>
        </AnimateOnScroll>

        {/* Features grid */}
        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <AnimateOnScroll key={f.title} animation="fade-up" delay={i * 70}>
              <article className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                {/* Rainbow gradient header */}
                <div
                  className="flex h-16 items-center justify-center"
                  style={headerStyle(i)}
                >
                  <div className="grid size-10 place-items-center rounded-2xl bg-white/20 backdrop-blur-sm">
                    <f.Icon className="size-5 text-white" strokeWidth={1.75} />
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-bold">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-fg">
                    {f.body}
                  </p>
                </div>
              </article>
            </AnimateOnScroll>
          ))}
        </div>

        {/* Shop preview */}
        <div className="mt-16 grid gap-10 lg:grid-cols-2">
          <AnimateOnScroll animation="slide-right">
            <div>
              <h3 className="text-2xl font-bold">Der virtuelle Shop</h3>
              <p className="mt-3 text-muted-fg">
                Der virtuelle Shop belohnt kontinuierliches Lernen mit freischaltbaren Inhalten und schafft zusätzliche Motivation im Schul- und Lernalltag.
              </p>
              <ul className="mt-5 space-y-2 text-sm text-muted-fg">
                <li className="flex items-center gap-2">
                  <span className="text-brand">◆</span> Münzen durch regelmäßiges Lernen verdienen
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-brand">◆</span> Virtuelle Inhalte im Shop freischalten
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-brand">◆</span> Lernfortschritte sichtbar belohnen
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-brand">◆</span> Zusätzliche Motivation durch individuelle Belohnungen
                </li>
              </ul>
            </div>
          </AnimateOnScroll>

          <AnimateOnScroll animation="slide-left">
            <div className="grid grid-cols-2 gap-4">
              {shopPreview.map((item) => (
                <div
                  key={item.name + item.desc}
                  className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                >
                  {/* Per-item gradient header with Landing-Symboldesign icon */}
                  <div
                    className="flex h-16 items-center justify-center"
                    style={{ background: item.gradient }}
                  >
                    <div className="grid size-10 place-items-center rounded-2xl bg-white/20 backdrop-blur-sm">
                      <item.Icon className="size-5 text-white" strokeWidth={1.75} />
                    </div>
                  </div>
                  <div className="p-3.5">
                    <p className="text-sm font-bold">{item.name}</p>
                    <p className="text-xs text-muted-fg">{item.desc}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 font-mono text-sm font-bold">
                        <CoinIcon className="size-3.5 text-warning" />
                        {item.price.toLocaleString("de-DE")}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${item.rarityClass}`}>
                        {item.rarity}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </AnimateOnScroll>
        </div>
      </Container>
    </section>
  );
}
