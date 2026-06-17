"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardPreviewModal } from "@/components/landing/DashboardPreviewModal";

export function Hero() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <section className="relative overflow-hidden bg-white">
        {/* Radial teal glow at top center */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-150 w-225 rounded-full"
          style={{
            background:
              "radial-gradient(ellipse at center, hsl(172,72%,40%,0.08) 0%, transparent 70%)",
          }}
        />

        <div className="container-px relative mx-auto max-w-7xl">
          {/* ─── Centered headline block ─── */}
          <div className="flex flex-col items-center pt-20 pb-12 text-center sm:pt-28 sm:pb-16 lg:pt-36 lg:pb-20">
            {/* Eyebrow */}
            <div className="animate-fade-in inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-1.5 text-xs font-semibold text-gray-500 shadow-sm">
              <span
                className="inline-block size-1.5 rounded-full"
                style={{ background: "hsl(172,72%,40%)" }}
              />
              KI-gestütztes Schulmanagement
            </div>

            {/* Main headline */}
            <h1 className="animate-fade-in animate-delay-100 mt-8 max-w-4xl text-5xl font-bold leading-[1.08] tracking-tight text-gray-900 sm:text-6xl lg:text-7xl xl:text-8xl">
              Die Schule der
              <br />
              <span style={{ color: "hsl(172,72%,40%)" }}>Zukunft.</span>
            </h1>

            {/* Subheadline */}
            <p className="animate-fade-in animate-delay-200 mt-6 max-w-xl text-base leading-relaxed text-gray-500 sm:text-lg">
              KI-Tutor. Gamification. Echtzeit-Noten. —{" "}
              <span className="text-gray-700">Eine Plattform für alle.</span>
            </p>

            {/* CTAs */}
            <div className="animate-fade-in animate-delay-300 mt-10 flex flex-col items-center gap-3 sm:flex-row">
              <Button
                size="lg"
                className="w-full sm:w-auto"
                style={{ background: "hsl(172,72%,40%)", color: "#fff" }}
              >
                Schule kostenlos testen
                <ArrowRight className="size-4" />
              </Button>
              <Button size="lg" variant="outline" className="w-full border-gray-200 text-gray-700 hover:bg-gray-50 sm:w-auto">
                30-Min-Demo buchen
              </Button>
            </div>

            {/* "App live erleben" text link */}
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="animate-fade-in animate-delay-300 mt-5 text-sm font-medium text-gray-400 underline-offset-4 transition-colors hover:text-gray-700 hover:underline"
            >
              App live erleben →
            </button>

            {/* Trust badges */}
            <div className="animate-fade-in animate-delay-300 mt-10 flex flex-wrap items-center justify-center gap-5 text-xs text-gray-400 sm:text-sm">
              {[
                "Server in Deutschland",
                "DSGVO-konform",
                "AVV in 24 h",
                "SSO & 2FA",
              ].map((label) => (
                <div key={label} className="flex items-center gap-1.5">
                  <CheckCircle2
                    className="size-3.5 shrink-0"
                    style={{ color: "hsl(172,72%,40%)" }}
                  />
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* ─── Browser-frame mockup ─── */}
          <div className="animate-slide-up animate-delay-400 mx-auto max-w-4xl pb-16 sm:pb-20 lg:pb-28">
            {/* Subtle grid pattern behind mockup */}
            <div className="grid-bg relative rounded-2xl p-px">
              <div className="overflow-hidden rounded-2xl border border-gray-200 shadow-2xl shadow-gray-200/60">
                {/* Browser chrome */}
                <div className="flex items-center gap-1.5 border-b border-gray-100 bg-gray-50 px-4 py-3">
                  <span className="size-3 rounded-full bg-red-300" />
                  <span className="size-3 rounded-full bg-yellow-300" />
                  <span className="size-3 rounded-full bg-green-300" />
                  <div className="ml-4 flex-1">
                    <div className="mx-auto max-w-xs rounded-md bg-white px-3 py-1 text-center font-mono text-[11px] text-gray-400 shadow-sm">
                      mastermind.app/app
                    </div>
                  </div>
                </div>

                {/* App content */}
                <div className="grid gap-0 bg-white md:grid-cols-[200px_1fr]">
                  {/* Sidebar */}
                  <aside className="hidden border-r border-gray-100 bg-gray-50/50 md:block">
                    <div className="border-b border-gray-100 px-4 py-3.5">
                      <div
                        className="h-5 w-24 rounded-lg"
                        style={{ background: "hsl(172,72%,40%,0.15)" }}
                      />
                    </div>
                    <div className="space-y-1 p-3">
                      {["Dashboard", "Übungen", "Aufgaben", "Karteikarten", "KI-Tutor", "Noten", "Ranking"].map(
                        (item, i) => (
                          <div
                            key={item}
                            className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-medium ${
                              i === 0
                                ? "text-[hsl(172,72%,40%)]"
                                : "text-gray-400"
                            }`}
                            style={
                              i === 0
                                ? { background: "hsl(172,72%,40%,0.1)" }
                                : {}
                            }
                          >
                            <div
                              className="size-2 rounded-full"
                              style={{
                                background:
                                  i === 0
                                    ? "hsl(172,72%,40%)"
                                    : "hsl(0,0%,80%)",
                              }}
                            />
                            {item}
                          </div>
                        )
                      )}
                    </div>
                  </aside>

                  {/* Main content */}
                  <div className="bg-white p-4 sm:p-6">
                    <div className="mb-5 flex items-center justify-between">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                          Donnerstag, 12. Juni
                        </p>
                        <p className="mt-0.5 text-xl font-bold text-gray-900">
                          Hi Lukas 👋
                        </p>
                      </div>
                      <div className="hidden items-center gap-2 sm:flex">
                        <div
                          className="size-8 rounded-full"
                          style={{ background: "hsl(172,72%,40%,0.15)" }}
                        />
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {[
                        {
                          label: "Streak",
                          value: "14 🔥",
                          gradient: "from-orange-400 to-orange-500",
                        },
                        {
                          label: "XP heute",
                          value: "+320",
                          gradient: "from-teal-400 to-teal-600",
                        },
                        {
                          label: "Münzen",
                          value: "480 🪙",
                          gradient: "from-yellow-400 to-yellow-500",
                        },
                        {
                          label: "Ø Note",
                          value: "2,3",
                          gradient: "from-green-400 to-green-500",
                        },
                      ].map((s) => (
                        <div
                          key={s.label}
                          className="overflow-hidden rounded-xl border border-gray-100 bg-white p-3 shadow-sm"
                        >
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                            {s.label}
                          </p>
                          <p
                            className={`mt-1 bg-linear-to-r ${s.gradient} bg-clip-text font-mono text-base font-bold text-transparent`}
                          >
                            {s.value}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* AI suggestion */}
                    <div
                      className="rounded-xl border p-4"
                      style={{
                        borderColor: "hsl(172,72%,40%,0.2)",
                        background: "hsl(172,72%,40%,0.05)",
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <Zap
                          className="size-3.5"
                          style={{ color: "hsl(172,72%,40%)" }}
                        />
                        <p
                          className="text-[11px] font-bold uppercase tracking-wider"
                          style={{ color: "hsl(172,72%,40%)" }}
                        >
                          KI-Vorschlag
                        </p>
                      </div>
                      <p className="mt-2 text-sm font-medium leading-snug text-gray-700">
                        Du hattest in{" "}
                        <span style={{ color: "hsl(172,72%,40%)" }}>
                          Mathe
                        </span>{" "}
                        eine 3,5. 10 Min. Übung jetzt können die nächste
                        Klassenarbeit verbessern.
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <div
                          className="h-1.5 flex-1 overflow-hidden rounded-full"
                          style={{ background: "hsl(172,72%,40%,0.15)" }}
                        >
                          <div
                            className="h-full w-2/3 rounded-full"
                            style={{ background: "hsl(172,72%,40%)" }}
                          />
                        </div>
                        <span className="text-[11px] text-gray-400">
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

      <DashboardPreviewModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
