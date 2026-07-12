/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { writeFile, mkdir } from "fs/promises";
import { join, extname } from "path";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";

const UPLOAD_DIR = join(process.cwd(), "uploads", "mastertask");
const MAX_SIZE = 100 * 1024 * 1024; // 100 MB

const ALLOWED = [
  "application/pdf",
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "video/mp4", "video/webm", "video/quicktime",
  "audio/mpeg", "audio/mp4", "audio/ogg", "audio/wav",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
];

// POST /api/mastertask/upload?taskId=xxx — teacher uploads explanation file
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "teacher") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const taskId = req.nextUrl.searchParams.get("taskId");
  if (!taskId) return NextResponse.json({ error: "taskId fehlt" }, { status: 400 });

  // Verify teacher owns the task
  const task = await prisma.masterTask.findUnique({ where: { id: taskId } });
  if (!task || task.teacherId !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Keine Datei" }, { status: 400 });
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "Datei zu groß (max. 100 MB)" }, { status: 413 });
  if (!ALLOWED.includes(file.type)) return NextResponse.json({ error: "Dateityp nicht erlaubt" }, { status: 415 });

  const ext = extname(file.name).toLowerCase();
  const unique = `${Date.now()}_${crypto.randomUUID().slice(0, 8)}${ext}`;
  const taskDir = join(UPLOAD_DIR, taskId);
  await mkdir(taskDir, { recursive: true });
  await writeFile(join(taskDir, unique), Buffer.from(await file.arrayBuffer()));

  const record = await prisma.masterTaskFile.create({
    data: {
      taskId,
      name: file.name.slice(0, 200),
      path: `mastertask/${taskId}/${unique}`,
      mimeType: file.type,
      size: file.size,
    },
  });

  return NextResponse.json({ id: record.id, name: record.name });
}
