/* Copyright 2026 Elian Schock, Jonas Schwenk */
// Eigenständige Auth für /mails — Credentials kommen aus Umgebungsvariablen
// Setze in .env.production:
//   MAIL_USER=Admin
//   MAIL_PASS=dein-passwort
//   MAIL_TOKEN=zufaelliger-langer-string (z.B. openssl rand -hex 32)

export const MAIL_COOKIE = "mm_mail";

export function getMailCredentials() {
  return {
    user: process.env.MAIL_USER ?? "Admin",
    pass: process.env.MAIL_PASS ?? "",
  };
}

export function isMailSessionValid(token: string | undefined): boolean {
  const secret = process.env.MAIL_TOKEN;
  if (!secret || !token) return false;
  return token === secret;
}

export function mailToken(): string {
  return process.env.MAIL_TOKEN ?? "";
}
