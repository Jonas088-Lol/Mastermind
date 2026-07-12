/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { describe, it, expect } from "vitest";
import { aiCacheKey, aiCacheGet, aiCacheSet } from "@/lib/ai/cache";

describe("aiCacheKey", () => {
  it("ist deterministisch für identische Eingaben", () => {
    const a = aiCacheKey({ model: "m", messages: [{ role: "user", content: "hi" }] });
    const b = aiCacheKey({ model: "m", messages: [{ role: "user", content: "hi" }] });
    expect(a).toBe(b);
  });

  it("unterscheidet unterschiedliche Eingaben", () => {
    const a = aiCacheKey({ model: "m", messages: [{ role: "user", content: "hi" }] });
    const b = aiCacheKey({ model: "m", messages: [{ role: "user", content: "ho" }] });
    expect(a).not.toBe(b);
  });

  it("berücksichtigt das Modell", () => {
    const fast = aiCacheKey({ model: "haiku", messages: [] });
    const smart = aiCacheKey({ model: "opus", messages: [] });
    expect(fast).not.toBe(smart);
  });

  it("erzeugt einen präfixierten Hash", () => {
    const key = aiCacheKey({ x: 1 });
    expect(key).toMatch(/^mm:aicache:[a-f0-9]{64}$/);
  });
});

describe("aiCache get/set (In-Memory-Fallback ohne Redis)", () => {
  it("liefert null für unbekannte Schlüssel", async () => {
    expect(await aiCacheGet("mm:aicache:doesnotexist")).toBeNull();
  });

  it("speichert und liest denselben Wert zurück", async () => {
    const key = aiCacheKey({ test: "roundtrip", n: Math.floor(1) });
    await aiCacheSet(key, "gespeicherter Wert", 60);
    expect(await aiCacheGet(key)).toBe("gespeicherter Wert");
  });
});
