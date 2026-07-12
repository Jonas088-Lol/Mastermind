/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { redirect } from "next/navigation";
import { effectiveRole, getSession } from "@/lib/session";
import { loadPlanBoardData } from "@/lib/plan-board";
import { PlanBoardClient } from "@/components/plan/PlanBoardClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Anzeigetafel · Stundenplan" };

export default async function AnzeigetafelPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const role = effectiveRole(session);
  if (!["secretary", "rector", "vice_rector", "admin", "super"].includes(role)) {
    redirect("/login");
  }

  const data = await loadPlanBoardData(session.schoolId ?? "");
  return <PlanBoardClient {...data} />;
}
