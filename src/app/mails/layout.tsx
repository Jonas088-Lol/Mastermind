import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { effectiveRole, getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Postfach · Konvertis" };

export default async function MailsLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "admin") redirect("/login");
  return <>{children}</>;
}
