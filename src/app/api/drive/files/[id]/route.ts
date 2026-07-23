/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { unlink } from "fs/promises";
import { join } from "path";
import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { canManageSchool } from "@/lib/school-admin";

const UPLOAD_DIR = join(process.cwd(), "uploads");

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const file = await prisma.driveFile.findUnique({ where: { id } });
  if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const role = effectiveRole(session);
  const isOwner = file.userId === session.userId;
  const isAdmin = canManageSchool(role) && file.schoolId === session.schoolId;
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Papierkorb: aktive Datei wandert erst in den Papierkorb (Soft-Delete),
  // eine bereits gelöschte wird endgültig entfernt (physisch + DB).
  if (!file.deletedAt) {
    await prisma.driveFile.update({ where: { id }, data: { deletedAt: new Date() } });
    return NextResponse.json({ ok: true, trashed: true });
  }

  if (file.path.startsWith("drive/")) {
    await unlink(join(UPLOAD_DIR, file.path)).catch(() => null);
  }
  await prisma.driveFile.delete({ where: { id } });
  return NextResponse.json({ ok: true, purged: true });
}

/** Wiederherstellen aus dem Papierkorb oder Favorit umschalten. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const file = await prisma.driveFile.findUnique({ where: { id } });
  if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // Favorit/Wiederherstellen nur für die eigene Datei.
  if (file.userId !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { action?: string; favorite?: boolean } = {};
  try { body = await req.json(); } catch { /* leerer Body erlaubt */ }

  const data: { deletedAt?: null; favorite?: boolean } = {};
  if (body.action === "restore") data.deletedAt = null;
  if (typeof body.favorite === "boolean") data.favorite = body.favorite;
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Bad Request" }, { status: 400 });
  }

  await prisma.driveFile.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}
