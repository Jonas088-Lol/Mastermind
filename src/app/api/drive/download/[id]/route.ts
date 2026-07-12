/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { readFile } from "fs/promises";
import { join } from "path";
import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getSession } from "@/lib/session";

const UPLOAD_DIR = join(process.cwd(), "uploads");

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const file = await prisma.driveFile.findUnique({ where: { id } });
  if (!file) return new NextResponse("Not found", { status: 404 });

  // Access control: owner, same-school members (if public), or admin
  const isOwner = file.userId === session.userId;
  const isSameSchool = file.schoolId && file.schoolId === session.schoolId;
  if (!isOwner && !(file.isPublic && isSameSchool)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // Normalize path — strip any leading slash or "uploads/" prefix, then ensure it starts with "drive/"
  const normalized = file.path.replace(/^[\\/]+/, "").replace(/^uploads[\\/]/, "");
  if (!normalized.startsWith("drive/")) {
    return new NextResponse("Invalid path", { status: 400 });
  }

  const abs = join(UPLOAD_DIR, normalized);
  let buffer: Buffer;
  try {
    buffer = await readFile(abs);
  } catch {
    return new NextResponse("Datei nicht gefunden", { status: 404 });
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(file.name)}"`,
      "Content-Length": String(buffer.length),
      // Verhindert MIME-Sniffing durch den Browser (XSS-Schutz bei Uploads).
      "X-Content-Type-Options": "nosniff",
    },
  });
}
