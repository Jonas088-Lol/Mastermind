/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { getSession, isSuper } from "@/lib/session";

const DEFAULT_FLAGS = [
  { name: "ki.korrektur.v3",           description: "KI-Modell v3 für Korrekturvorschläge",           state: "on",         rollout: 100, scope: "alle Pro · Enterprise", owner: "Plattform", metric: "Confidence ↑ 7 %" },
  { name: "ki.tutor.audio",            description: "Sprach-Chat mit dem KI-Tutor",                   state: "experiment", rollout: 12,  scope: "4 Beta-Schulen",       owner: "Plattform", metric: "Engagement ↑ 23 %" },
  { name: "community.peer-review",     description: "Peer-Bewertungen für geteilte Notizen",          state: "on",         rollout: 100, scope: "alle",                  owner: "Plattform" },
  { name: "experiment.dashboard.v2",   description: "Neues Schüler-Dashboard mit Streak-Karte oben", state: "experiment", rollout: 8,   scope: "intern · 2 Schulen",   owner: "Plattform", metric: "Time-to-task ↓ 18 %" },
  { name: "billing.stripe-tax",        description: "Automatische USt-Berechnung via Stripe Tax",    state: "rollout",    rollout: 60,  scope: "DACH-Schulen",          owner: "Plattform" },
  { name: "auth.passkeys",             description: "WebAuthn-Passkeys statt Passwort",              state: "rollout",    rollout: 40,  scope: "Lehrer + Admin · opt-in",owner: "Plattform", metric: "Login-Time ↓ 62 %" },
  { name: "perf.cache-components",     description: "Next.js cache-components für Listen",           state: "on",         rollout: 100, scope: "alle",                  owner: "Plattform", metric: "p95 ↓ 31 %" },
  { name: "ki.bias-detector",          description: "Bias-Warnung bei KI-Antworten",                state: "experiment", rollout: 4,   scope: "intern",                 owner: "Plattform" },
  { name: "mobile.bottom-nav",         description: "Mobile Bottom-Navigation für Schüler/Lehrer",  state: "on",         rollout: 100, scope: "alle",                  owner: "Plattform", metric: "Mobile DAU ↑ 14 %" },
  { name: "experiment.swipe-gestures", description: "Swipe in Karteikarten · Up = gewusst",         state: "off",        rollout: 0,   scope: "deaktiviert",            owner: "Plattform" },
  { name: "comms.email-digest",        description: "Wöchentlicher KPI-Digest an Schul-Admin",     state: "on",         rollout: 100, scope: "alle Pro · Enterprise", owner: "Plattform" },
  { name: "kill.legacy-untis-import",  description: "Alte Untis-Import-Pipeline endgültig aus",    state: "rollout",    rollout: 80,  scope: "alle außer 12 Schulen", owner: "Plattform" },
];

export async function ensureDefaultFlags(): Promise<void> {
  for (const f of DEFAULT_FLAGS) {
    await prisma.featureFlag.upsert({
      where: { name: f.name },
      update: {},
      create: f,
    });
  }
}

export async function toggleFlag(name: string): Promise<void> {
  const session = await getSession();
  if (!session || !isSuper(session)) redirect("/login");

  await ensureDefaultFlags();

  const flag = await prisma.featureFlag.findUnique({ where: { name } });
  if (!flag) return;

  const nextState = flag.state === "on" || flag.state === "rollout" ? "off" : "on";
  await prisma.featureFlag.update({
    where: { name },
    data: { state: nextState },
  });

  revalidatePath("/plattform/flags");
}

export async function createFlag(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || !isSuper(session)) redirect("/login");

  const name = String(formData.get("name") ?? "").trim().toLowerCase().replace(/\s+/g, "-");
  const description = String(formData.get("description") ?? "").trim();
  const state = (formData.get("state") ?? "off") as "on" | "off" | "rollout" | "experiment";
  const rollout = Math.min(100, Math.max(0, Number(formData.get("rollout") ?? 0)));
  const owner = String(formData.get("owner") ?? "Plattform").trim();
  const scope = String(formData.get("scope") ?? "alle").trim();

  if (!name || !description) redirect("/plattform/flags/neu?error=Pflichtfelder+fehlen");

  const existing = await prisma.featureFlag.findUnique({ where: { name } });
  if (existing) redirect("/plattform/flags/neu?error=Flag+existiert+bereits");

  await prisma.featureFlag.create({ data: { name, description, state, rollout, owner, scope } });
  revalidatePath("/plattform/flags");
  redirect("/plattform/flags");
}

export async function updateFlag(name: string, formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || !isSuper(session)) redirect("/login");

  const description = String(formData.get("description") ?? "").trim();
  const state = (formData.get("state") ?? "off") as "on" | "off" | "rollout" | "experiment";
  const rollout = Math.min(100, Math.max(0, Number(formData.get("rollout") ?? 0)));
  const owner = String(formData.get("owner") ?? "").trim();
  const scope = String(formData.get("scope") ?? "").trim();

  await prisma.featureFlag.update({ where: { name }, data: { description, state, rollout, owner, scope } });
  revalidatePath("/plattform/flags");
  redirect("/plattform/flags");
}

export async function deleteFlag(name: string): Promise<void> {
  const session = await getSession();
  if (!session || !isSuper(session)) redirect("/login");

  await prisma.featureFlag.delete({ where: { name } });
  revalidatePath("/plattform/flags");
  redirect("/plattform/flags");
}

export async function updateFlagState(
  name: string,
  state: "on" | "off" | "rollout" | "experiment",
  rollout: number
): Promise<void> {
  const session = await getSession();
  if (!session || !isSuper(session)) redirect("/login");

  await prisma.featureFlag.update({
    where: { name },
    data: { state, rollout },
  });

  revalidatePath("/plattform/flags");
}
