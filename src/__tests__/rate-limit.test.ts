import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock Upstash to force in-memory fallback
vi.mock("@upstash/ratelimit", () => ({ Ratelimit: class {} }));
vi.mock("@upstash/redis", () => ({ Redis: class {} }));

// Must import after mocks
const { rateLimit } = await import("@/lib/security/rate-limit");

describe("in-memory rate limiter", () => {
  beforeEach(() => {
    // Clear module cache so BUCKETS map resets between test files
    vi.resetModules();
  });

  it("allows requests within the limit", async () => {
    const opts = { scope: "test-allow", key: "user-1", limit: 3, windowSec: 60 };
    const r1 = await rateLimit(opts);
    const r2 = await rateLimit(opts);
    const r3 = await rateLimit(opts);
    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    expect(r3.ok).toBe(true);
  });

  it("blocks requests that exceed the limit", async () => {
    const opts = { scope: "test-block", key: "user-2", limit: 2, windowSec: 60 };
    await rateLimit(opts); // 1
    await rateLimit(opts); // 2
    const r3 = await rateLimit(opts); // 3 — should be blocked
    expect(r3.ok).toBe(false);
    expect(r3.remaining).toBe(0);
    expect(r3.retryAfterSec).toBeGreaterThan(0);
  });

  it("uses separate buckets per scope+key", async () => {
    await rateLimit({ scope: "ns-a", key: "same", limit: 1, windowSec: 60 });
    const second = await rateLimit({ scope: "ns-a", key: "same", limit: 1, windowSec: 60 });
    expect(second.ok).toBe(false);

    // Different key — should still be allowed
    const other = await rateLimit({ scope: "ns-a", key: "other", limit: 1, windowSec: 60 });
    expect(other.ok).toBe(true);
  });

  it("returns correct remaining count", async () => {
    const opts = { scope: "test-remaining", key: "user-3", limit: 5, windowSec: 60 };
    const r1 = await rateLimit(opts);
    expect(r1.remaining).toBe(4);
    const r2 = await rateLimit(opts);
    expect(r2.remaining).toBe(3);
  });
});
