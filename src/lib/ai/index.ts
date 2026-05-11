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
const DEFAULT_MODEL = "claude-opus-4-7";
const ANTHROPIC_VERSION = "2023-06-01";

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

  const body = {
    model: opts.model ?? DEFAULT_MODEL,
    max_tokens: opts.maxTokens ?? 64000,
    stream: true,
    thinking: { type: "adaptive" as const },
    output_config: { effort: "high" as const },
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
  let out = "";
  for await (const chunk of chatStream(opts)) {
    out += chunk;
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

  // Token-by-Token Streaming für UX-Realismus
  const words = reply.split(/(\s+)/);
  for (const w of words) {
    await new Promise((r) => setTimeout(r, 18));
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
