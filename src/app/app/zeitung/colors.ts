/** Erlaubte Akzentfarben für Artikelkarten (kuratiert, in hell & dunkel lesbar). */
export const ARTICLE_COLORS = ["#2a78d6", "#1baf7a", "#eda100", "#e34948", "#8b5cf6", "#e87ba4"];

/** Rubriken der Schülerzeitung (Wert wird in NewspaperArticle.category gespeichert). */
export const KATEGORIEN = [
  { value: "schule", label: "Schule", emoji: "🏫" },
  { value: "sport", label: "Sport", emoji: "⚽" },
  { value: "kultur", label: "Kultur", emoji: "🎭" },
  { value: "meinung", label: "Meinung", emoji: "💬" },
  { value: "sonstiges", label: "Sonstiges", emoji: "📌" },
] as const;

export function kategorieInfo(value: string | null | undefined) {
  return KATEGORIEN.find((k) => k.value === value) ?? null;
}
