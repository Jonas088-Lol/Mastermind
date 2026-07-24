/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  X, ChevronLeft, ChevronRight,
  Home, CheckSquare, Brain, Sparkles, Layers, Award, Trophy, ShoppingBag,
  Flame, Calendar, Calculator, BookOpen, Globe, FlaskConical, Zap, Landmark,
  PenLine, ShieldCheck, Crown, Palette, Bot, Gem,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { CoinIcon } from "@/components/ui/CoinIcon";
import { BrandLogo } from "@/components/BrandLogo";
import { cn } from "@/lib/utils";

export const SCREENS: { id: string; label: string; Icon: LucideIcon }[] = [
  { id: "dashboard", label: "Dashboard",    Icon: Home         },
  { id: "aufgaben",  label: "Aufgaben",     Icon: CheckSquare  },
  { id: "uebungen",  label: "Übungen",      Icon: Brain        },
  { id: "ki-tutor",  label: "KI-Tutor",     Icon: Sparkles     },
  { id: "karten",    label: "Karteikarten", Icon: Layers       },
  { id: "noten",     label: "Noten",        Icon: Award        },
  { id: "ranking",   label: "Ranking",      Icon: Trophy       },
  { id: "shop",      label: "Shop",         Icon: ShoppingBag  },
];

export type ScreenId = "dashboard" | "aufgaben" | "uebungen" | "ki-tutor" | "karten" | "noten" | "ranking" | "shop";

/* ─── Landing-Symboldesign helper ────────────────────────────── */
function LandingIcon({
  Icon,
  color,
  bg,
  size = "size-8",
  iconSize = "size-4",
}: {
  Icon: LucideIcon;
  color: string;
  bg: string;
  size?: string;
  iconSize?: string;
}) {
  return (
    <div
      className={`inline-grid ${size} shrink-0 place-items-center rounded-xl`}
      style={{ backgroundColor: bg, color }}
    >
      <Icon className={`${iconSize} shrink-0`} strokeWidth={1.75} />
    </div>
  );
}

/* ─── Screen mockups (design-token aware) ────────────────────────── */

