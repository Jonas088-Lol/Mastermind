/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { writeFile, mkdir, stat, appendFile } from "fs/promises";
import { join } from "path";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/client";
import { getSession } from "@/lib/session";

const UPLOAD_DIR = join(process.cwd(), "uploads");
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500 MB
const ALLOWED_TYPES = [
  "video/mp4", "video/webm", "video/quicktime", "video/x-msvideo",
  "audio/mpeg", "audio/mp4", "audio/ogg", "audio/wav", "audio/webm",
  "application/pdf",
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "application/zip", "application/x-zip-compressed",
];

// POST /api/upload — single chunk or complete small file
// Headers: X-Upload-Id (optional for chunked), X-Chunk-Index, X-Total-Chunks, X-Filename, X-Mime-Type, X-Total-Size
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const uploadId = req.headers.get("X-Upload-Id") ?? crypto.randomUUID();
  // Validate uploadId is a proper UUID to prevent path traversal
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(uploadId)) {
    return Response.json({ error: "Ungültige Upload-ID" }, { status: 400 });
  }
  const chunkIndex = parseInt(req.headers.get("X-Chunk-Index") ?? "0", 10);
  const totalChunks = parseInt(req.headers.get("X-Total-Chunks") ?? "1", 10);
  const filename = req.headers.get("X-Filename") ?? "upload";
  const mimeType = req.headers.get("X-Mime-Type") ?? "application/octet-stream";
  const totalSize = parseInt(req.headers.get("X-Total-Size") ?? "0", 10);
  const assignmentId = req.headers.get("X-Assignment-Id") ?? null;

  // Validate mime type
  if (!ALLOWED_TYPES.includes(mimeType)) {
    return Response.json({ error: "Dateityp nicht erlaubt" }, { status: 415 });
  }

  // Validate total size
  if (totalSize > MAX_FILE_SIZE) {
    return Response.json({ error: "Datei zu groß (max. 500 MB)" }, { status: 413 });
  }

  // Assignment-Zuordnung prüfen: nur an ein Assignment der eigenen Klasse
  // anhängen (verhindert das Anhängen an fremde Aufgaben — IDOR).
  if (assignmentId) {
    const me = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { classId: true },
    });
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      select: { classId: true },
    });
    if (!assignment || !me?.classId || assignment.classId !== me.classId) {
      return Response.json({ error: "Aufgabe nicht zugänglich" }, { status: 403 });
    }
  }

  // Ensure upload dir exists
  const userDir = join(UPLOAD_DIR, session.userId);
  await mkdir(userDir, { recursive: true });

  // Temp file for chunked upload
  const tempPath = join(userDir, `${uploadId}.tmp`);
  const chunk = Buffer.from(await req.arrayBuffer());

  if (totalChunks > 1) {
    // Chunked: append to temp file
    await appendFile(tempPath, chunk);
  } else {
    // Single chunk: write directly
    await writeFile(tempPath, chunk);
  }

  // Last chunk → finalize
  if (chunkIndex + 1 >= totalChunks) {
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200);
    const finalName = `${uploadId}_${safeName}`;
    const finalPath = join(userDir, finalName);

    const { rename, unlink } = await import("fs/promises");
    const plainSize = (await stat(tempPath)).size;

    // At-Rest-Verschlüsselung (AES-256-GCM), wenn Keys konfiguriert sind.
    // Ohne Keys: Klartext wie bisher (graceful) — encrypted-Flag bleibt false.
    const { encryptFile, isFileEncryptionConfigured } = await import("@/lib/privacy/file-encryption");
    let encrypted = false;
    if (isFileEncryptionConfigured()) {
      await encryptFile(tempPath, finalPath);
      await unlink(tempPath);
      encrypted = true;
    } else {
      await rename(tempPath, finalPath);
    }

    // Store in DB (size = Klartext-Größe, wie sie der Nutzer kennt)
    const record = await prisma.fileUpload.create({
      data: {
        userId: session.userId,
        filename: safeName,
        mimeType,
        size: plainSize,
        path: `uploads/${session.userId}/${finalName}`,
        encrypted,
        assignmentId: assignmentId ?? null,
      },
    });

    return Response.json({ id: record.id, filename: safeName, size: plainSize, mimeType });
  }

  return Response.json({ uploadId, chunk: chunkIndex, received: true });
}

// GET /api/upload/:id — get upload info (for progress tracking)
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return Response.json({ error: "No id" }, { status: 400 });

  const record = await prisma.fileUpload.findFirst({
    where: { id, userId: session.userId },
  });

  if (!record) return new Response("Not found", { status: 404 });
  return Response.json(record);
}
