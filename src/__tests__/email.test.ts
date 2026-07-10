import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  sendEmail,
  magicLinkEmail,
  passwordResetEmail,
  twoFactorResetEmail,
  backupCodeUsedEmail,
} from "@/lib/email";

describe("email templates", () => {
  it("magicLinkEmail produces correct subject and body", () => {
    const msg = magicLinkEmail({ email: "test@example.com", url: "https://example.com/magic/abc", expiresMin: 15 });
    expect(msg.to).toBe("test@example.com");
    expect(msg.subject).toContain("MasterMind");
    expect(msg.text).toContain("https://example.com/magic/abc");
    expect(msg.text).toContain("15");
  });

  it("passwordResetEmail includes the reset URL", () => {
    const msg = passwordResetEmail({ email: "a@b.com", url: "https://example.com/reset?token=xyz", expiresMin: 30 });
    expect(msg.text).toContain("https://example.com/reset?token=xyz");
  });

  it("twoFactorResetEmail includes admin name", () => {
    const msg = twoFactorResetEmail({ email: "user@school.de", adminName: "Max Mustermann" });
    expect(msg.text).toContain("Max Mustermann");
    expect(msg.subject).toContain("Zwei-Faktor");
  });

  it("backupCodeUsedEmail warns about account compromise", () => {
    const msg = backupCodeUsedEmail({ email: "s@school.de" });
    expect(msg.subject).toContain("Backup-Code");
    expect(msg.text).toContain("NICHT");
  });
});

describe("sendEmail console transport", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    delete process.env.RESEND_API_KEY;
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it("returns ok=true when no API key is set", async () => {
    const result = await sendEmail({ to: "test@example.com", subject: "Test", text: "Hello" });
    expect(result.ok).toBe(true);
    expect(result.id).toMatch(/^console-/);
  });

  it("logs the email content to console", async () => {
    await sendEmail({ to: "test@example.com", subject: "My Subject", text: "Body text" });
    expect(consoleSpy).toHaveBeenCalledOnce();
    const logged = consoleSpy.mock.calls[0][0] as string;
    expect(logged).toContain("My Subject");
    // Der Console-Transport maskiert die Empfängeradresse (PII-Schutz): Domain
    // bleibt sichtbar, der lokale Teil wird verkürzt.
    expect(logged).toContain("@example.com");
    expect(logged).not.toContain("test@example.com");
  });
});
