/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Postfach · Konvertis" };

// Auth-Check passiert in page.tsx — nicht hier, damit /mails/login keine Schleife erzeugt
export default function MailsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
