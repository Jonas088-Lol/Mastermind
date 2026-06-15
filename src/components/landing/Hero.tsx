import { ArrowRight, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 mesh-bg" />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-60 left-1/2 -translate-x-1/2 size-175 rounded-full opacity-20 blur-3xl"
        style={{ background: "radial-gradient(circle, hsl(var(--brand)) 0%, transparent 60%)" }}
      />

      <div className="container-px relative mx-auto max-w-7xl">
        <div className="flex flex-col items-center pt-16 pb-8 text-center sm:pt-20 sm:pb-12 lg:pt-28 lg:pb-16">

          {/* Badge */}
          <div className="animate-fade-in inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/8 px-4 py-1.5 text-xs font-semibold text-brand">
            <Sparkles className="size-3.5" />
            KI-gestütztes Schulmanagement
          </div>

          {/* Headline */}
          <h1 className="animate-fade-in animate-delay-100 mt-6 max-w-4xl text-4xl sm:text-5xl lg:text-6xl xl:text-7xl">
            Lernen, Verwaltung
            <br className="hidden sm:block" />
            {" und "}
            <span className="text-brand">KI</span>
            {" — eine Plattform."}
          </h1>

          <p className="animate-fade-in animate-delay-200 mt-6 max-w-2xl text-base leading-relaxed text-muted-fg sm:text-lg">
            MasterMind ersetzt drei Tools: Lernapp, Schulmanager und KI-Tutor.
            DSGVO-konform aus Deutschland — für Schulen, Lehrer, Schüler und Eltern.
          </p>

          {/* CTAs */}
          <div className="animate-fade-in animate-delay-300 mt-10 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" className="glow-on-hover w-full sm:w-auto">
              Schule kostenlos testen
              <ArrowRight className="size-4" />
            </Button>
            <Button size="lg" variant="secondary" className="w-full sm:w-auto">
              30-Min-Demo buchen
            </Button>
          </div>

          {/* Trust badges */}
          <div className="animate-fade-in animate-delay-300 mt-8 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-fg sm:gap-6 sm:text-sm">
            {[
              "Server in Deutschland",
              "DSGVO-konform",
              "AVV in 24 h",
              "SSO & 2FA",
            ].map((label) => (
              <div key={label} className="flex items-center gap-1.5">
                <ShieldCheck className="size-3.5 text-success shrink-0" />
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* App mockup */}
        <div className="animate-slide-up animate-delay-400 mx-auto max-w-2xl px-2 pb-12 sm:pb-16 lg:max-w-4xl lg:pb-20">
          <div className="premium-card animate-float overflow-hidden">
            {/* Browser chrome */}
            <div className="flex items-center gap-1.5 border-b border-border bg-surface-2 px-4 py-3">
              <span className="size-3 rounded-full bg-danger/60" />
              <span className="size-3 rounded-full bg-warning/60" />
              <span className="size-3 rounded-full bg-success/60" />
              <div className="ml-4 flex-1">
                <div className="mx-auto max-w-xs rounded-md bg-surface px-3 py-1 text-center font-mono text-[11px] text-muted-fg">
                  mastermind.app/app
                </div>
              </div>
            </div>

            {/* App content */}
            <div className="grid gap-0 md:grid-cols-[200px_1fr]">
              {/* Sidebar (hidden on mobile) */}
              <aside className="hidden border-r border-border bg-surface md:block">
                <div className="border-b border-border px-4 py-3.5">
                  <div className="h-5 w-24 rounded-lg bg-brand/15" />
                </div>
                <div className="space-y-1 p-3">
                  {["Dashboard", "Übungen", "Aufgaben", "Karteikarten", "KI-Tutor", "Noten", "Ranking"].map((item, i) => (
                    <div
                      key={item}
                      className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-medium ${i === 0 ? "bg-brand/10 text-brand" : "text-muted-fg"}`}
                    >
                      <div className={`size-2 rounded-full ${i === 0 ? "bg-brand" : "bg-border-strong"}`} />
                      {item}
                    </div>
                  ))}
                </div>
              </aside>

              {/* Main content */}
              <div className="p-4 sm:p-6">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">
                      Donnerstag, 12. Juni
                    </p>
                    <p className="mt-0.5 text-xl font-bold">Hi Lukas 👋</p>
                  </div>
                  <div className="hidden items-center gap-2 sm:flex">
                    <div className="size-8 rounded-full bg-brand/20" />
                  </div>
                </div>

                {/* Stats */}
                <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { label: "Streak", value: "14 🔥" },
                    { label: "XP heute", value: "+320" },
                    { label: "Münzen", value: "480 🪙" },
                    { label: "Ø Note", value: "2,3" },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl border border-border bg-surface p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-fg">{s.label}</p>
                      <p className="mt-1 font-mono text-base font-bold">{s.value}</p>
                    </div>
                  ))}
                </div>

                {/* AI suggestion */}
                <div className="rounded-xl border border-brand/25 bg-brand/5 p-4">
                  <div className="flex items-center gap-2">
                    <Zap className="size-3.5 text-brand" />
                    <p className="text-[11px] font-bold uppercase tracking-wider text-brand">KI-Vorschlag</p>
                  </div>
                  <p className="mt-2 text-sm font-medium leading-snug">
                    Du hattest in <span className="text-brand">Mathe</span> eine 3,5.
                    10 Min. Übung jetzt können die nächste Klassenarbeit verbessern.
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
                      <div className="h-full w-2/3 rounded-full bg-brand" />
                    </div>
                    <span className="text-[11px] text-muted-fg">Übung starten →</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
