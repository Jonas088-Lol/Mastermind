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

  const file = await prisma.masterTaskFile.findUnique({
    where: { id },
    include: { task: { select: { schoolId: true } } },
  });
  if (!file) return new NextResponse("Not found", { status: 404 });

  // Anyone from the same school can download task materials
  if (file.task.schoolId !== session.schoolId) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  if (!file.path.startsWith("mastertask/")) {
    return new NextResponse("Invalid path", { status: 400 });
  }

  let buffer: Buffer;
  try {
    buffer = await readFile(join(UPLOAD_DIR, file.path));
  } catch {
    return new NextResponse("Datei nicht gefunden", { status: 404 });
  }

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(file.name)}"`,
    },
  });
}
