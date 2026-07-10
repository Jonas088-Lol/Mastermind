/**
 * Sicheres JSON-Parsing — wirft nie. Gibt bei ungültigem/fehlendem Input den
 * Fallback zurück. Verhindert weiße Screens, wenn ein DB-/AI-Feld mal kein
 * gültiges JSON enthält.
 */
export function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (raw == null || raw === "") return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
