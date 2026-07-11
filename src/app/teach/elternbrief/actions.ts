"use server";

import { chat, isAiConfigured, MODELS } from "@/lib/ai";
import { effectiveRole, getSession } from "@/lib/session";

const ANLAESSE = ["Ausflug", "Elternabend", "Materialliste", "Verhalten", "Frei"] as const;
export type Anlass = (typeof ANLAESSE)[number];

export interface ElternbriefResult {
  ok: boolean;
  text?: string;
  error?: string;
  mock?: boolean;
}

export async function generateElternbrief(formData: FormData): Promise<ElternbriefResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Nicht angemeldet" };
  if (effectiveRole(session) !== "teacher") return { ok: false, error: "Nur für Lehrkräfte" };

  const anlassRaw = ((formData.get("anlass") as string | null) ?? "").trim();
  const anlass = (ANLAESSE as readonly string[]).includes(anlassRaw) ? anlassRaw : "Frei";
  const stichpunkte = ((formData.get("stichpunkte") as string | null) ?? "").trim().slice(0, 3000);
  const tonRaw = ((formData.get("ton") as string | null) ?? "").trim();
  const ton = tonRaw === "freundlich" ? "freundlich" : "formell";

  if (!stichpunkte) return { ok: false, error: "Bitte Stichpunkte angeben" };

  const system = [
    "Du bist Assistent:in einer deutschen Lehrkraft und schreibst Elternbriefe.",
    "Regeln:",
    "- Schreibe auf Deutsch, fehlerfrei und klar strukturiert.",
    `- Tonfall: ${ton === "formell" ? "formell und sachlich (Sie-Form, höflich-distanziert)" : "freundlich und warm (Sie-Form, zugewandt)"}.`,
    "- Struktur: Anrede („Liebe Eltern,“ bzw. „Sehr geehrte Eltern,“), kurzer Einstieg, alle Stichpunkte vollständig und logisch geordnet ausformulieren, ggf. klare Handlungsaufforderung (Rückmeldung, Unterschrift, Termin), Grußformel mit Platzhalter [Name der Lehrkraft].",
    "- Erfinde keine Fakten (Daten, Kosten, Orte), die nicht in den Stichpunkten stehen; nutze bei Bedarf Platzhalter in eckigen Klammern.",
    "- Gib NUR den Brieftext aus, ohne Kommentare oder Markdown.",
  ].join("\n");

  const user = [
    `Anlass: ${anlass === "Frei" ? "frei formulierter Elternbrief" : anlass}`,
    `Stichpunkte der Lehrkraft:`,
    stichpunkte,
  ].join("\n");

  try {
    const text = await chat({
      system,
      messages: [{ role: "user", content: user }],
      model: MODELS.balanced,
      maxTokens: 1200,
    });
    const trimmed = text.trim();
    if (!trimmed) return { ok: false, error: "Die KI hat keinen Text geliefert. Bitte erneut versuchen." };
    return { ok: true, text: trimmed, mock: !isAiConfigured() };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "KI-Aufruf fehlgeschlagen. Bitte später erneut versuchen.",
    };
  }
}
