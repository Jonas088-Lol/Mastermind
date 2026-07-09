/**
 * Zugangs-Gate ("Coming Soon"-Schutz vor der öffentlichen App).
 *
 * Das Gate-Cookie ist ein signiertes, ablaufendes Token (HMAC-SHA256 über einen
 * Ablaufzeitstempel), NICHT mehr ein fester, im Repo eingecheckter String.
 * Ohne Kenntnis des Secrets lässt sich kein gültiges Token fälschen.
 *
 * Web-Crypto (crypto.subtle) statt node:crypto, damit die Prüfung auch in der
 * Middleware/Edge-Runtime läuft.
 */

export const GATE_COOKIE = "mm_gate";

// Credentials & Secret ausschließlich aus ENV. Fallbacks nur für lokale Dev.
const GATE_USER = process.env.GATE_USER ?? "admin";
const GATE_PASS = process.env.GATE_PASS ?? "dev";
const GATE_SECRET =
  process.env.GATE_SECRET ??
  process.env.SESSION_SECRET ??
  "mastermind-dev-gate-secret-change-me";

const TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 Tage

function b64url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = "";
  for (const b of arr) bin += String.fromCharCode(b);
  return btoa(bin).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

async function hmac(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(GATE_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return b64url(sig);
}

function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Prüft Gate-Zugangsdaten (timing-safe). */
export function checkGateCredentials(username: string, password: string): boolean {
  const u = timingSafeEqualStr(username, GATE_USER);
  const p = timingSafeEqualStr(password, GATE_PASS);
  return u && p;
}

/** Erzeugt ein signiertes, 30 Tage gültiges Gate-Token. */
export async function makeGateToken(): Promise<string> {
  const exp = String(Date.now() + TOKEN_TTL_MS);
  const sig = await hmac(exp);
  return `${exp}.${sig}`;
}

/** Validiert ein Gate-Token: korrekte Signatur UND nicht abgelaufen. */
export async function isGateValid(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const dot = token.indexOf(".");
  if (dot < 0) return false;
  const exp = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  const expNum = Number(exp);
  if (!Number.isFinite(expNum) || expNum < Date.now()) return false;

  const expected = await hmac(exp);
  return timingSafeEqualStr(sig, expected);
}
