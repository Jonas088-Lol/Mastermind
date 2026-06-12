// Gate access wall — shared between middleware (Edge) and server actions (Node)
export const GATE_COOKIE = "mm_gate";
const GATE_TOKEN = "mm_gate_access_2026_konvertis";

export function isGateValid(token: string | undefined): boolean {
  return token === GATE_TOKEN;
}

export function gateToken(): string {
  return GATE_TOKEN;
}
