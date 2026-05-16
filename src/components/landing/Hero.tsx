import { ArrowRight, ShieldCheck } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <div className="grid-bg pointer-events-none absolute inset-0 opacity-50 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 right-[-10%] size-[600px] rounded-full opacity-30 blur-3xl"
        style={{ background: "radial-gradient(circle, hsl(var(--brand) / 0.5), transparent 60%)" }}
      />

      <Container className="relative section grid items-center gap-16 lg:grid-cols-12">
        <div className="animate-fade-in lg:col-span-7">
          <span className="eyebrow">
            <span className="inline-block size-1.5 bg-brand" />
            Eine Plattform für Schule
          </span>

          <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl xl:text-7xl">
            Lernen, Verwaltung und{" "}
            <span className="relative inline-block">
              <span className="text-brand">KI</span>
              <span className="absolute -bottom-2 left-0 h-1 w-full bg-brand" />
            </span>
            <br />
            in einer Plattform.
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-fg">
            MasterMind ersetzt drei Tools: Lernapp, Schulmanager und KI-Tutor.
            DSGVO-konform aus Deutschland — für Schulen, Lehrer, Schüler und Eltern.
          </p>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" className="glow-on-hover">
              Schule kostenlos testen
              <ArrowRight className="size-4" />
            </Button>
            <Button size="lg" variant="outline">
              30-Min-Demo buchen
            </Button>
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-6 text-sm text-muted-fg">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-success" />
              Server in Deutschland
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-success" />
              AVV in 24 h
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-success" />
              SSO & 2FA
            </div>
          </div>
        </div>

        <div className="lg:col-span-5">
          <HeroMockup />
        </div>
      </Container>
    </section>
  );
}

function HeroMockup() {
  return (
    <div className="premium-card relative aspect-[4/5] w-full overflow-hidden">
      <div className="flex items-center gap-1.5 border-b border-border bg-surface-2 px-4 py-2.5">
        <span className="size-2.5 bg-danger/70" />
        <span className="size-2.5 bg-warning/70" />
        <span className="size-2.5 bg-success/70" />
        <span className="ml-3 font-mono text-[10px] text-muted-fg">
          mastermind.app/app
        </span>
      </div>

      <div className="space-y-5 p-5">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-widest text-muted-fg">
            Heute · 12. März
          </p>
          <p className="mt-1 text-xl font-bold">Hi Lukas 👋</p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Stat label="Streak" value="14" suffix="🔥" />
          <Stat label="XP" value="2.340" />
          <Stat label="Münzen" value="480" suffix="🪙" />
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-fg">
            Heute fällig
          </p>
          <ul className="mt-2 divide-y divide-border border border-border bg-bg">
            <Task subject="Mathe" title="Aufgabe 5 — Quadratische Gleichungen" due="18:00" />
            <Task subject="Englisch" title="Vokabeln Unit 7" due="20:00" />
            <Task subject="Bio" title="Lernkarte: Photosynthese" due="jederzeit" />
          </ul>
        </div>

        <div className="border border-brand/30 bg-brand/[0.04] p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-brand">
            ⚡ Aktiver Booster
          </p>
          <p className="mt-1.5 text-sm leading-snug">
            XP-Booster ×2 aktiv — noch 45 Min. <br />
            <span className="text-muted-fg">Quest: 2/3 Karteikarten fertig</span>
          </p>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <div className="border border-border bg-bg p-3">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-fg">{label}</p>
      <p className="mt-1 font-mono text-lg font-bold">
        {value}
        {suffix && <span className="ml-0.5 text-xs text-muted-fg">{suffix}</span>}
      </p>
    </div>
  );
}

function Task({ subject, title, due }: { subject: string; title: string; due: string }) {
  return (
    <li className="flex items-center gap-3 px-3 py-2.5">
      <span className="size-2 shrink-0 bg-brand" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{title}</p>
        <p className="text-[11px] text-muted-fg">{subject}</p>
      </div>
      <span className="font-mono text-[11px] text-muted-fg">{due}</span>
    </li>
  );
}
