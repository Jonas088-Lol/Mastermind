// Gate access wall — shared between middleware (Edge) and server actions (Node)
export const GATE_COOKIE = "mm_gate";

export function isGateValid(token: string | undefined): boolean {
  const secret = process.env.GATE_TOKEN;
  if (!secret || !token) return false;
  return token === secret;
}

export function gateToken(): string {
  return process.env.GATE_TOKEN ?? "";
}
