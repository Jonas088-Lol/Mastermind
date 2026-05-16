import { Container } from "@/components/ui/container";

const features = [
  { icon: "⚡", title: "XP & Level", body: "Für jede Aktivität XP verdienen. 500 Level, 8 Rang-Stufen — echter Lernfortschritt wird sichtbar." },
  { icon: "🔥", title: "Streak-System", body: "Tägliches Lernen wird belohnt. Streak-Schutz kaufen, um Ausnahmen zu überstehen." },
  { icon: "🪙", title: "Münz-Wirtschaft", body: "Münzen für Quizze, Quests und Aufgaben. Im Shop für Booster, Titel und Kosmetik ausgeben." },
  { icon: "🛒", title: "Virtual Shop", body: "50+ Gegenstände: XP-Booster, Profile-Rahmen, exklusive Titel, KI-Kontingente und mehr." },
  { icon: "👾", title: "Boss-Battles", body: "Schulweite Koop-Events. Alle Schüler greifen gemeinsam an — Top-Schadensverteiler gewinnen extra XP." },
  { icon: "🏆", title: "Quests & Saisons", body: "Tägliche, wöchentliche und monatliche Quests. Saisonale Battle-Pass-artige Fortschrittspfade." },
];

const shopPreview = [
  { icon: "🚀", name: "XP-Booster ×2", desc: "1 Stunde", price: "90 🪙", rarity: "Selten" },
  { icon: "💎", name: "XP-Booster ×2", desc: "24 Stunden", price: "350 🪙", rarity: "Episch" },
  { icon: "🛡️", name: "Streak-Schutz", desc: "3 Tage", price: "200 🪙", rarity: "Ungewöhnlich" },
  { icon: "👑", name: "Kronen-Badge", desc: "Profil-Dekoration", price: "300 🪙", rarity: "Selten" },
];

export function Gamification() {
  return (
    <section id="gamification" className="border-b border-border section">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">Gamification & Virtual Economy</span>
          <h2 className="mt-4 text-4xl sm:text-5xl">Lernen fühlt sich wie ein Spiel an.</h2>
          <p className="mt-5 text-lg text-muted-fg">
            Kein leeres Gamification-Konfetti — sondern eine echte virtuelle Wirtschaft,
            die Lernmotivation mit konkreten Belohnungen verknüpft.
          </p>
        </div>

        <div className="mt-16 grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <article key={f.title} className="bg-bg p-7 transition-colors hover:bg-surface">
              <span className="text-3xl leading-none">{f.icon}</span>
              <h3 className="mt-4 text-lg font-bold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-fg">{f.body}</p>
            </article>
          ))}
        </div>

        {/* Shop preview */}
        <div className="mt-16 grid gap-8 lg:grid-cols-2">
          <div>
            <h3 className="text-2xl font-bold">Der virtuelle Shop</h3>
            <p className="mt-3 text-muted-fg">
              Schüler verdienen Münzen durch Lernaktivitäten und tauschen sie gegen echte Vorteile ein —
              XP-Booster, Streak-Schutz, exklusive Profil-Rahmen und Titel.
            </p>
            <ul className="mt-5 space-y-2 text-sm text-muted-fg">
              <li className="flex items-center gap-2"><span className="text-brand">◆</span> 50+ Gegenstände in 6 Kategorien</li>
              <li className="flex items-center gap-2"><span className="text-brand">◆</span> Limitierte Saisonalgegenstände</li>
              <li className="flex items-center gap-2"><span className="text-brand">◆</span> Münz-Pakete per Stripe kaufbar</li>
              <li className="flex items-center gap-2"><span className="text-brand">◆</span> Booster aktiv im Header sichtbar</li>
            </ul>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {shopPreview.map((item) => (
              <div key={item.name + item.desc} className="flex flex-col gap-2 border border-border bg-bg p-4">
                <span className="text-2xl leading-none">{item.icon}</span>
                <div>
                  <p className="font-semibold text-sm">{item.name}</p>
                  <p className="text-xs text-muted-fg">{item.desc}</p>
                </div>
                <div className="mt-auto flex items-center justify-between">
                  <span className="font-mono text-xs font-bold">{item.price}</span>
                  <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[10px] font-medium text-muted-fg">{item.rarity}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
