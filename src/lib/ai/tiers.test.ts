/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { describe, it, expect } from "vitest";
import { MODELS } from "@/lib/ai";
import { AI_DEFAULT_MODEL } from "@/lib/security/ai-guard";

// Schützt die Kostenoptimierung vor versehentlicher Regression: Der günstige
// Standard darf nicht wieder auf ein teures Opus-Modell rutschen.
describe("KI-Modell-Tiers (Kostenschutz)", () => {
  it("bietet drei Tiers", () => {
    expect(MODELS.fast).toBeTruthy();
    expect(MODELS.balanced).toBeTruthy();
    expect(MODELS.smart).toBeTruthy();
  });

  it("nutzt Haiku als günstigstes Tier", () => {
    expect(MODELS.fast).toContain("haiku");
  });

  it("nutzt Sonnet als ausgewogenes Tier", () => {
    expect(MODELS.balanced).toContain("sonnet");
  });

  it("hält den Guard-Fallback günstig (kein Opus-Default)", () => {
    expect(AI_DEFAULT_MODEL).not.toContain("opus");
    expect(AI_DEFAULT_MODEL).toBe(MODELS.fast);
  });
});
