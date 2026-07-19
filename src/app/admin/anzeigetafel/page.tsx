/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";
import { loadPlanBoardData } from "@/lib/plan-board";
import { PlanBoardClient } from "@/components/plan/PlanBoardClient";
import { canManageSchool, canAccessArea } from "@/lib/school-admin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Anzeigetafel · Admin" };

export default async function AdminAnzeigetafelPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canManageSchool(effectiveRole(session))) redirect(ROLE_HOME[effectiveRole(session)]);
  if (!canAccessArea(effectiveRole(session), "anzeigetafel")) redirect("/admin");
  if (!session.schoolId) redirect("/admin");

  const data = await loadPlanBoardData(session.schoolId);
  return <PlanBoardClient {...data} />;
}
