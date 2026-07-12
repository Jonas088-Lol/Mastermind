/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { describe, it, expect } from "vitest";
import { isLikelyBackupCode } from "@/lib/auth/backup-codes";

describe("isLikelyBackupCode", () => {
  it("accepts valid backup code format", () => {
    expect(isLikelyBackupCode("ABCD-EFGH")).toBe(true);
    expect(isLikelyBackupCode("2345-6789")).toBe(true);
    expect(isLikelyBackupCode("WXYZ-MNPQ")).toBe(true);
  });

  it("rejects codes with invalid characters", () => {
    // 0, 1, I, L, O, U are excluded from charset
    expect(isLikelyBackupCode("0BCD-EFGH")).toBe(false);
    expect(isLikelyBackupCode("1BCD-EFGH")).toBe(false);
    expect(isLikelyBackupCode("IBCD-EFGH")).toBe(false);
    expect(isLikelyBackupCode("LBCD-EFGH")).toBe(false);
  });

  it("rejects codes of wrong length", () => {
    expect(isLikelyBackupCode("ABC-EFGH")).toBe(false);
    expect(isLikelyBackupCode("ABCDE-EFGH")).toBe(false);
    expect(isLikelyBackupCode("ABCD")).toBe(false);
    expect(isLikelyBackupCode("")).toBe(false);
  });

  it("accepts codes with spaces instead of dashes", () => {
    expect(isLikelyBackupCode("ABCD EFGH")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(isLikelyBackupCode("abcd-efgh")).toBe(true);
  });
});
