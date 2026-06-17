"use client";

import { useState, useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/* ─── Screen mockup data ─────────────────────────────────────────── */

const SCREENS = [
  { id: "dashboard", label: "Dashboard", icon: "🏠" },
  { id: "aufgaben",  label: "Aufgaben",  icon: "📋" },
  { id: "uebungen",  label: "Übungen",   icon: "🧠" },
  { id: "ki-tutor",  label: "KI-Tutor",  icon: "✨" },
  { id: "karten",    label: "Karteikarten", icon: "🃏" },
  { id: "noten",     label: "Noten",     icon: "📊" },
  { id: "ranking",   label: "Ranking",   icon: "🏆" },
  { id: "shop",      label: "Shop",      icon: "🛒" },
] as const;

type ScreenId = (typeof SCREENS)[number]["id"];

/* ─── Individual screen mockups ──────────────────────────────────── */

function DashboardScreen() {
  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Donnerstag, 12. Juni</p>
        <p className="mt-0.5 text-xl font-bold text-gray-900">Hi Lukas 👋</p>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Streak", value: "14 🔥", bg: "bg-orange-50", text: "text-orange-600", border: "border-orange-100" },
          { label: "XP",     value: "+320",  bg: "bg-teal-50",   text: "text-teal-600",   border: "border-teal-100" },
          { label: "Münzen", value: "480 🪙", bg: "bg-yellow-50", text: "text-yellow-600", border: "border-yellow-100" },
          { label: "Ø Note", value: "2,3",   bg: "bg-green-50",  text: "text-green-600",  border: "border-green-100" },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border ${s.border} ${s.bg} p-3`}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{s.label}</p>
            <p className={`mt-1 font-mono text-sm font-bold ${s.text}`}>{s.value}</p>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-teal-200 bg-teal-50 p-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-teal-600">✨ KI-Vorschlag</p>
        <p className="mt-1.5 text-sm font-medium text-gray-800">Du hattest in <span className="text-teal-600">Mathe</span> eine 3,5. 10 Min. Übung können die nächste Klassenarbeit verbessern.</p>
        <div className="mt-3 flex items-center gap-2">
          <div className="h-1.5 flex-1 rounded-full bg-teal-100">
            <div className="h-1.5 w-2/3 rounded-full bg-teal-500" />
          </div>
          <span className="text-[10px] text-gray-400">Übung starten →</span>
        </div>
      </div>
      <div>
        <p className="mb-2 text-xs font-bold text-gray-500 uppercase tracking-wider">Heutige Aufgaben</p>
        <div className="space-y-2">
          {[
            { subject: "Mathe", task: "Aufgabenblatt 12 — Differentialrechnung", color: "#3B82F6" },
            { subject: "Deutsch", task: "Aufsatz: Erörterung Medienwandel", color: "#8B5CF6" },
            { subject: "Biologie", task: "Lernzettel Photosynthese (bis Freitag)", color: "#10B981" },
          ].map((a) => (
            <div key={a.task} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-3">
              <div className="h-8 w-1 rounded-full" style={{ backgroundColor: a.color }} />
              <div className="min-w-0">
                <p className="text-[10px] font-semibold" style={{ color: a.color }}>{a.subject}</p>
                <p className="truncate text-xs font-medium text-gray-700">{a.task}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AufgabenScreen() {
  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-5">
      <p className="text-lg font-bold text-gray-900">Meine Aufgaben</p>
      {[
        {
          subject: "Mathematik", short: "MA", color: "#3B82F6",
          items: [
            { title: "Differentialrechnung Aufgabenblatt", emoji: "📐", due: "Heute", status: "open" },
            { title: "Lineare Gleichungen Quiz", emoji: "🧮", due: "Morgen", status: "open" },
          ],
        },
        {
          subject: "Deutsch", short: "DE", color: "#8B5CF6",
          items: [
            { title: "Erörterung: Medienwandel", emoji: "✍️", due: "Fr, 14. Jun", status: "submitted" },
          ],
        },
        {
          subject: "Biologie", short: "BIO", color: "#10B981",
          items: [
            { title: "Lernzettel Photosynthese", emoji: "🌿", due: "Fr, 14. Jun", status: "open" },
          ],
        },
      ].map((subj) => (
        <div key={subj.subject}>
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded-md px-2 py-0.5 text-[11px] font-bold" style={{ backgroundColor: subj.color + "18", color: subj.color }}>{subj.short}</span>
            <span className="text-xs font-semibold text-gray-600">{subj.subject}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {subj.items.map((item) => (
              <div key={item.title} className="rounded-xl border border-gray-100 bg-white overflow-hidden shadow-sm">
                <div className="flex h-16 items-center justify-center" style={{ background: `linear-gradient(135deg, ${subj.color}cc, ${subj.color}88)` }}>
                  <span className="text-3xl">{item.emoji}</span>
                </div>
                <div className="p-2.5">
                  <p className="text-[11px] font-semibold leading-tight text-gray-800 line-clamp-2">{item.title}</p>
                  <div className="mt-1.5 flex items-center justify-between">
                    <span className="text-[10px] text-gray-400">📅 {item.due}</span>
                    <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${item.status === "open" ? "bg-amber-50 text-amber-600" : "bg-sky-50 text-sky-600"}`}>
                      {item.status === "open" ? "Offen" : "Abgegeben"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function UebungenScreen() {
  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-5">
      <p className="text-lg font-bold text-gray-900">Übungen</p>
      <div className="grid grid-cols-2 gap-3">
        {[
          { subject: "Mathematik", topics: 14, done: 9, color: "#3B82F6", emoji: "🧮" },
          { subject: "Deutsch", topics: 10, done: 4, color: "#8B5CF6", emoji: "📖" },
          { subject: "Englisch", topics: 12, done: 12, color: "#F59E0B", emoji: "🌍" },
          { subject: "Biologie", topics: 8, done: 3, color: "#10B981", emoji: "🔬" },
          { subject: "Physik", topics: 9, done: 5, color: "#EC4899", emoji: "⚡" },
          { subject: "Geschichte", topics: 7, done: 2, color: "#F97316", emoji: "🏛️" },
        ].map((s) => (
          <div key={s.subject} className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{s.emoji}</span>
              <p className="text-xs font-bold text-gray-800">{s.subject}</p>
            </div>
            <div className="mb-1 flex justify-between text-[10px]">
              <span className="text-gray-400">{s.done}/{s.topics} Themen</span>
              <span className="font-bold" style={{ color: s.color }}>{Math.round((s.done / s.topics) * 100)} %</span>
            </div>
            <div className="h-1.5 rounded-full bg-gray-100">
              <div className="h-1.5 rounded-full transition-all" style={{ width: `${(s.done / s.topics) * 100}%`, backgroundColor: s.color }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function KiTutorScreen() {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b border-gray-100 bg-white px-5 py-3">
        <p className="text-sm font-bold text-gray-900">✨ KI-Tutor</p>
        <p className="text-[10px] text-gray-400">Dein persönlicher Lernassistent</p>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {[
          { role: "user", text: "Kannst du mir die Ableitung von x³ erklären?" },
          { role: "ai", text: "Klar! Die Ableitung von x³ berechnest du mit der Potenzregel:\n\nd/dx(xⁿ) = n · xⁿ⁻¹\n\nFür x³ bedeutet das: 3 · x² Also ist f'(x) = 3x². Willst du ein Beispiel damit rechnen?" },
          { role: "user", text: "Ja, wie wäre es mit x = 2?" },
          { role: "ai", text: "Super! Wenn x = 2 dann ist f'(2) = 3 · 2² = 3 · 4 = 12. Das ist die Steigung der Kurve an der Stelle x=2. 🎯" },
        ].map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "ai" && (
              <div className="mr-2 flex size-6 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs">✨</div>
            )}
            <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-[11px] leading-relaxed whitespace-pre-line ${msg.role === "user" ? "bg-teal-500 text-white" : "bg-white border border-gray-100 text-gray-800 shadow-sm"}`}>
              {msg.text}
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-gray-100 bg-white p-3">
        <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
          <p className="flex-1 text-[11px] text-gray-400">Frage stellen…</p>
          <div className="grid size-6 place-items-center rounded-lg bg-teal-500 text-white text-xs">↑</div>
        </div>
      </div>
    </div>
  );
}

function KarteikartendScreen() {
  return (
    <div className="flex h-full flex-col gap-4 p-5">
      <p className="text-lg font-bold text-gray-900">Karteikarten</p>
      <div className="flex gap-2 flex-wrap">
        {[
          { name: "Mathe Grundlagen", count: 45, color: "#3B82F6" },
          { name: "Vokabeln Englisch", count: 120, color: "#F59E0B" },
          { name: "Bio Zelle", count: 32, color: "#10B981" },
        ].map((deck) => (
          <div key={deck.name} className="flex items-center gap-2 rounded-xl border border-gray-100 bg-white px-3 py-2 shadow-sm">
            <div className="size-3 rounded-full" style={{ backgroundColor: deck.color }} />
            <span className="text-xs font-semibold text-gray-700">{deck.name}</span>
            <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">{deck.count}</span>
          </div>
        ))}
      </div>
      {/* Flashcard */}
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-sm">
          <div className="rounded-3xl border border-teal-200 bg-gradient-to-br from-teal-50 to-emerald-50 p-8 text-center shadow-lg">
            <p className="text-[10px] font-bold uppercase tracking-widest text-teal-400 mb-4">Frage 12 von 45</p>
            <p className="text-lg font-bold text-gray-900">Was ist die Ableitung von sin(x)?</p>
            <p className="mt-2 text-xs text-gray-400">(Tippe auf die Karte, um die Antwort zu sehen)</p>
          </div>
          <div className="mt-4 flex justify-center gap-3">
            <div className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-500">✗ Nochmal</div>
            <div className="flex items-center gap-1.5 rounded-xl border border-green-200 bg-green-50 px-4 py-2 text-xs font-semibold text-green-500">✓ Gewusst</div>
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
        <p className="text-lg font-bold text-gray-900">Meine Noten</p>
        <div className="rounded-xl bg-teal-50 px-3 py-1.5 text-center">
          <p className="text-[10px] text-teal-500 font-semibold">Ø gesamt</p>
          <p className="text-lg font-bold text-teal-600">2,3</p>
        </div>
      </div>
      <div className="space-y-2">
        {[
          { subject: "Mathematik", grade: 2.0, trend: "↑", color: "#3B82F6" },
          { subject: "Deutsch", grade: 2.5, trend: "→", color: "#8B5CF6" },
          { subject: "Englisch", grade: 1.5, trend: "↑", color: "#F59E0B" },
          { subject: "Biologie", grade: 3.0, trend: "↓", color: "#10B981" },
          { subject: "Physik", grade: 2.5, trend: "→", color: "#EC4899" },
          { subject: "Geschichte", grade: 2.0, trend: "↑", color: "#F97316" },
        ].map((s) => (
          <div key={s.subject} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-3">
            <div className="h-8 w-1 rounded-full" style={{ backgroundColor: s.color }} />
            <p className="flex-1 text-xs font-semibold text-gray-700">{s.subject}</p>
            <span className="text-[11px] text-gray-400">{s.trend}</span>
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
      <p className="text-lg font-bold text-gray-900">Klassen-Ranking</p>
      {/* My rank */}
      <div className="rounded-xl border border-teal-200 bg-gradient-to-r from-teal-50 to-emerald-50 p-4 flex items-center gap-4">
        <div className="text-3xl">🥈</div>
        <div className="flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-teal-500">Mein Rang</p>
          <p className="text-base font-bold text-gray-900">Silber III</p>
          <div className="mt-1.5 h-1.5 w-full rounded-full bg-teal-100">
            <div className="h-1.5 w-[65%] rounded-full bg-teal-500" />
          </div>
          <p className="mt-0.5 text-[10px] text-teal-400">6.500 / 10.000 XP → Gold I</p>
        </div>
      </div>
      {/* Leaderboard */}
      <div className="space-y-2">
        {[
          { pos: 1, name: "Anna K.", xp: "12.340", emoji: "🥇" },
          { pos: 2, name: "Lukas M.", xp: "11.200", emoji: "🥈", isMe: true },
          { pos: 3, name: "Sophie B.", xp: "10.800", emoji: "🥉" },
          { pos: 4, name: "Tim H.", xp: "9.650", emoji: "4️⃣" },
          { pos: 5, name: "Mia L.", xp: "8.900", emoji: "5️⃣" },
        ].map((p) => (
          <div key={p.pos} className={`flex items-center gap-3 rounded-xl border p-3 ${p.isMe ? "border-teal-200 bg-teal-50" : "border-gray-100 bg-white"}`}>
            <span className="text-lg">{p.emoji}</span>
            <p className={`flex-1 text-xs font-semibold ${p.isMe ? "text-teal-700" : "text-gray-700"}`}>{p.name}{p.isMe && " (Du)"}</p>
            <span className="font-mono text-xs font-bold text-gray-500">{p.xp} XP</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ShopScreen() {
  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-5">
      <div className="flex items-center justify-between">
        <p className="text-lg font-bold text-gray-900">Shop</p>
        <div className="flex items-center gap-1.5 rounded-xl bg-yellow-50 px-3 py-1.5 text-sm font-bold text-yellow-600">
          🪙 480
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: "🚀", name: "XP-Booster ×2", desc: "1 Stunde", price: 90, rarity: "Selten", rarityColor: "#3B82F6" },
          { icon: "💎", name: "XP-Booster ×2", desc: "24 Stunden", price: 350, rarity: "Episch", rarityColor: "#8B5CF6" },
          { icon: "🛡️", name: "Streak-Schutz", desc: "3 Tage", price: 200, rarity: "Ungewöhnlich", rarityColor: "#10B981" },
          { icon: "👑", name: "Kronen-Badge", desc: "Profil-Deko", price: 300, rarity: "Selten", rarityColor: "#3B82F6" },
          { icon: "🎭", name: "Profil-Rahmen", desc: "Blaue Aura", price: 150, rarity: "Gewöhnlich", rarityColor: "#6B7280" },
          { icon: "⚡", name: "KI-Credits", desc: "+10 Anfragen", price: 120, rarity: "Ungewöhnlich", rarityColor: "#10B981" },
        ].map((item) => (
          <div key={item.name + item.desc} className="rounded-xl border border-gray-100 bg-white overflow-hidden shadow-sm">
            <div className="flex h-16 items-center justify-center text-3xl" style={{ background: `linear-gradient(135deg, ${item.rarityColor}22, ${item.rarityColor}11)` }}>
              {item.icon}
            </div>
            <div className="p-2.5">
              <div className="flex items-start justify-between gap-1">
                <p className="text-[11px] font-bold text-gray-800 leading-tight">{item.name}</p>
                <span className="shrink-0 rounded px-1 py-0.5 text-[8px] font-bold" style={{ backgroundColor: item.rarityColor + "18", color: item.rarityColor }}>{item.rarity}</span>
              </div>
              <p className="text-[10px] text-gray-400">{item.desc}</p>
              <div className="mt-2 flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-yellow-600">🪙 {item.price}</span>
                <div className="rounded-lg bg-teal-500 px-2 py-1 text-[9px] font-bold text-white">Kaufen</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const SCREEN_COMPONENTS: Record<ScreenId, () => React.JSX.Element> = {
  dashboard: DashboardScreen,
  aufgaben:  AufgabenScreen,
  uebungen:  UebungenScreen,
  "ki-tutor": KiTutorScreen,
  karten:    KarteikartendScreen,
  noten:     NotenScreen,
  ranking:   RankingScreen,
  shop:      ShopScreen,
};

/* ─── Modal component ────────────────────────────────────────────── */

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
  const ScreenComponent = SCREEN_COMPONENTS[activeScreen.id];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8"
      style={{ backgroundColor: "rgba(0,0,0,0.65)", backdropFilter: "blur(12px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative flex h-full max-h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        style={{ animation: "scale-in 0.25s ease-out" }}
      >
        {/* Browser chrome */}
        <div className="flex shrink-0 items-center gap-1.5 border-b border-gray-200 bg-gray-50 px-4 py-3">
          <button
            onClick={onClose}
            className="grid size-3 place-items-center rounded-full bg-red-400 text-[8px] text-red-800 opacity-80 hover:opacity-100 transition-opacity"
            aria-label="Schließen"
          >×</button>
          <div className="size-3 rounded-full bg-yellow-400 opacity-80" />
          <div className="size-3 rounded-full bg-green-400 opacity-80" />
          <div className="mx-4 flex-1">
            <div className="mx-auto max-w-xs rounded-md bg-white border border-gray-200 px-3 py-1 text-center font-mono text-[10px] text-gray-400">
              mastermind.app/{activeScreen.id}
            </div>
          </div>
          <button
            onClick={onClose}
            className="ml-auto grid size-6 place-items-center rounded-lg text-gray-400 hover:bg-gray-200 hover:text-gray-700 transition-colors"
            aria-label="Schließen"
          >
            <X className="size-3.5" />
          </button>
        </div>

        {/* App layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <aside className="hidden w-48 shrink-0 flex-col border-r border-gray-100 bg-gray-50 sm:flex">
            <div className="border-b border-gray-100 px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="size-5 rounded bg-teal-500" />
                <span className="text-xs font-bold text-gray-800">MasterMind</span>
              </div>
            </div>
            <nav className="flex-1 space-y-0.5 p-2">
              {SCREENS.map((screen, i) => (
                <button
                  key={screen.id}
                  onClick={() => goTo(i)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-medium transition-all",
                    i === activeIndex
                      ? "bg-teal-50 text-teal-700 font-semibold"
                      : "text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                  )}
                >
                  <span className="text-sm">{screen.icon}</span>
                  {screen.label}
                  {i === activeIndex && (
                    <div className="ml-auto size-1.5 rounded-full bg-teal-500" />
                  )}
                </button>
              ))}
            </nav>
            {/* User row */}
            <div className="border-t border-gray-100 p-3">
              <div className="flex items-center gap-2">
                <div className="grid size-7 place-items-center rounded-full bg-teal-100 text-xs font-bold text-teal-600">L</div>
                <div>
                  <p className="text-[11px] font-semibold text-gray-700">Lukas M.</p>
                  <p className="text-[9px] text-gray-400">Klasse 10b</p>
                </div>
              </div>
            </div>
          </aside>

          {/* Main content with slide animation */}
          <div className="relative flex-1 overflow-hidden bg-[#F8FAFC]">
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
        <div className="flex shrink-0 items-center justify-between border-t border-gray-100 bg-white px-5 py-3">
          <button
            onClick={prev}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-all"
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
                    ? "w-6 h-2 bg-teal-500"
                    : "size-2 bg-gray-200 hover:bg-gray-400"
                )}
                aria-label={SCREENS[i].label}
              />
            ))}
          </div>

          <button
            onClick={next}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-all"
          >
            Weiter
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
