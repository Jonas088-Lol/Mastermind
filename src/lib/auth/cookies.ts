import { createHmac, timingSafeEqual } from "node:crypto";

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET environment variable is required in production");
    }
    return "mastermind-dev-secret-change-me-in-production-via-SESSION_SECRET-env-var";
  }
  return secret;
}

function base64UrlEncode(buf: Buffer): string {
  return buf
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function base64UrlDecode(str: string): Buffer {
  let s = str.replaceAll("-", "+").replaceAll("_", "/");
  const padding = (4 - (s.length % 4)) % 4;
  s = s + "=".repeat(padding);
  return Buffer.from(s, "base64");
}

function sign(payload: string): Buffer {
  return createHmac("sha256", getSecret()).update(payload).digest();
}

export function signSession<T>(value: T): string {
  const json = JSON.stringify(value);
  const payload = base64UrlEncode(Buffer.from(json, "utf8"));
  const signature = base64UrlEncode(sign(payload));
  return `${payload}.${signature}`;
}

export function verifySession<T>(token: string | undefined): T | null {
  if (!token) return null;
  const dot = token.indexOf(".");
  if (dot < 0) return null;
  const payload = token.slice(0, dot);
  const signature = token.slice(dot + 1);

  let providedSig: Buffer;
  try {
    providedSig = base64UrlDecode(signature);
  } catch {
    return null;
  }
  const expectedSig = sign(payload);
  if (
    providedSig.length !== expectedSig.length ||
    !timingSafeEqual(providedSig, expectedSig)
  ) {
    return null;
  }

  try {
    const json = base64UrlDecode(payload).toString("utf8");
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}