function DashboardScreen() {
  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">Donnerstag, 12. Juni</p>
        <p className="mt-0.5 text-xl font-bold text-fg">Hi Lukas 👋</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Streak",  value: "14",  Icon: Flame,   iconColor: "#F97316", coin: false },
          { label: "XP",      value: "+320", Icon: null,    iconColor: "",        coin: false },
          { label: "Münzen",  value: "480",  Icon: null,    iconColor: "",        coin: true  },
          { label: "Ø Note",  value: "2,3",  Icon: null,    iconColor: "",        coin: false },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-surface-2 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-fg">{s.label}</p>
            <p className="mt-1 inline-flex items-center gap-1 font-mono text-sm font-bold text-fg">
              {s.value}
              {s.Icon && <s.Icon className="size-3.5 shrink-0" style={{ color: s.iconColor }} strokeWidth={2} />}
              {s.coin && <CoinIcon className="size-3.5 text-warning" />}
            </p>
          </div>
        ))}
      </div>

      {/* KI-Vorschlag */}
      <div className="rounded-xl border border-brand/20 bg-brand/5 p-4">
        <div className="flex items-center gap-1.5">
          <Sparkles className="size-3.5 shrink-0 text-brand" strokeWidth={1.75} />
          <p className="text-[10px] font-bold uppercase tracking-wider text-brand">KI-Vorschlag</p>
        </div>
        <p className="mt-1.5 text-sm font-medium text-fg">
          Du hattest in <span className="text-brand">Mathe</span> eine 3,5. 10 Min. Übung können die nächste Klassenarbeit verbessern.
        </p>
        <div className="mt-3 flex items-center gap-2">
          <div className="h-1.5 flex-1 rounded-full bg-brand/15">
            <div className="h-1.5 w-2/3 rounded-full bg-brand" />
          </div>
          <span className="text-[10px] text-muted-fg">Übung starten →</span>
        </div>
      </div>

      {/* Today's tasks */}
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-fg">Heutige Aufgaben</p>
        <div className="space-y-2">
          {[
            { subject: "Mathe",    task: "Aufgabenblatt 12 — Differentialrechnung", color: "#3B82F6" },
            { subject: "Deutsch",  task: "Aufsatz: Erörterung Medienwandel",        color: "#8B5CF6" },
            { subject: "Biologie", task: "Lernzettel Photosynthese (bis Freitag)",  color: "#10B981" },
          ].map((a) => (
            <div key={a.task} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
              <div className="h-8 w-1 rounded-full" style={{ backgroundColor: a.color }} />
              <div className="min-w-0">
                <p className="text-[10px] font-semibold" style={{ color: a.color }}>{a.subject}</p>
                <p className="truncate text-xs font-medium text-fg">{a.task}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* Map each task to a Lucide icon for Landing-Symboldesign */
const TASK_ICONS: Record<string, LucideIcon> = {
  MA: Calculator,
  DE: PenLine,
  BIO: BookOpen,
};

function AufgabenScreen() {
  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-5">
      <p className="text-lg font-bold text-fg">Meine Aufgaben</p>
      {[
        {
          subject: "Mathematik", short: "MA", color: "#3B82F6",
          items: [
            { title: "Differentialrechnung Aufgabenblatt", due: "Heute",      status: "open" },
            { title: "Lineare Gleichungen Quiz",           due: "Morgen",     status: "open" },
          ],
        },
        {
          subject: "Deutsch", short: "DE", color: "#8B5CF6",
          items: [
            { title: "Erörterung: Medienwandel", due: "Fr, 14. Jun", status: "submitted" },
            { title: "Buchvorstellung vorbereiten", due: "Mo, 17. Jun", status: "open" },
          ],
        },
        {
          subject: "Biologie", short: "BIO", color: "#10B981",
          items: [
            { title: "Lernzettel Photosynthese", due: "Fr, 14. Jun", status: "open" },
            { title: "Mitose-Diagramm zeichnen", due: "Di, 18. Jun", status: "open" },
          ],
        },
      ].map((subj) => {
        const TaskIcon = TASK_ICONS[subj.short] ?? CheckSquare;
        return (
          <div key={subj.subject}>
            <div className="mb-2 flex items-center gap-2">
              <span className="rounded-md px-2 py-0.5 text-[11px] font-bold" style={{ backgroundColor: subj.color + "18", color: subj.color }}>{subj.short}</span>
              <span className="text-xs font-semibold text-muted-fg">{subj.subject}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {subj.items.map((item) => (
                <div key={item.title} className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
                  {/* Landing-Symboldesign header */}
                  <div
                    className="flex h-16 items-center justify-center"
                    style={{ backgroundColor: subj.color + "12" }}
                  >
                    <div
                      className="inline-grid size-9 place-items-center rounded-xl"
                      style={{ backgroundColor: subj.color + "25", color: subj.color }}
                    >
                      <TaskIcon className="size-5" strokeWidth={1.75} />
                    </div>
                  </div>
                  <div className="p-2.5">
                    <p className="text-[11px] font-semibold leading-tight text-fg line-clamp-2">{item.title}</p>
                    <div className="mt-1.5 flex items-center justify-between">
                      {/* In-App calendar icon */}
                      <span className="inline-flex items-center gap-1 text-[10px] text-muted-fg">
                        <Calendar className="size-3 shrink-0" strokeWidth={1.75} />
                        {item.due}
                      </span>
                      <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-bold", item.status === "open" ? "bg-warning/10 text-warning" : "bg-brand/10 text-brand")}>
                        {item.status === "open" ? "Offen" : "Abgegeben"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const SUBJECT_ICONS: { Icon: LucideIcon; color: string }[] = [
  { Icon: Calculator,   color: "#3B82F6" },
  { Icon: BookOpen,     color: "#8B5CF6" },
  { Icon: Globe,        color: "#F59E0B" },
  { Icon: FlaskConical, color: "#10B981" },
  { Icon: Zap,          color: "#EC4899" },
  { Icon: Landmark,     color: "#F97316" },
];

function UebungenScreen() {
  const subjects = [
    { subject: "Mathematik", topics: 14, done: 9  },
    { subject: "Deutsch",    topics: 10, done: 4  },
    { subject: "Englisch",   topics: 12, done: 12 },
    { subject: "Biologie",   topics: 8,  done: 3  },
    { subject: "Physik",     topics: 9,  done: 5  },
    { subject: "Geschichte", topics: 7,  done: 2  },
  ];

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-5">
      <p className="text-lg font-bold text-fg">Übungen</p>
      <div className="grid grid-cols-2 gap-3">
        {subjects.map((s, i) => {
          const { Icon, color } = SUBJECT_ICONS[i];
          return (
            <div key={s.subject} className="rounded-xl border border-border bg-surface p-3 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                {/* Landing-Symboldesign */}
                <div
                  className="inline-grid size-8 shrink-0 place-items-center rounded-xl"
                  style={{ backgroundColor: color + "18", color }}
                >
                  <Icon className="size-4" strokeWidth={1.75} />
                </div>
                <p className="text-xs font-bold text-fg">{s.subject}</p>
              </div>
              <div className="mb-1 flex justify-between text-[10px]">
                <span className="text-muted-fg">{s.done}/{s.topics} Themen</span>
                <span className="font-bold" style={{ color }}>{Math.round((s.done / s.topics) * 100)} %</span>
              </div>
              <div className="h-1.5 rounded-full bg-border">
                <div className="h-1.5 rounded-full" style={{ width: `${(s.done / s.topics) * 100}%`, backgroundColor: color }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function KiTutorScreen() {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b border-border bg-surface-2 px-5 py-3">
        <div className="flex items-center gap-1.5">
          <Sparkles className="size-3.5 shrink-0 text-brand" strokeWidth={1.75} />
          <p className="text-sm font-bold text-fg">KI-Tutor</p>
        </div>
        <p className="text-[10px] text-muted-fg">Dein persönlicher Lernassistent</p>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-bg">
        {[
          { role: "user", text: "Kannst du mir die Ableitung von x³ erklären?" },
          { role: "ai",   text: "Klar! Die Ableitung von x³ berechnest du mit der Potenzregel:\n\nd/dx(xⁿ) = n · xⁿ⁻¹\n\nFür x³ bedeutet das: 3 · x² Also ist f'(x) = 3x². Willst du ein Beispiel damit rechnen?" },
          { role: "user", text: "Ja, wie wäre es mit x = 2?" },
          { role: "ai",   text: "Super! Wenn x = 2 dann ist f'(2) = 3 · 2² = 3 · 4 = 12. Das ist die Steigung der Kurve an der Stelle x=2." },
        ].map((msg, i) => (
          <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
            {msg.role === "ai" && (
              <div className="mr-2 flex size-6 shrink-0 items-center justify-center rounded-full bg-brand/15">
                <Sparkles className="size-3.5 text-brand" strokeWidth={1.75} />
              </div>
            )}
            <div className={cn(
              "max-w-[80%] rounded-2xl px-3 py-2 text-[11px] leading-relaxed whitespace-pre-line",
              msg.role === "user" ? "bg-brand text-brand-fg" : "bg-surface border border-border text-fg shadow-sm"
            )}>
              {msg.text}
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-border bg-surface-2 p-3">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2">
          <p className="flex-1 text-[11px] text-muted-fg">Frage stellen…</p>
          <div className="grid size-6 place-items-center rounded-lg bg-brand text-brand-fg text-xs">↑</div>
        </div>
      </div>
    </div>
  );
}

function KarteikartendScreen() {
  return (
    <div className="flex h-full flex-col gap-4 p-5">
      <p className="text-lg font-bold text-fg">Karteikarten</p>
      <div className="flex gap-2 flex-wrap">
        {[
          { name: "Mathe Grundlagen",  count: 45,  color: "#3B82F6" },
          { name: "Vokabeln Englisch", count: 120, color: "#F59E0B" },
          { name: "Bio Zelle",         count: 32,  color: "#10B981" },
        ].map((deck) => (
          <div key={deck.name} className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 shadow-sm">
            <div className="size-3 rounded-full" style={{ backgroundColor: deck.color }} />
            <span className="text-xs font-semibold text-fg">{deck.name}</span>
            <span className="rounded-full bg-surface-2 px-1.5 py-0.5 text-[10px] text-muted-fg">{deck.count}</span>
          </div>
        ))}
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-sm">
          <div className="rounded-3xl border border-brand/20 bg-brand/5 p-8 text-center shadow-lg">
            <p className="text-[10px] font-bold uppercase tracking-widest text-brand mb-4">Frage 12 von 45</p>
            <p className="text-lg font-bold text-fg">Was ist die Ableitung von sin(x)?</p>
            <p className="mt-2 text-xs text-muted-fg">(Tippe auf die Karte, um die Antwort zu sehen)</p>
          </div>
          <div className="mt-4 flex justify-center gap-3">
            <div className="flex items-center gap-1.5 rounded-xl border border-danger/20 bg-danger/5 px-4 py-2 text-xs font-semibold text-danger">✗ Nochmal</div>
            <div className="flex items-center gap-1.5 rounded-xl border border-success/20 bg-success/5 px-4 py-2 text-xs font-semibold text-success">✓ Gewusst</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NotenScreen() {
  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-5">
      <div className="flex items-center justify-between">
        <p className="text-lg font-bold text-fg">Meine Noten</p>
        <div className="rounded-xl bg-brand/8 px-3 py-1.5 text-center">
          <p className="text-[10px] text-brand font-semibold">Ø gesamt</p>
          <p className="text-lg font-bold text-brand">2,3</p>
        </div>
      </div>
      <div className="space-y-2">
        {[
          { subject: "Mathematik", grade: 2.0, trend: "↑", color: "#3B82F6" },
          { subject: "Deutsch",    grade: 2.5, trend: "→", color: "#8B5CF6" },
          { subject: "Englisch",   grade: 1.5, trend: "↑", color: "#F59E0B" },
          { subject: "Biologie",   grade: 3.0, trend: "↓", color: "#10B981" },
          { subject: "Physik",     grade: 2.5, trend: "→", color: "#EC4899" },
          { subject: "Geschichte", grade: 2.0, trend: "↑", color: "#F97316" },
        ].map((s) => (
          <div key={s.subject} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
            <div className="h-8 w-1 rounded-full" style={{ backgroundColor: s.color }} />
            <p className="flex-1 text-xs font-semibold text-fg">{s.subject}</p>
            <span className="text-[11px] text-muted-fg">{s.trend}</span>
            <div className="grid size-9 place-items-center rounded-xl font-mono text-sm font-bold" style={{ backgroundColor: s.color + "15", color: s.color }}>
              {s.grade.toFixed(1)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RankingScreen() {
  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-5">
      <p className="text-lg font-bold text-fg">Klassen-Ranking</p>
      <div className="rounded-xl border border-brand/20 bg-brand/5 p-4 flex items-center gap-4">
        <div className="text-3xl">🥈</div>
        <div className="flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-brand">Mein Rang</p>
          <p className="text-base font-bold text-fg">Silber III</p>
          <div className="mt-1.5 h-1.5 w-full rounded-full bg-brand/15">
            <div className="h-1.5 w-[65%] rounded-full bg-brand" />
          </div>
          <p className="mt-0.5 text-[10px] text-brand/70">6.500 / 10.000 XP → Gold I</p>
        </div>
      </div>
      <div className="space-y-2">
        {[
          { pos: 1, name: "Anna K.",   xp: "12.340", medal: "🥇", isMe: false },
          { pos: 2, name: "Lukas M.",  xp: "11.200", medal: "🥈", isMe: true  },
          { pos: 3, name: "Sophie B.", xp: "10.800", medal: "🥉", isMe: false },
          { pos: 4, name: "Tim H.",    xp: "9.650",  medal: null,  isMe: false },
          { pos: 5, name: "Mia L.",    xp: "8.900",  medal: null,  isMe: false },
        ].map((p) => (
          <div key={p.pos} className={cn(
            "flex items-center gap-3 rounded-xl border p-3",
            p.isMe ? "border-brand/30 bg-brand/8" : "border-border bg-surface"
          )}>
            {/* Medal or In-App-Symboldesign position number */}
            {p.medal ? (
              <span className="text-lg w-7 text-center shrink-0">{p.medal}</span>
            ) : (
              <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-2 font-mono text-xs font-bold text-muted-fg">
                {p.pos}
              </span>
            )}
            <p className={cn("flex-1 text-xs font-semibold", p.isMe ? "text-brand" : "text-fg")}>
              {p.name}{p.isMe && " (Du)"}
            </p>
            <span className="font-mono text-xs font-bold text-muted-fg">{p.xp} XP</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const SHOP_ITEMS: {
  Icon: LucideIcon;
  name: string;
  desc: string;
  price: number;
  rarity: string;
  rarityColor: string;
}[] = [
  { Icon: Zap,         name: "XP-Booster ×2", desc: "1 Stunde",    price: 90,  rarity: "Selten",       rarityColor: "#3B82F6" },
  { Icon: Gem,         name: "XP-Booster ×2", desc: "24 Stunden",  price: 350, rarity: "Episch",       rarityColor: "#8B5CF6" },
  { Icon: ShieldCheck, name: "Streak-Schutz", desc: "3 Tage",      price: 200, rarity: "Ungewöhnlich", rarityColor: "#10B981" },
  { Icon: Crown,       name: "Kronen-Badge",  desc: "Profil-Deko", price: 300, rarity: "Selten",       rarityColor: "#3B82F6" },
  { Icon: Palette,     name: "Profil-Rahmen", desc: "Blaue Aura",  price: 150, rarity: "Gewöhnlich",   rarityColor: "#6B7280" },
  { Icon: Bot,         name: "KI-Credits",    desc: "+10 Anfragen", price: 120, rarity: "Ungewöhnlich", rarityColor: "#10B981" },
];

function ShopScreen() {
  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-5">
      <div className="flex items-center justify-between">
        <p className="text-lg font-bold text-fg">Shop</p>
        <div className="flex items-center gap-1.5 rounded-xl bg-warning/10 px-3 py-1.5 text-sm font-bold text-warning">
          <CoinIcon className="size-4" /> 480
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {SHOP_ITEMS.map((item) => (
          <div key={item.name + item.desc} className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
            {/* Landing-Symboldesign header */}
            <div
              className="flex h-14 items-center justify-center"
              style={{ backgroundColor: item.rarityColor + "12" }}
            >
              <div
                className="inline-grid size-9 place-items-center rounded-xl"
                style={{ backgroundColor: item.rarityColor + "22", color: item.rarityColor }}
              >
                <item.Icon className="size-5" strokeWidth={1.75} />
              </div>
            </div>
            <div className="p-2.5">
              <div className="flex items-start justify-between gap-1">
                <p className="text-[11px] font-bold text-fg leading-tight">{item.name}</p>
                <span
                  className="shrink-0 rounded px-1 py-0.5 text-[8px] font-bold"
                  style={{ backgroundColor: item.rarityColor + "18", color: item.rarityColor }}
                >
                  {item.rarity}
                </span>
              </div>
              <p className="text-[10px] text-muted-fg">{item.desc}</p>
              <div className="mt-2 flex items-center justify-between">
                <span className="inline-flex items-center gap-0.5 font-mono text-xs font-bold text-warning">
                  <CoinIcon className="size-3.5" /> {item.price}
                </span>
                <div className="rounded-lg bg-brand px-2 py-1 text-[9px] font-bold text-brand-fg">Kaufen</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export const SCREEN_COMPONENTS: Record<ScreenId, () => React.JSX.Element> = {
  dashboard:  DashboardScreen,
  aufgaben:   AufgabenScreen,
  uebungen:   UebungenScreen,
  "ki-tutor": KiTutorScreen,
  karten:     KarteikartendScreen,
  noten:      NotenScreen,
  ranking:    RankingScreen,
  shop:       ShopScreen,
};

/* ─── Modal ──────────────────────────────────────────────────────── */

interface Props {
  open: boolean;
  onClose: () => void;
}

export function DashboardPreviewModal({ open, onClose }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState<"left" | "right">("right");

  const goTo = useCallback((idx: number, dir?: "left" | "right") => {
    setDirection(dir ?? (idx > activeIndex ? "right" : "left"));
    setActiveIndex(idx);
  }, [activeIndex]);

  const prev = useCallback(() => {
    goTo((activeIndex - 1 + SCREENS.length) % SCREENS.length, "left");
  }, [activeIndex, goTo]);

  const next = useCallback(() => {
    goTo((activeIndex + 1) % SCREENS.length, "right");
  }, [activeIndex, goTo]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose, prev, next]);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  const activeScreen = SCREENS[activeIndex];
  const ScreenComponent = SCREEN_COMPONENTS[activeScreen.id as ScreenId];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8"
      style={{ backgroundColor: "rgba(0,0,0,0.65)", backdropFilter: "blur(12px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative flex h-full max-h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
        style={{ animation: "scale-in 0.25s ease-out" }}
      >
        {/* Browser chrome */}
        <div className="flex shrink-0 items-center gap-1.5 border-b border-border bg-surface-2 px-4 py-3">
          <div className="size-3 rounded-full bg-red-400 opacity-60" />
          <div className="size-3 rounded-full bg-yellow-400 opacity-70" />
          <div className="size-3 rounded-full bg-green-400 opacity-70" />
          <div className="mx-4 flex-1">
            {/* 1.1.2 — no ".app" */}
            <div className="mx-auto max-w-xs rounded-md border border-border bg-surface px-3 py-1 text-center font-mono text-[10px] text-muted-fg">
              mastermind/{activeScreen.id}
            </div>
          </div>
          <button
            onClick={onClose}
            className="ml-auto grid size-7 place-items-center rounded-lg text-muted-fg transition-colors hover:bg-surface hover:text-fg"
            aria-label="Schließen"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* App layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <aside className="hidden w-48 shrink-0 flex-col border-r border-border bg-surface-2 sm:flex">
            {/* 1.1.1 — Logo + MasterMind text */}
            <div className="border-b border-border px-4 py-3">
              <BrandLogo height="h-6" showName />
            </div>
            <nav className="flex-1 space-y-0.5 p-2">
              {SCREENS.map((screen, i) => (
                <button
                  key={screen.id}
                  onClick={() => goTo(i)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-medium transition-all",
                    i === activeIndex
                      ? "bg-brand/10 text-brand font-semibold"
                      : "text-muted-fg hover:bg-surface hover:text-fg"
                  )}
                >
                  <screen.Icon className="size-3.5 shrink-0" strokeWidth={1.75} />
                  {screen.label}
                  {i === activeIndex && (
                    <div className="ml-auto size-1.5 rounded-full bg-brand" />
                  )}
                </button>
              ))}
            </nav>
            {/* User row */}
            <div className="border-t border-border p-3">
              <div className="flex items-center gap-2">
                <div className="grid size-7 place-items-center rounded-full bg-brand/15 text-xs font-bold text-brand">L</div>
                <div>
                  <p className="text-[11px] font-semibold text-fg">Lukas M.</p>
                  <p className="text-[9px] text-muted-fg">Klasse 10b</p>
                </div>
              </div>
            </div>
          </aside>

          {/* Main content with slide animation */}
          <div className="relative flex-1 overflow-hidden bg-bg">
            <div
              key={activeIndex}
              className="h-full w-full"
              style={{
                animation: `slide-in-${direction} 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)`,
              }}
            >
              <ScreenComponent />
            </div>
          </div>
        </div>

        {/* Bottom navigation */}
        <div className="flex shrink-0 items-center justify-between border-t border-border bg-surface px-5 py-3">
          <button
            onClick={prev}
            className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-muted-fg transition-all hover:border-border-strong hover:text-fg"
          >
            <ChevronLeft className="size-3.5" />
            Zurück
          </button>

          {/* Dots */}
          <div className="flex items-center gap-1.5">
            {SCREENS.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={cn(
                  "rounded-full transition-all duration-200",
                  i === activeIndex
                    ? "w-6 h-2 bg-brand"
                    : "size-2 bg-border hover:bg-border-strong"
                )}
                aria-label={SCREENS[i].label}
              />
            ))}
          </div>

          <button
            onClick={next}
            className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-muted-fg transition-all hover:border-border-strong hover:text-fg"
          >
            Weiter
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
