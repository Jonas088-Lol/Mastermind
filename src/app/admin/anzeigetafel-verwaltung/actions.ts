/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { canManageSchool, canAccessArea } from "@/lib/school-admin";

const PATH = "/admin/anzeigetafel-verwaltung";

async function requireAdmin() {
  const session = await getSession();
  if (!session) return null;
  if (!canManageSchool(effectiveRole(session))) return null;
  if (!canAccessArea(effectiveRole(session), "anzeigetafel-verwaltung")) redirect("/admin");
  if (!session.schoolId) return null;
  return session;
}

export async function createAnnouncement(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  if (!session) return;

  const title = ((formData.get("title") as string) || "").trim().slice(0, 120);
  const body = ((formData.get("body") as string) || "").trim().slice(0, 600);
  const emoji = ((formData.get("emoji") as string) || "").trim().slice(0, 8);
  const colorRaw = ((formData.get("color") as string) || "").trim().slice(0, 20);
  // Nur gültige Hex-Farben zulassen (6er-Palette der Seite).
  const color = /^#[0-9a-fA-F]{6}$/.test(colorRaw) ? colorRaw : null;
  if (!title) return;

  const last = await prisma.boardAnnouncement.findFirst({
    where: { schoolId: session.schoolId! },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  await prisma.boardAnnouncement.create({
    data: {
      schoolId: session.schoolId!,
      title,
      body: body || null,
      emoji: emoji || null,
      color,
      active: true,
      order: (last?.order ?? -1) + 1,
    },
  });

  revalidatePath(PATH);
}

export async function toggleAnnouncement(id: string): Promise<void> {
  const session = await requireAdmin();
  if (!session) return;

  const existing = await prisma.boardAnnouncement.findFirst({
    where: { id, schoolId: session.schoolId! },
    select: { active: true },
  });
  if (!existing) return;

  await prisma.boardAnnouncement.update({
    where: { id },
    data: { active: !existing.active },
  });

  revalidatePath(PATH);
}

export async function moveAnnouncement(id: string, direction: "up" | "down"): Promise<void> {
  const session = await requireAdmin();
  if (!session) return;

  const current = await prisma.boardAnnouncement.findFirst({
    where: { id, schoolId: session.schoolId! },
    select: { id: true, order: true },
  });
  if (!current) return;

  const neighbor = await prisma.boardAnnouncement.findFirst({
    where: {
      schoolId: session.schoolId!,
      order: direction === "up" ? { lt: current.order } : { gt: current.order },
    },
    orderBy: { order: direction === "up" ? "desc" : "asc" },
    select: { id: true, order: true },
  });
  if (!neighbor) return;

  await prisma.$transaction([
    prisma.boardAnnouncement.update({ where: { id: current.id }, data: { order: neighbor.order } }),
    prisma.boardAnnouncement.update({ where: { id: neighbor.id }, data: { order: current.order } }),
  ]);

  revalidatePath(PATH);
}

export async function deleteAnnouncement(id: string): Promise<void> {
  const session = await requireAdmin();
  if (!session) return;

  await prisma.boardAnnouncement.deleteMany({
    where: { id, schoolId: session.schoolId! },
  });

  revalidatePath(PATH);
}
