/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Flame, Sparkles, Zap } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { DashboardPreviewModal } from "@/components/landing/DashboardPreviewModal";
import { CoinIcon } from "@/components/ui/CoinIcon";
import { HeroGreeting } from "@/components/landing/HeroGreeting";

export function Hero({ loggedInName = null }: { loggedInName?: string | null }) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <section className="relative overflow-hidden">
        {/* Mesh background */}
        <div aria-hidden className="mesh-bg pointer-events-none absolute inset-0" />

        {/* Radial brand glow blob */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-150 w-225 rounded-full"
          style={{
            background:
              "radial-gradient(ellipse at center, hsl(var(--brand) / 0.10) 0%, transparent 70%)",
          }}
        />

        <div className="container-px relative mx-auto max-w-7xl">
          <div className="grid items-center gap-12 pt-16 pb-8 lg:grid-cols-2 lg:gap-20 lg:pt-28 lg:pb-16">

            {/* ─── LEFT: text ─── */}
            <div className="flex flex-col">
              {/* Eyebrow badge */}
              <div className="animate-fade-in inline-flex w-fit items-center gap-2 rounded-full border border-border bg-surface px-4 py-1.5 text-xs font-semibold text-muted-fg shadow-sm">
                <Sparkles className="size-3.5 text-brand" />
                KI-gestütztes Schulmanagement
              </div>

              {/* H1 */}
              <h1 className="animate-fade-in animate-delay-100 mt-8 text-5xl font-bold leading-[1.08] tracking-tight sm:text-6xl lg:text-7xl">
                Die Schule der
                <br />
                <span
                  style={{
                    background: "linear-gradient(-45deg, #6EE7B7 0%, #93C5FD 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  Zukunft.
                </span>
              </h1>

              {/* Subtext */}
              <p className="animate-fade-in animate-delay-200 mt-6 max-w-md text-base leading-relaxed text-muted-fg sm:text-lg">
                KI-Tutor. Gamification. Echtzeit-Noten. —{" "}
                <span className="text-fg">Eine Plattform für alle.</span>
              </p>

              {/* CTA buttons */}
              <div className="animate-fade-in animate-delay-300 mt-10 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/onboarding"
                  className={buttonVariants({
                    size: "lg",
                    className: "pastel-cta w-full font-bold sm:w-auto",
                  })}
                >
                  Schule kostenlos testen
                  <ArrowRight className="size-4" />
                </Link>
                <Link
                  href="/kontakt?betreff=demo"
                  className={buttonVariants({
                    size: "lg",
                    className: "pastel-cta w-full font-bold sm:w-auto",
                  })}
                >
                  30-Min-Demo buchen
                </Link>
              </div>

              {/* "App live erleben" */}
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="animate-fade-in animate-delay-300 mt-5 inline-flex w-fit items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-fg shadow-sm transition-all hover:-translate-y-px hover:border-brand/40 hover:shadow-md"
              >
                <Sparkles className="size-4 text-brand" />
                App live erleben
                <ArrowRight className="size-3.5 text-muted-fg" />
              </button>

              {/* Trust badges */}
              <div className="animate-fade-in animate-delay-300 mt-10 flex flex-wrap items-center gap-5 text-xs text-muted-fg sm:text-sm">
                {[
                  "Server in Deutschland",
                  "DSGVO-konform",
                  "AVV in 24 h",
                  "SSO & 2FA",
                ].map((label) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <CheckCircle2 className="size-3.5 shrink-0 text-brand" />
                    {label}
                  </div>
                ))}
              </div>
            </div>

            {/* ─── RIGHT: app mockup ─── */}
            <div className="relative animate-slide-up animate-delay-400 sm:px-4">
              {/* Floating top-right card: rank — hidden on small screens to avoid overflow */}
              <div className="absolute -top-4 -right-4 z-10 hidden items-center gap-2.5 rounded-2xl border border-border bg-surface px-4 py-3 shadow-lg sm:flex">
                <span className="text-xl">🏆</span>
                <div>
                  <p className="text-xs font-bold text-fg">Rang: Silber III</p>
                  <p className="text-[11px] text-muted-fg">Top 15% der Schule</p>
                </div>
              </div>

              {/* Floating bottom-left card: XP — hidden on small screens to avoid overflow */}
              <div className="absolute -bottom-4 -left-4 z-10 hidden items-center gap-2.5 rounded-2xl border border-border bg-surface px-4 py-3 shadow-lg sm:flex">
                <span className="text-xl">📊</span>
                <div>
                  <p className="text-xs font-bold text-fg">Klasse</p>
                  <p className="text-[11px] text-muted-fg">2.340 XP gesammelt</p>
                </div>
              </div>

              {/* Browser-frame mockup */}
              <div className="animate-float grid-bg relative rounded-2xl p-px">
                <div className="overflow-hidden rounded-2xl border border-border shadow-lg">
                  {/* Browser chrome */}
                  <div className="flex items-center gap-1.5 border-b border-border bg-surface-2 px-4 py-3">
                    <span className="size-3 rounded-full bg-red-300" />
                    <span className="size-3 rounded-full bg-yellow-300" />
                    <span className="size-3 rounded-full bg-green-300" />
                    <div className="ml-4 flex-1">
                      <div className="mx-auto max-w-xs rounded-md bg-surface px-3 py-1 text-center font-mono text-[11px] text-muted-fg shadow-sm">
                        mastermind/app
                      </div>
                    </div>
                  </div>

                  {/* App content */}
                  <div className="grid gap-0 bg-surface md:grid-cols-[200px_1fr]">
                    {/* Sidebar */}
                    <aside className="hidden border-r border-border bg-surface-2/50 md:block">
                      <div className="border-b border-border px-4 py-3.5">
                        <div className="h-5 w-24 rounded-lg bg-brand/15" />
                      </div>
                      <div className="space-y-1 p-3">
                        {["Dashboard", "Übungen", "Aufgaben", "Karteikarten", "KI-Tutor", "Noten", "Ranking"].map(
                          (item, i) => (
                            <div
                              key={item}
                              className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-medium ${
                                i === 0
                                  ? "bg-brand/10 text-brand"
                                  : "text-muted-fg"
                              }`}
                            >
                              <div
                                className={`size-2 rounded-full ${
                                  i === 0 ? "bg-brand" : "bg-border"
                                }`}
                              />
                              {item}
                            </div>
                          )
                        )}
                      </div>
                    </aside>

                    {/* Main content */}
                    <div className="bg-surface p-4 sm:p-6">
                      <div className="mb-5 flex items-center justify-between">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">
                            Donnerstag, 12. Juni
                          </p>
                          <p className="mt-0.5 text-xl font-bold text-fg">
                            <HeroGreeting loggedInName={loggedInName} />
                          </p>
                        </div>
                        <div className="hidden items-center gap-2 sm:flex">
                          <div className="size-8 rounded-full bg-brand/15" />
                        </div>
                      </div>

                      {/* Stat cards */}
                      <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {[
                          { label: "Streak",   value: "14",   gradient: "from-orange-400 to-orange-500", coin: false, flame: true  },
                          { label: "XP Heute", value: "+320", gradient: "from-teal-400 to-teal-600",    coin: false, flame: false },
                          { label: "Münzen",   value: "480",  gradient: "from-yellow-400 to-yellow-500", coin: true,  flame: false },
                          { label: "Ø Note",   value: "2,3",  gradient: "from-green-400 to-green-500",  coin: false, flame: false },
                        ].map((s) => (
                          <div
                            key={s.label}
                            className="overflow-hidden rounded-xl border border-border bg-surface-2/40 p-2.5 shadow-sm"
                          >
                            <p className="truncate text-[9px] font-semibold uppercase tracking-wider text-muted-fg">
                              {s.label}
                            </p>
                            <div className="mt-1 flex min-w-0 items-center gap-1 font-mono text-sm font-bold">
                              <span className={`bg-linear-to-r ${s.gradient} bg-clip-text text-transparent`}>
                                {s.value}
                              </span>
                              {s.flame && <Flame className="size-3.5 shrink-0 text-orange-400" strokeWidth={2} />}
                              {s.coin && <CoinIcon className="size-3.5 shrink-0 text-yellow-500" />}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* KI-Vorschlag card */}
                      <div className="rounded-xl border border-brand/20 bg-brand/5 p-4">
                        <div className="flex items-center gap-2">
                          <Zap className="size-3.5 text-brand" />
                          <p className="text-[11px] font-bold uppercase tracking-wider text-brand">
                            KI-Vorschlag
                          </p>
                        </div>
                        <p className="mt-2 text-sm font-medium leading-snug text-fg">
                          Du hattest in{" "}
                          <span className="text-brand">Mathe</span>{" "}
                          eine 3,5. 10 Min. Übung jetzt können die nächste
                          Klassenarbeit verbessern.
                        </p>
                        <div className="mt-3 flex items-center gap-2">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-brand/15">
                            <div className="h-full w-2/3 rounded-full bg-brand" />
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
        </div>
      </section>

      <DashboardPreviewModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
