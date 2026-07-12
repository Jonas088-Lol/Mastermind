/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { unlink } from "fs/promises";
import { join } from "path";
import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";

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
  const isAdmin = role === "admin" && file.schoolId === session.schoolId;
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Delete physical file
  if (file.path.startsWith("drive/")) {
    await unlink(join(UPLOAD_DIR, file.path)).catch(() => null);
  }

  await prisma.driveFile.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
