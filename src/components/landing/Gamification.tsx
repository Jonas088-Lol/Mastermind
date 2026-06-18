import { Zap, Flame, Coins, ShoppingBag, Swords, Trophy } from "lucide-react";
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
    body: "Für jede Aktivität XP verdienen. 500 Level, 8 Rang-Stufen — echter Lernfortschritt wird sichtbar.",
  },
  {
    Icon: Flame,
    title: "Streak-System",
    body: "Tägliches Lernen wird belohnt. Streak-Schutz kaufen, um Ausnahmen zu überstehen.",
  },
  {
    Icon: Coins,
    title: "Münz-Wirtschaft",
    body: "Münzen für Quizze, Quests und Aufgaben. Im Shop für Booster, Titel und Kosmetik ausgeben.",
  },
  {
    Icon: ShoppingBag,
    title: "Virtual Shop",
    body: "50+ Gegenstände: XP-Booster, Profile-Rahmen, exklusive Titel, KI-Kontingente und mehr.",
  },
  {
    Icon: Swords,
    title: "Boss-Battles",
    body: "Schulweite Koop-Events. Alle Schüler greifen gemeinsam an — Top-Schadensverteiler gewinnen extra XP.",
  },
  {
    Icon: Trophy,
    title: "Quests & Saisons",
    body: "Tägliche, wöchentliche und monatliche Quests. Saisonale Battle-Pass-artige Fortschrittspfade.",
  },
];

const shopPreview = [
  { icon: "🚀", name: "XP-Booster ×2", desc: "1 Stunde",        price: 90,  rarity: "Selten",       pos: 0 },
  { icon: "💎", name: "XP-Booster ×2", desc: "24 Stunden",      price: 350, rarity: "Episch",       pos: 2 },
  { icon: "🛡️", name: "Streak-Schutz", desc: "3 Tage",          price: 200, rarity: "Ungewöhnlich", pos: 4 },
  { icon: "👑", name: "Kronen-Badge",  desc: "Profil-Dekoration",price: 300, rarity: "Selten",       pos: 1 },
];

function shopHeaderStyle(pos: number): React.CSSProperties {
  return {
    background: RAINBOW,
    backgroundSize: "600% 100%",
    backgroundPosition: `${pos * 20}% 0%`,
  };
}

export function Gamification() {
  return (
    <section
      id="gamification"
      className="section bg-bg"
    >
      <Container>
        <AnimateOnScroll animation="fade-up" className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">Gamification & Virtual Economy</span>
          <h2 className="mt-4 text-4xl sm:text-5xl">
            Lernen fühlt sich wie ein Spiel an.
          </h2>
          <p className="mt-5 text-lg text-muted-fg">
            Kein leeres Gamification-Konfetti — sondern eine echte virtuelle
            Wirtschaft, die Lernmotivation mit konkreten Belohnungen verknüpft.
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
                Schüler verdienen Münzen durch Lernaktivitäten und tauschen sie
                gegen echte Vorteile ein — XP-Booster, Streak-Schutz, exklusive
                Profil-Rahmen und Titel.
              </p>
              <ul className="mt-5 space-y-2 text-sm text-muted-fg">
                <li className="flex items-center gap-2">
                  <span className="text-brand">◆</span> 50+ Gegenstände in 6 Kategorien
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-brand">◆</span> Limitierte Saisonalgegenstände
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-brand">◆</span> Münz-Pakete per Stripe kaufbar
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-brand">◆</span> Booster aktiv im Header sichtbar
                </li>
              </ul>
            </div>
          </AnimateOnScroll>

          <AnimateOnScroll animation="slide-left">
            <div className="grid grid-cols-2 gap-4">
              {shopPreview.map((item) => (
                <div
                  key={item.name + item.desc}
                  className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm"
                >
                  {/* Rainbow gradient header */}
                  <div
                    className="flex h-16 items-center justify-center"
                    style={shopHeaderStyle(item.pos)}
                  >
                    <span className="text-3xl">{item.icon}</span>
                  </div>
                  <div className="p-3.5">
                    <p className="text-sm font-bold">{item.name}</p>
                    <p className="text-xs text-muted-fg">{item.desc}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 font-mono text-sm font-bold">
                        <CoinIcon className="size-3.5 text-warning" />
                        {item.price}
                      </span>
                      <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-semibold text-brand">
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
