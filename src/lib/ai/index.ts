/* Copyright 2026 Elian Schock, Jonas Schwenk */
/**
 * Claude API integration via fetch.
 *
 * - Wenn `ANTHROPIC_API_KEY` gesetzt ist: echte Calls gegen die Messages-API.
 * - Wenn nicht: deterministische Mock-Antworten (Streaming-shape kompatibel).
 *
 * Default-Modell: claude-opus-4-7 (adaptive thinking + prompt caching auf
 * dem System-Prompt). Schul-Daten werden vor dem Versand pseudonymisiert
 * (Vorname → Initialen, Klassen-Slug bleibt).
 */

const API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

/**
 * Modell-Tiers nach Kosten. In einer Lernapp laufen die meisten Aufgaben
 * (Quiz, Karteikarten, Vokabeln, Boss-Fragen) auf `fast` — das ist ~15× güns-
 * tiger als Opus und für strukturierte Generierung völlig ausreichend.
 * `balanced` für qualitätskritische Aufgaben (Tutor, Benotung, Klausuren),
 * `smart` nur wenn explizit maximale Qualität gebraucht wird.
 */
export const MODELS = {
  fast: "claude-haiku-4-5-20251001",
  balanced: "claude-sonnet-4-6",
  smart: "claude-opus-4-8",
} as const;

const DEFAULT_MODEL = MODELS.fast;

export type Role = "user" | "assistant";

export interface ChatMessage {
  role: Role;
  content: string;
}

export interface ChatOptions {
  system?: string;
  messages: ChatMessage[];
  model?: string;
  maxTokens?: number;
  /**
   * Erweitertes „Nachdenken" + hoher Effort. Kostet spürbar mehr Tokens und ist
   * nur für komplexe Reasoning-Aufgaben sinnvoll. Default: aus (günstig).
   */
  thinking?: boolean;
  /**
   * Antwort zwischenspeichern und bei identischer Anfrage wiederverwenden.
   * Nur für deterministische Generierung (Quiz, Vokabeln …), NIE für Tutor-Chat
   * oder Benotung. Nur in `chat()` wirksam, nicht beim Streaming.
   */
  cache?: boolean;
  signal?: AbortSignal;
}

export function isAiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/**
 * Streamt Text-Deltas. Nutzt SSE wenn API-Key gesetzt, sonst gibt einen
 * Mock-Stream aus statischen, themenpassenden Antworten zurück.
 */
