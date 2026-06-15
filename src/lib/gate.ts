export const GATE_COOKIE = "mm_gate";

export function isGateValid(token: string | undefined): boolean {
  const pass = process.env.GATE_PASS;
  if (!pass || !token) return false;
  return token === `gate:${pass}`;
}

export function makeGateToken(): string {
  return `gate:${process.env.GATE_PASS ?? ""}`;
}
