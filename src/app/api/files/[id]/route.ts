/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { createReadStream, existsSync } from "fs";
import { stat } from "fs/promises";
import { join } from "path";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const record = await prisma.fileUpload.findUnique({
    where: { id },
    include: {
      assignment: { select: { teacherId: true } },
    },
  });

  if (!record) return new Response("Not found", { status: 404 });

  const role = effectiveRole(session);
  const isOwner = record.userId === session.userId;
  const isTeacher =
    (role === "teacher" || role === "super") &&
    record.assignment?.teacherId === session.userId;

  if (!isOwner && !isTeacher) {
    return new Response("Forbidden", { status: 403 });
  }

  const filePath = join(process.cwd(), record.path);
  if (!existsSync(filePath)) {
    return new Response("File not found on disk", { status: 404 });
  }

  // Verschlüsselte Dateien werden beim Ausliefern transparent entschlüsselt
  // (Flag aus der DB; zur Sicherheit zusätzlich Magic-Byte-Check).
  let size: number;
  let stream: NodeJS.ReadableStream;
  const { isEncryptedFile, createDecryptStream } = await import("@/lib/privacy/file-encryption");
  const recEncrypted = (record as { encrypted?: boolean }).encrypted ?? false;
  if (recEncrypted || (await isEncryptedFile(filePath).catch(() => false))) {
    try {
      const dec = await createDecryptStream(filePath);
      stream = dec.stream;
      size = dec.plainSize;
    } catch {
      return new Response("Datei konnte nicht entschlüsselt werden", { status: 500 });
    }
  } else {
    size = (await stat(filePath)).size;
    stream = createReadStream(filePath);
  }
  const body = new ReadableStream({
    start(controller) {
      stream.on("data", (chunk) => controller.enqueue(chunk));
      stream.on("end", () => controller.close());
      stream.on("error", (err) => controller.error(err));
    },
  });

  const download = req.nextUrl.searchParams.get("download") === "1";
  return new Response(body, {
    headers: {
      "Content-Type": record.mimeType,
      "Content-Length": String(size),
      "Content-Disposition": download
        ? `attachment; filename="${record.filename}"`
        : `inline; filename="${record.filename}"`,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
