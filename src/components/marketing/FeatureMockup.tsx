/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { cn } from "@/lib/utils";

type MockupVariant =
  | "chat"
  | "dashboard"
  | "grades"
  | "flashcard"
  | "assignment"
  | "analytics"
  | "admin"
  | "security"
  | "learning";

interface FeatureMockupProps {
  variant: MockupVariant;
  className?: string;
}

// Shared browser chrome wrapper
function MockupShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "aspect-video w-full overflow-hidden border border-border bg-[#f8fafb] shadow-lg",
        className,
      )}
    >
      {/* Browser bar */}
      <div className="flex h-8 items-center gap-2 border-b border-border bg-white px-3">
        <div className="flex gap-1">
          <div className="size-2 rounded-full bg-danger/50" />
          <div className="size-2 rounded-full bg-warning/50" />
          <div className="size-2 rounded-full bg-success/50" />
        </div>
        <div className="mx-auto flex h-4 w-48 items-center gap-1.5 rounded border border-border bg-surface px-2">
          <div className="size-1.5 rounded-full bg-brand/60" />
          <span className="text-[8px] text-muted-fg/70 font-mono">mastermind.app</span>
        </div>
      </div>
      <div className="flex h-[calc(100%-32px)]">{children}</div>
    </div>
  );
}

// Left sidebar
function MockupSidebar({ active }: { active: string }) {
  const items = ["Dashboard", "Aufgaben", "KI-Tutor", "Noten", "Karteikarten"];
  return (
    <div className="flex w-[52px] flex-col gap-0.5 border-r border-border bg-white px-1.5 py-2">
      <div className="mb-1 grid size-7 place-items-center rounded bg-brand/10">
        <span className="text-[10px] font-bold text-brand">MM</span>
      </div>
      {items.map((item) => (
        <div
          key={item}
          className={cn(
            "h-1 w-full rounded-sm",
            item === active ? "bg-brand/30" : "bg-border",
          )}
        />
      ))}
    </div>
  );
}

function ChatMockup() {
  return (
    <MockupShell>
      <MockupSidebar active="KI-Tutor" />
      <div className="flex flex-1 flex-col p-3 gap-2">
        <div className="text-[9px] font-bold text-fg/70 tracking-wider uppercase">KI-Tutor</div>
        {/* AI message */}
        <div className="flex gap-1.5">
          <div className="grid size-5 shrink-0 place-items-center rounded-full bg-brand/20 text-[8px] font-bold text-brand">
            KI
          </div>
          <div className="max-w-[70%] rounded-xl rounded-tl-none bg-white border border-border px-2 py-1.5 text-[8px] leading-tight text-fg/80 shadow-sm">
            Hallo! Was möchtest du heute lernen? Ich erkläre dir gerne Mathe, Deutsch oder jedes andere Fach. 😊
          </div>
        </div>
        {/* User message */}
        <div className="flex justify-end gap-1.5">
          <div className="max-w-[60%] rounded-xl rounded-tr-none bg-brand px-2 py-1.5 text-[8px] leading-tight text-white shadow-sm">
            Erkläre mir den Satz des Pythagoras
          </div>
        </div>
        {/* AI response */}
        <div className="flex gap-1.5">
          <div className="grid size-5 shrink-0 place-items-center rounded-full bg-brand/20 text-[8px] font-bold text-brand">
            KI
          </div>
          <div className="max-w-[70%] rounded-xl rounded-tl-none bg-white border border-border px-2 py-1.5 text-[8px] leading-tight text-fg/80 shadow-sm space-y-1">
            <p>Der Satz des Pythagoras gilt im rechtwinkligen Dreieck:</p>
            <div className="rounded bg-brand/10 px-2 py-0.5 font-mono text-[9px] text-brand font-bold text-center">
              a² + b² = c²
            </div>
            <p>c ist die Hypotenuse (längste Seite).</p>
          </div>
        </div>
        {/* Input */}
        <div className="mt-auto flex items-center gap-1.5 rounded-lg border border-border bg-white px-2 py-1">
          <div className="h-2 flex-1 rounded bg-surface" />
          <div className="grid size-4 place-items-center rounded bg-brand/80">
            <div className="h-1.5 w-1.5 border-t border-r border-white rotate-45" />
          </div>
        </div>
      </div>
    </MockupShell>
  );
}

