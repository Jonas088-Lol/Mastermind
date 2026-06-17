import { ArrowRight, CheckCircle2, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Gradient background */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(160deg, #EDF6FF 0%, #dbeeff 50%, #EDF6FF 100%)",
        }}
      />
      {/* Blue radial glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-60 left-1/2 -translate-x-1/2 size-175 rounded-full opacity-25 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, hsl(220, 80%, 60%) 0%, transparent 60%)",
        }}
      />

      <div className="container-px relative mx-auto max-w-7xl">
        <div className="grid items-center gap-12 pt-16 pb-8 sm:pt-20 sm:pb-12 lg:grid-cols-2 lg:gap-16 lg:pt-28 lg:pb-20">

          {/* ─── LEFT: Text ─── */}
          <div className="flex flex-col items-start text-left">
            {/* Badge */}
            <div className="animate-fade-in inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-xs font-semibold text-blue-600">
              <Sparkles className="size-3.5" />
              KI-gestütztes Schulmanagement
            </div>

            {/* Headline */}
            <h1 className="animate-fade-in animate-delay-100 mt-6 text-4xl sm:text-5xl lg:text-6xl xl:text-7xl">
              Die Schule der Zukunft.{" "}
              <span className="text-blue-600">Heute.</span>
            </h1>

            <p className="animate-fade-in animate-delay-200 mt-6 max-w-xl text-base leading-relaxed text-muted-fg sm:text-lg">
              MasterMind ersetzt drei Tools: Lernapp, Schulmanager und KI-Tutor.
              DSGVO-konform aus Deutschland — für Schulen, Lehrer, Schüler und Eltern.
            </p>

            {/* CTAs */}
            <div className="animate-fade-in animate-delay-300 mt-10 flex flex-col gap-3 sm:flex-row">
              <Button
                size="lg"
                className="w-full bg-blue-600 text-white hover:bg-blue-700 sm:w-auto"
              >
                Schule kostenlos testen
                <ArrowRight className="size-4" />
              </Button>
              <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                30-Min-Demo buchen
              </Button>
            </div>

            {/* Trust badges */}
            <div className="animate-fade-in animate-delay-300 mt-8 flex flex-wrap items-center gap-4 text-xs text-muted-fg sm:gap-5 sm:text-sm">
              {[
                "Server in Deutschland",
                "DSGVO-konform",
                "AVV in 24 h",
                "SSO & 2FA",
              ].map((label) => (
                <div key={label} className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-3.5 shrink-0 text-blue-500" />
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* ─── RIGHT: App mockup ─── */}
          <div className="animate-slide-up animate-delay-400 relative">
            {/* Floating hint: top-right */}
            <div className="absolute -top-4 -right-4 z-10 flex items-center gap-2 rounded-2xl border border-blue-200 bg-white px-3 py-2 shadow-lg">
              <span className="text-lg">🏆</span>
              <div>
                <p className="text-[11px] font-bold text-blue-600">Rang: Silber III</p>
                <p className="text-[10px] text-muted-fg">Top 15 % der Schule</p>
              </div>
            </div>

            {/* Floating hint: bottom-left */}
            <div className="absolute -bottom-4 -left-4 z-10 flex items-center gap-2 rounded-2xl border border-blue-100 bg-white px-3 py-2 shadow-lg">
              <span className="text-lg">📊</span>
              <p className="text-[11px] font-semibold text-fg">
                Klasse hat heute <span className="text-blue-600">2.340 XP</span> gesammelt
              </p>
            </div>

            <div className="animate-float premium-card overflow-hidden">
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
                {/* Sidebar */}
                <aside className="hidden border-r border-border bg-surface md:block">
                  <div className="border-b border-border px-4 py-3.5">
                    <div className="h-5 w-24 rounded-lg bg-blue-100" />
                  </div>
                  <div className="space-y-1 p-3">
                    {["Dashboard", "Übungen", "Aufgaben", "Karteikarten", "KI-Tutor", "Noten", "Ranking"].map((item, i) => (
                      <div
                        key={item}
                        className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-medium ${
                          i === 0
                            ? "bg-blue-50 text-blue-600"
                            : "text-muted-fg"
                        }`}
                      >
                        <div
                          className={`size-2 rounded-full ${
                            i === 0 ? "bg-blue-500" : "bg-border-strong"
                          }`}
                        />
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
                      <div className="size-8 rounded-full bg-blue-100" />
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                      { label: "Streak", value: "14 🔥", accent: "text-orange-500" },
                      { label: "XP heute", value: "+320", accent: "text-teal-600" },
                      { label: "Münzen", value: "480 🪙", accent: "text-yellow-600" },
                      { label: "Ø Note", value: "2,3", accent: "text-green-600" },
                    ].map((s) => (
                      <div key={s.label} className="rounded-xl border border-border bg-surface p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-fg">
                          {s.label}
                        </p>
                        <p className={`mt-1 font-mono text-base font-bold ${s.accent}`}>
                          {s.value}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* AI suggestion */}
                  <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                    <div className="flex items-center gap-2">
                      <Zap className="size-3.5 text-blue-600" />
                      <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
                        KI-Vorschlag
                      </p>
                    </div>
                    <p className="mt-2 text-sm font-medium leading-snug">
                      Du hattest in{" "}
                      <span className="text-blue-600">Mathe</span> eine 3,5. 10
                      Min. Übung jetzt können die nächste Klassenarbeit
                      verbessern.
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-blue-100">
                        <div className="h-full w-2/3 rounded-full bg-blue-500" />
                      </div>
                      <span className="text-[11px] text-muted-fg">
                        Übung starten →
                      </span>
                    </div>
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
