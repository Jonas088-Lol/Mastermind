/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";
import { loadPlanBoardData } from "@/lib/plan-board";
import { PlanBoardClient } from "@/components/plan/PlanBoardClient";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Anzeigetafel · Admin" };

export default async function AdminAnzeigetafelPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "admin") redirect(ROLE_HOME[effectiveRole(session)]);
  if (!session.schoolId) redirect("/admin");

  const data = await loadPlanBoardData(session.schoolId);
  return <PlanBoardClient {...data} />;
}
