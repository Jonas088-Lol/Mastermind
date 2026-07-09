/**
 * Next.js Instrumentation — läuft einmal beim Serverstart.
 * Wird für die ENV-Fail-Fast-Validierung genutzt: in Produktion startet der
 * Server nicht mit unsicherer/unvollständiger Konfiguration.
 */
export async function register() {
  // Nur in der Node.js-Runtime (nicht Edge/Middleware).
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateEnv } = await import("@/lib/config/env");
    validateEnv();
  }
}