function DashboardMockup() {
  return (
    <MockupShell>
      <MockupSidebar active="Dashboard" />
      <div className="flex flex-1 flex-col gap-2 p-3 overflow-hidden">
        <div className="text-[9px] font-bold text-fg/70 uppercase tracking-wider">Dashboard</div>
        {/* Stat cards */}
        <div className="grid grid-cols-4 gap-1">
          {[
            { label: "Streak", value: "12", unit: "Tage", color: "bg-warning/20 text-warning" },
            { label: "XP heute", value: "+240", unit: "XP", color: "bg-brand/20 text-brand" },
            { label: "Ø-Note", value: "2,3", unit: "alle", color: "bg-success/20 text-success" },
            { label: "Rang", value: "#4", unit: "Klasse", color: "bg-info/20 text-info" },
          ].map((s) => (
            <div key={s.label} className="rounded border border-border bg-white p-1.5 text-center shadow-sm">
              <p className="text-[7px] text-muted-fg">{s.label}</p>
              <p className={cn("font-mono text-[11px] font-black mt-0.5", s.color)}>{s.value}</p>
              <p className="text-[6px] text-muted-fg">{s.unit}</p>
            </div>
          ))}
        </div>
        {/* XP bar */}
        <div className="rounded border border-border bg-white p-2 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[8px] font-semibold">Level 7 → Level 8</span>
            <span className="font-mono text-[8px] text-brand">840/1000 XP</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-surface overflow-hidden">
            <div className="h-full w-[84%] rounded-full bg-linear-to-r from-brand to-accent" />
          </div>
        </div>
        {/* Quest progress */}
        <div className="flex gap-1 mt-1">
          {["📚 Lesen", "✏️ Aufgaben", "🔥 Streak"].map((q, i) => (
            <div key={q} className="flex-1 rounded border border-border bg-white p-1.5 shadow-sm">
              <p className="text-[7px]">{q}</p>
              <div className="mt-1 h-1 rounded-full bg-surface">
                <div
                  className="h-full rounded-full bg-brand/70"
                  style={{ width: `${[70, 100, 45][i]}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </MockupShell>
  );
}

function GradesMockup() {
  const grades = [
    { subject: "Mathematik", grade: 2.1, color: "#3b82f6" },
    { subject: "Deutsch", grade: 1.8, color: "#8b5cf6" },
    { subject: "Englisch", grade: 2.4, color: "#f59e0b" },
    { subject: "Physik", grade: 3.0, color: "#ef4444" },
    { subject: "Bio", grade: 1.5, color: "#10b981" },
  ];

  return (
    <MockupShell>
      <MockupSidebar active="Noten" />
      <div className="flex flex-1 flex-col gap-2 p-3 overflow-hidden">
        <div className="text-[9px] font-bold text-fg/70 uppercase tracking-wider">Meine Noten</div>
        {/* Average */}
        <div className="flex items-center gap-3 rounded border border-border bg-white px-2.5 py-2 shadow-sm">
          <div className="text-[22px] font-black text-success leading-none">2,1</div>
          <div>
            <p className="text-[8px] font-semibold">Gesamt-Ø</p>
            <p className="text-[7px] text-muted-fg">Alle Fächer · Schuljahr 25/26</p>
          </div>
        </div>
        {/* Subject bars */}
        <div className="space-y-1.5">
          {grades.map((g) => (
            <div key={g.subject} className="flex items-center gap-2">
              <div
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: g.color }}
              />
              <p className="w-16 truncate text-[8px] text-fg/80 shrink-0">{g.subject}</p>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    backgroundColor: g.color,
                    width: `${Math.round(((6 - g.grade) / 5) * 100)}%`,
                  }}
                />
              </div>
              <span className="w-5 text-right font-mono text-[8px] font-semibold text-fg/80">
                {g.grade.toFixed(1).replace(".", ",")}
              </span>
            </div>
          ))}
        </div>
      </div>
    </MockupShell>
  );
}

function FlashcardMockup() {
  return (
    <MockupShell>
      <MockupSidebar active="Karteikarten" />
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-3">
        <div className="w-full">
          <div className="flex justify-between text-[8px] text-muted-fg mb-1.5 px-0.5">
            <span>Deck: Englisch Vokabeln</span>
            <span className="text-brand font-semibold">Card 3 / 24</span>
          </div>
          {/* Flashcard */}
          <div className="relative w-full rounded-xl border border-border bg-white shadow-lg p-4 text-center">
            <p className="text-[8px] text-muted-fg uppercase tracking-wider mb-2">Vorderseite</p>
            <p className="text-[16px] font-bold text-fg">sophisticated</p>
            <p className="text-[8px] text-muted-fg mt-1">Klicke zum Umdrehen</p>
            <div className="mt-3 h-px w-full bg-border" />
            <p className="text-[8px] text-muted-fg uppercase tracking-wider mt-2 mb-1">Rückseite</p>
            <p className="text-[12px] font-semibold text-brand">anspruchsvoll · raffiniert</p>
          </div>
          {/* Rating buttons */}
          <div className="mt-2.5 flex gap-1.5">
            {[
              { label: "Nochmal", bg: "bg-danger/15 text-danger" },
              { label: "Schwer", bg: "bg-warning/15 text-warning" },
              { label: "Gut", bg: "bg-brand/15 text-brand" },
              { label: "Super!", bg: "bg-success/15 text-success" },
            ].map((b) => (
              <div key={b.label} className={cn("flex-1 rounded py-1 text-center text-[8px] font-semibold", b.bg)}>
                {b.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </MockupShell>
  );
}

function AssignmentMockup() {
  return (
    <MockupShell>
      <MockupSidebar active="Aufgaben" />
      <div className="flex flex-1 flex-col gap-2 p-3 overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="text-[9px] font-bold text-fg/70 uppercase tracking-wider">Neue Aufgabe</div>
          <div className="rounded bg-brand px-2 py-0.5 text-[8px] font-semibold text-white">Speichern</div>
        </div>
        <div className="space-y-2">
          <div>
            <p className="text-[8px] text-muted-fg mb-0.5">Titel</p>
            <div className="rounded border border-border bg-white px-2 py-1.5 text-[8px] text-fg shadow-sm">
              Kapitel 5: Die Weimarer Republik
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <div>
              <p className="text-[8px] text-muted-fg mb-0.5">Klasse</p>
              <div className="rounded border border-border bg-white px-2 py-1.5 text-[8px] text-fg shadow-sm">9b</div>
            </div>
            <div>
              <p className="text-[8px] text-muted-fg mb-0.5">Abgabe</p>
              <div className="rounded border border-border bg-white px-2 py-1.5 text-[8px] text-fg shadow-sm">20. Jun 2026</div>
            </div>
          </div>
          {/* KI suggestion */}
          <div className="rounded border border-brand/30 bg-brand/5 p-2">
            <div className="flex items-center gap-1 mb-1">
              <span className="text-[8px]">✨</span>
              <p className="text-[8px] font-semibold text-brand">KI-Vorschlag</p>
            </div>
            <p className="text-[8px] text-fg/70 leading-relaxed">
              3 Aufgaben mit Lückentext, 2 Quizfragen und eine Aufsatzaufgabe — passend zum Lehrplan Klasse 9.
            </p>
            <div className="mt-1 rounded bg-brand/10 px-1.5 py-0.5 text-[7px] font-semibold text-brand inline-block">
              Übernehmen →
            </div>
          </div>
        </div>
      </div>
    </MockupShell>
  );
}

function AnalyticsMockup() {
  const bars = [78, 92, 55, 88, 61, 95, 73];
  const days = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

  return (
    <MockupShell>
      <MockupSidebar active="Dashboard" />
      <div className="flex flex-1 flex-col gap-2 p-3 overflow-hidden">
        <div className="text-[9px] font-bold text-fg/70 uppercase tracking-wider">Klassen-Analyse · 9b</div>
        {/* Class heatmap mini */}
        <div className="grid grid-cols-4 gap-0.5">
          {["Mathe", "Deutsch", "Englisch", "Physik"].map((s, i) => {
            const scores = [[82, 90, 55, 70], [91, 88, 92, 78], [70, 65, 88, 82], [50, 55, 60, 75]][i] ?? [];
            return scores.map((v, j) => (
              <div
                key={`${s}-${j}`}
                className="h-3 rounded-sm"
                title={`${s}: ${v}%`}
                style={{ backgroundColor: v >= 80 ? `hsl(142 65% ${36 + (v - 80)}%)` : v >= 60 ? `hsl(38 92% ${48 + (v - 60) * 0.5}%)` : `hsl(0 80% ${58 + (v - 50) * 0.5}%)`, opacity: 0.75 }}
              />
            ));
          })}
        </div>
        <div className="flex gap-1 text-[7px] text-muted-fg">
          {["Mathe", "Deutsch", "Englisch", "Physik"].map((s) => (
            <span key={s} className="flex-1 text-center">{s}</span>
          ))}
        </div>
        {/* Weekly XP bar chart */}
        <div className="mt-1">
          <p className="text-[8px] text-muted-fg mb-1.5">Aktivität diese Woche</p>
          <div className="flex items-end gap-1 h-12">
            {bars.map((h, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-0.5">
                <div
                  className="w-full rounded-t"
                  style={{ height: `${h}%`, backgroundColor: `hsl(172 72% ${40 + h * 0.1}%)`, opacity: 0.8 }}
                />
                <span className="text-[6px] text-muted-fg">{days[i]}</span>
              </div>
            ))}
          </div>
        </div>
        {/* Top students mini */}
        <div className="mt-0.5 space-y-1">
          {[
            { name: "Max M.", xp: 1420, rank: "🥇" },
            { name: "Lisa K.", xp: 1380, rank: "🥈" },
            { name: "Finn W.", xp: 1210, rank: "🥉" },
          ].map((s) => (
            <div key={s.name} className="flex items-center gap-1.5">
              <span className="text-[9px]">{s.rank}</span>
              <span className="flex-1 text-[8px] text-fg/80">{s.name}</span>
              <span className="font-mono text-[8px] text-brand font-semibold">{s.xp} XP</span>
            </div>
          ))}
        </div>
      </div>
    </MockupShell>
  );
}

function AdminMockup() {
  return (
    <MockupShell>
      <MockupSidebar active="Dashboard" />
      <div className="flex flex-1 flex-col gap-2 p-3 overflow-hidden">
        <div className="text-[9px] font-bold text-fg/70 uppercase tracking-wider">Schul-Admin · Gesamtberg Gymnasium</div>
        <div className="grid grid-cols-2 gap-1">
          {[
            { label: "Nutzer", value: "847", color: "text-info" },
            { label: "Klassen", value: "28", color: "text-brand" },
            { label: "Akt. heute", value: "312", color: "text-success" },
            { label: "Tickets", value: "2", color: "text-warning" },
          ].map((s) => (
            <div key={s.label} className="rounded border border-border bg-white p-1.5 shadow-sm">
              <p className="text-[7px] text-muted-fg">{s.label}</p>
              <p className={cn("font-mono text-[13px] font-black", s.color)}>{s.value}</p>
            </div>
          ))}
        </div>
        {/* User list mini */}
        <div className="space-y-0.5">
          {[
            { name: "Dr. Petra Müller", role: "Lehrkraft", active: true },
            { name: "Jonas Weber", role: "Schüler (9b)", active: true },
            { name: "Maria Schmidt", role: "Elternteil", active: false },
          ].map((u) => (
            <div key={u.name} className="flex items-center gap-1.5 rounded bg-white border border-border px-2 py-1 shadow-sm">
              <div className="grid size-4 shrink-0 place-items-center rounded-full bg-brand/15 text-[7px] font-bold text-brand">
                {u.name[0]}
              </div>
              <div className="flex-1">
                <p className="text-[8px] font-medium text-fg/90">{u.name}</p>
                <p className="text-[7px] text-muted-fg">{u.role}</p>
              </div>
              <div className={cn("size-1.5 rounded-full", u.active ? "bg-success" : "bg-border")} />
            </div>
          ))}
        </div>
      </div>
    </MockupShell>
  );
}

function SecurityMockup() {
  return (
    <MockupShell>
      <MockupSidebar active="Dashboard" />
      <div className="flex flex-1 flex-col gap-2 p-3 overflow-hidden">
        <div className="text-[9px] font-bold text-fg/70 uppercase tracking-wider">Sicherheit & DSGVO</div>
        {/* Compliance checklist */}
        <div className="space-y-1.5">
          {[
            { label: "DSGVO-konform", done: true },
            { label: "Ende-zu-Ende verschlüsselt", done: true },
            { label: "ISO 27001 Hosting", done: true },
            { label: "AVV abgeschlossen", done: true },
            { label: "2FA für alle Nutzer", done: true },
            { label: "Audit-Log aktiv", done: true },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2 rounded border border-border bg-white px-2 py-1 shadow-sm">
              <div className={cn("grid size-3.5 shrink-0 place-items-center rounded-full", item.done ? "bg-success" : "bg-border")}>
                {item.done && (
                  <svg viewBox="0 0 10 10" className="size-2 text-white" fill="none" stroke="currentColor" strokeWidth={2}>
                    <polyline points="1.5,5 4,7.5 8.5,2.5" />
                  </svg>
                )}
              </div>
              <p className="text-[8px] text-fg/80">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </MockupShell>
  );
}

function LearningMockup() {
  return (
    <MockupShell>
      <MockupSidebar active="Dashboard" />
      <div className="flex flex-1 flex-col gap-2 p-3 overflow-hidden">
        <div className="text-[9px] font-bold text-fg/70 uppercase tracking-wider">Lernpfade</div>
        {/* Learning tree */}
        <div className="space-y-2">
          {[
            { label: "Grundlagen", nodes: [
              { label: "Brüche", done: true },
              { label: "Prozente", done: true },
              { label: "Potenzen", done: false, active: true },
            ]},
            { label: "Aufbau", nodes: [
              { label: "Gleichungen", done: false, locked: true },
              { label: "Funktionen", done: false, locked: true },
            ]},
          ].map((tier) => (
            <div key={tier.label}>
              <p className="text-[7px] uppercase tracking-wider text-muted-fg mb-1">{tier.label}</p>
              <div className="flex gap-1.5">
                {tier.nodes.map((node) => (
                  <div
                    key={node.label}
                    className={cn(
                      "flex-1 rounded border p-1.5 text-center",
                      "done" in node && node.done ? "border-success/40 bg-success/10" :
                      "active" in node && node.active ? "border-brand/40 bg-brand/10" :
                      "border-border bg-surface opacity-50",
                    )}
                  >
                    <div className="text-[11px] mb-0.5">
                      {"done" in node && node.done ? "✅" : "active" in node && node.active ? "📖" : "🔒"}
                    </div>
                    <p className="text-[7px] font-semibold">{node.label}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        {/* Daily goal */}
        <div className="mt-auto rounded border border-warning/30 bg-warning/5 px-2 py-1.5">
          <p className="text-[8px] font-semibold text-warning">Tagesziel: 50 XP</p>
          <div className="mt-1 h-1.5 rounded-full bg-warning/15 overflow-hidden">
            <div className="h-full w-[64%] rounded-full bg-warning/60" />
          </div>
          <p className="text-[7px] text-muted-fg mt-0.5">32 / 50 XP · Noch 18 XP bis zum Tagesziel</p>
        </div>
      </div>
    </MockupShell>
  );
}

const VARIANTS: Record<MockupVariant, React.ComponentType> = {
  chat: ChatMockup,
  dashboard: DashboardMockup,
  grades: GradesMockup,
  flashcard: FlashcardMockup,
  assignment: AssignmentMockup,
  analytics: AnalyticsMockup,
  admin: AdminMockup,
  security: SecurityMockup,
  learning: LearningMockup,
};

export function FeatureMockup({ variant, className }: FeatureMockupProps) {
  const Component = VARIANTS[variant];
  return (
    <div className={cn("relative", className)}>
      <Component />
      {/* Subtle brand gradient overlay at bottom */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-8 bg-linear-to-t from-surface/20 to-transparent" />
    </div>
  );
}
