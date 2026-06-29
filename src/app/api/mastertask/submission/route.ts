import { writeFile, mkdir } from "fs/promises";
import { join, extname } from "path";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getSession } from "@/lib/session";

const UPLOAD_DIR = join(process.cwd(), "uploads", "mastertask-submissions");
const MAX_SIZE = 50 * 1024 * 1024; // 50 MB

// POST /api/mastertask/submission?taskId=xxx — student uploads submission file
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const taskId = req.nextUrl.searchParams.get("taskId");
  if (!taskId) return NextResponse.json({ error: "taskId fehlt" }, { status: 400 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Keine Datei" }, { status: 400 });
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "Datei zu groß (max. 50 MB)" }, { status: 413 });

  const ext = extname(file.name).toLowerCase();
  const unique = `${Date.now()}_${crypto.randomUUID().slice(0, 8)}${ext}`;
  const dir = join(UPLOAD_DIR, taskId, session.userId);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, unique), Buffer.from(await file.arrayBuffer()));

  return NextResponse.json({
    path: `mastertask-submissions/${taskId}/${session.userId}/${unique}`,
    name: file.name.slice(0, 200),
  });
}
