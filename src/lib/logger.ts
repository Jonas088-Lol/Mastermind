const IS_PROD = process.env.NODE_ENV === "production";
const IS_TEST = process.env.NODE_ENV === "test";

function fmt(level: string, msg: string, meta?: unknown): string {
  const ts = new Date().toISOString();
  const base = `[${ts}] [${level}] ${msg}`;
  if (meta === undefined) return base;
  try {
    return `${base} ${JSON.stringify(meta)}`;
  } catch {
    return `${base} [unserializable meta]`;
  }
}

export const logger = {
  debug(msg: string, meta?: unknown): void {
    if (!IS_PROD && !IS_TEST) console.debug(fmt("DEBUG", msg, meta));
  },
  info(msg: string, meta?: unknown): void {
    if (!IS_TEST) console.info(fmt("INFO", msg, meta));
  },
  warn(msg: string, meta?: unknown): void {
    if (!IS_TEST) console.warn(fmt("WARN", msg, meta));
  },
  error(msg: string, err?: unknown, meta?: unknown): void {
    if (!IS_TEST) {
      const errStr = err instanceof Error ? `${err.message}${err.stack ? `\n${err.stack}` : ""}` : String(err ?? "");
      console.error(fmt("ERROR", msg, { error: errStr, ...((meta as object) ?? {}) }));
      // In Produktion zusätzlich eine E-Mail-Warnung (rate-limitiert, nie blockierend).
      if (IS_PROD) {
        const detail = meta !== undefined ? `${errStr}\n\nKontext: ${fmt("", "", meta).trim()}` : errStr;
        import("@/lib/security/alert")
          .then(({ alertError }) => alertError(msg, detail))
          .catch(() => {});
      }
    }
  },
};
