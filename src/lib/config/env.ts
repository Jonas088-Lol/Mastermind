/* Copyright 2026 Elian Schock, Jonas Schwenk */
/**
 * Zentrale ENV-Validierung mit Fail-Fast.
 *
 * In Produktion MÜSSEN alle sicherheitskritischen Variablen gesetzt und
 * plausibel sein — sonst bricht der Start ab (statt mit unsicheren Defaults
 * weiterzulaufen, wie früher der SESSION_SECRET-Fallback). In Entwicklung wird
 * nur gewarnt, damit lokales Arbeiten ohne vollständige Config möglich bleibt.
 *
 * Dependency-frei (kein Zod).
 */

type Problem = { key: string; message: string };

const isProd = process.env.NODE_ENV === "production";

function req(key: string, problems: Problem[], opts: { minLen?: number } = {}): void {
  const v = process.env[key];
  if (!v || v.trim() === "") {
    problems.push({ key, message: "fehlt" });
    return;
  }
  if (opts.minLen && v.length < opts.minLen) {
    problems.push({ key, message: `zu kurz (min ${opts.minLen} Zeichen)` });
  }
}

function forbidPlaceholder(key: string, badValues: string[], problems: Problem[]): void {
  const v = process.env[key];
  if (v && badValues.some((b) => v.includes(b))) {
    problems.push({ key, message: "enthält einen unsicheren Platzhalter/Default" });
  }
}

/**
 * Validiert die Umgebung. Wirft in Produktion bei Problemen, warnt in Dev.
 * Wird einmal beim Serverstart aufgerufen (siehe instrumentation.ts).
 */
export function validateEnv(): void {
  const problems: Problem[] = [];

  // ── Immer erforderlich ──
  req("DATABASE_URL", problems);
  req("SESSION_SECRET", problems, { minLen: 32 });
  forbidPlaceholder("SESSION_SECRET", ["change-me", "dev-secret", "placeholder", "mastermind-dev-secret"], problems);
  req("NEXT_PUBLIC_APP_URL", problems);

  if (isProd) {
    // ── In Produktion zusätzlich Pflicht ──
    // Gate-Zugangsdaten dürfen nicht die alten Hardcodes sein
    forbidPlaceholder("GATE_PASS", ["MasterMind2026", "change-me", "dev"], problems);

    // Mail: entweder korrekt konfiguriert ODER bewusst leer (dann kein Versand)
    if (process.env.RESEND_API_KEY) {
      req("EMAIL_FROM", problems);
    }
    // Inbound-Mail nur mit Secret sinnvoll (sonst ist die Route eh zu)
    // — kein harter Fehler, nur Hinweis über den Rückgabewert unten.

    // Demo-Seed darf in Prod NIEMALS aktiv sein
    if (process.env.ALLOW_DEMO_SEED === "true") {
      problems.push({ key: "ALLOW_DEMO_SEED", message: "darf in Produktion nicht 'true' sein (Seed-Backdoor!)" });
    }

    // Rate-Limiting: mindestens ein persistentes Backend
    const hasUpstash = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
    const hasRedis = !!process.env.REDIS_URL;
    if (!hasUpstash && !hasRedis) {
      problems.push({ key: "REDIS_URL", message: "kein persistentes Rate-Limit-Backend (REDIS_URL oder UPSTASH_*)" });
    }

    // Field-Encryption: wenn Keys gesetzt, muss ACTIVE dazu passen
    if (process.env.FIELD_ENCRYPTION_KEYS && !process.env.FIELD_ENCRYPTION_ACTIVE) {
      problems.push({ key: "FIELD_ENCRYPTION_ACTIVE", message: "fehlt, obwohl FIELD_ENCRYPTION_KEYS gesetzt ist" });
    }
  }

  if (problems.length === 0) {
    return;
  }

  const report = problems.map((p) => `  - ${p.key}: ${p.message}`).join("\n");
  if (isProd) {
    // Fail-Fast: Server startet nicht mit unsicherer/unvollständiger Config.
    throw new Error(`✖ ENV-Validierung fehlgeschlagen (Produktion):\n${report}`);
  } else {
    console.warn(`⚠ ENV-Validierung (Dev, nicht blockierend):\n${report}`);
  }
}
