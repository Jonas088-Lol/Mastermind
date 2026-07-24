/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";

/**
 * Vorschau des Farbverlaufs — einmal auf hellem, einmal auf dunklem Grund.
 * Zeigt den Verlauf-Button und darunter das Farbpaar als Balken.
 *
 * Die Hintergründe sind optional überschreibbar, damit die Vorschau auch die
 * schuleigenen Hintergrundfarben zeigen kann.
 */
export function GradientPreview({
  accent,
  secondary,
  bgLight = "#ffffff",
  bgDark = "hsl(222,24%,7%)",
  label = "Gradient-Button",
}: {
  accent: string;
  secondary: string;
  bgLight?: string;
  bgDark?: string;
  label?: string;
}) {
  const panels = [
    { title: "Hell", bg: bgLight, border: "hsl(var(--border))", muted: "#9ca3af", text: "#123b2a" },
    { title: "Dunkel", bg: bgDark, border: "hsl(222,14%,18%)", muted: "hsl(220,9%,46%)", text: "#0b2a1e" },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {panels.map((p) => (
        <div key={p.title} className="rounded-xl border p-4" style={{ background: p.bg, borderColor: p.border }}>
          <p className="mb-3 text-[10px] font-medium uppercase tracking-wider" style={{ color: p.muted }}>
            {p.title}
          </p>
          <button
            type="button"
            className="w-full rounded-lg px-3 py-2.5 text-sm font-bold shadow-sm"
            style={{
              backgroundImage: `linear-gradient(90deg, ${accent} 0%, ${secondary} 100%)`,
              color: p.text,
            }}
          >
            {label}
          </button>
          <div className="mt-2 flex items-center gap-2">
            <span className="size-5 rounded" style={{ background: accent }} title="Primärfarbe" />
            <div
              className="h-2 flex-1 rounded-full"
              style={{ backgroundImage: `linear-gradient(90deg, ${accent}, ${secondary})` }}
            />
            <span className="size-5 rounded" style={{ background: secondary }} title="Sekundärfarbe" />
          </div>
        </div>
      ))}
    </div>
  );
}
