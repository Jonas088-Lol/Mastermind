// Gate access wall — shared between middleware (Edge) and server actions (Node)
export const GATE_COOKIE = "mm_gate";
const GATE_TOKEN = "xP#7mQ!9kRz$2Lv@Nd4Wc8Yb";

export function isGateValid(token: string | undefined): boolean {
  return token === GATE_TOKEN;
}

export function gateToken(): string {
  return GATE_TOKEN;
}