export async function* chatStream(
  opts: ChatOptions
): AsyncGenerator<string, void, unknown> {
  if (!isAiConfigured()) {
    yield* mockStream(opts);
    return;
  }

  const body: Record<string, unknown> = {
    model: opts.model ?? DEFAULT_MODEL,
    // Kostendeckel: Output-Tokens sind der teure Teil. Aufrufer setzen ihr
    // eigenes Limit; der Default ist bewusst niedrig, damit ein vergessenes
    // Limit die Kosten nicht explodieren lässt.
    max_tokens: opts.maxTokens ?? 2048,
    stream: true,
    system: opts.system
      ? [
          {
            type: "text" as const,
            text: opts.system,
            cache_control: { type: "ephemeral" as const },
          },
        ]
      : undefined,
    messages: opts.messages.map((m) => ({
      role: m.role,
      content: pseudonymize(m.content),
    })),
  };

  // Erweitertes Denken nur wenn explizit angefordert — spart sonst Denk-Tokens.
  if (opts.thinking) {
    body.thinking = { type: "adaptive" as const };
    body.output_config = { effort: "high" as const };
  }

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": ANTHROPIC_VERSION,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
    signal: opts.signal,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Anthropic API ${res.status}: ${text || res.statusText}`);
  }
  if (!res.body) throw new Error("No response body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let nl: number;
      while ((nl = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, nl).replace(/\r$/, "");
        buffer = buffer.slice(nl + 1);
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;

        try {
          const parsed = JSON.parse(payload) as {
            type: string;
            delta?: { type?: string; text?: string };
          };
          if (
            parsed.type === "content_block_delta" &&
            parsed.delta?.type === "text_delta" &&
            typeof parsed.delta.text === "string"
          ) {
            yield parsed.delta.text;
          }
        } catch {
          // Ignoriere malformed events
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Sammelt einen kompletten Chat-Text, basierend auf chatStream.
 * Nützlich für Server-Actions ohne UI-Streaming.
 */
export async function chat(opts: ChatOptions): Promise<string> {
  // Cache-Lookup (nur bei opts.cache und echtem API-Betrieb — Mock nie cachen)
  let key: string | null = null;
  if (opts.cache && isAiConfigured()) {
    const { aiCacheKey, aiCacheGet } = await import("@/lib/ai/cache");
    key = aiCacheKey({
      model: opts.model ?? DEFAULT_MODEL,
      maxTokens: opts.maxTokens ?? null,
      thinking: opts.thinking ?? false,
      system: opts.system ?? null,
      messages: opts.messages,
    });
    const hit = await aiCacheGet(key);
    if (hit !== null) return hit;
  }

  let out = "";
  for await (const chunk of chatStream(opts)) {
    out += chunk;
  }

  if (key && out.trim().length > 0) {
    const { aiCacheSet } = await import("@/lib/ai/cache");
    await aiCacheSet(key, out);
  }
  return out;
}

/* ── Pseudonymisierung ──────────────────────────────────────────── */

/**
 * Ersetzt vollständige Schüler-Namen durch Initialen, damit der Anbieter keine
 * Klarnamen sieht. Bewusst konservativ — eher zu viele Kandidaten matchen.
 * Production: gegen tatsächliche Roster-Daten matchen, nicht regex.
 */
function pseudonymize(text: string): string {
  return text.replace(/\b([A-ZÄÖÜ][a-zäöüß]{1,})\s+([A-ZÄÖÜ][a-zäöüß]{2,})\b/g, (_, a: string, b: string) => {
    return `${a[0]}. ${b[0]}.`;
  });
}

/* ── Mock-Fallback ──────────────────────────────────────────────── */

async function* mockStream(opts: ChatOptions): AsyncGenerator<string> {
  const lastUser = opts.messages.findLast((m) => m.role === "user")?.content ?? "";
  const reply = mockReply(lastUser);

  const words = reply.split(/(\s+)/);
  for (const w of words) {
    yield w;
  }
}

function mockReply(prompt: string): string {
  const p = prompt.toLowerCase();
  if (/pq[- ]?formel|quadratisch/.test(p)) {
    return [
      "Klar, gehen wir das Schritt für Schritt durch.",
      "",
      "1. Bringe die Gleichung in die Normalform x² + px + q = 0.",
      "2. Identifiziere p und q.",
      "3. Setze in x = -p/2 ± √((p/2)² - q) ein.",
      "4. Wurzel ziehen, beide Lösungen ausrechnen.",
      "5. Probe machen, indem du beide Lösungen einsetzt.",
      "",
      "Magst du eine konkrete Aufgabe damit durchgehen?",
    ].join("\n");
  }
  if (/photosynthese|chlorophyll|lichtreaktion/.test(p)) {
    return [
      "Photosynthese in zwei Phasen:",
      "",
      "• Lichtreaktion: Chlorophyll absorbiert Licht, spaltet Wasser, liefert ATP und NADPH.",
      "• Dunkelreaktion (Calvin-Zyklus): CO₂ wird mit Hilfe von ATP/NADPH zu Glucose verarbeitet.",
      "",
      "Merksatz: Licht macht Energie, CO₂ wird zu Zucker.",
    ].join("\n");
  }
  if (/vokabel|englisch|tense/.test(p)) {
    return [
      "Englisch-Tipp für Tenses:",
      "",
      "• Past Simple: abgeschlossene Handlung in der Vergangenheit (yesterday, last week).",
      "• Present Perfect: Bezug zur Gegenwart (just, already, since, for).",
      "• Past Perfect: Vorvergangenheit (vor einer anderen Vergangenheit).",
      "",
      "Faustregel: Wenn du \"have/has\" + Partizip siehst, ist es Present Perfect.",
    ].join("\n");
  }
  return [
    "Gute Frage. Hier ist mein Ansatz:",
    "",
    "1. Beschreib mir kurz, woran du gerade hängst.",
    "2. Zeig mir, was du bisher probiert hast.",
    "3. Dann gehen wir Schritt für Schritt durch.",
    "",
    "(Hinweis: Das ist gerade eine Mock-Antwort, weil ANTHROPIC_API_KEY nicht gesetzt ist. Sobald der Key in .env.local steht, läuft der echte Tutor.)",
  ].join("\n");
}
