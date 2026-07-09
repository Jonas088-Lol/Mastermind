import { writeFile, mkdir } from "fs/promises";
import { join, extname, basename } from "path";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getSession } from "@/lib/session";

const UPLOAD_DIR = join(process.cwd(), "uploads", "drive");
const MAX_SIZE = 100 * 1024 * 1024; // 100 MB per file

const ALLOWED_TYPES = [
  "application/pdf",
  // SVG bewusst NICHT erlaubt: kann eingebettetes JavaScript enthalten und
  // wäre bei direkter Auslieferung ein XSS-Vektor.
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "video/mp4", "video/webm",
  "audio/mpeg", "audio/mp4", "audio/ogg", "audio/wav",
  "application/zip", "application/x-zip-compressed",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain", "text/csv",
];

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const isPublic = formData.get("isPublic") === "true";

  if (!file) return NextResponse.json({ error: "Keine Datei" }, { status: 400 });
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "Datei zu groß (max. 100 MB)" }, { status: 413 });
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Dateityp nicht erlaubt" }, { status: 415 });
  }

  // Sanitize filename — strip path traversal, keep extension
  const ext = extname(file.name).toLowerCase();
  const safeName = basename(file.name).replace(/[^a-zA-Z0-9._\-äöüÄÖÜß ]/g, "_").slice(0, 200);
  const unique = `${Date.now()}_${crypto.randomUUID().slice(0, 8)}${ext}`;

  const userDir = join(UPLOAD_DIR, session.userId);
  await mkdir(userDir, { recursive: true });

  const filePath = join(userDir, unique);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  const relativePath = `drive/${session.userId}/${unique}`;

  const record = await prisma.driveFile.create({
    data: {
      name: safeName,
      mimeType: file.type,
      size: file.size,
      path: relativePath,
      userId: session.userId,
      schoolId: session.schoolId ?? null,
      isPublic,
    },
  });

  return NextResponse.json({ id: record.id, name: record.name });
}
