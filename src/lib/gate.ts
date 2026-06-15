export const GATE_COOKIE = "mm_gate";
export const GATE_USER = "Admin";
export const GATE_PASS = "MasterMind2026";
const COOKIE_VALUE = "mm-gate-ok-2026";

export function isGateValid(token: string | undefined): boolean {
  return token === COOKIE_VALUE;
}

export function makeGateToken(): string {
  return COOKIE_VALUE;
}
