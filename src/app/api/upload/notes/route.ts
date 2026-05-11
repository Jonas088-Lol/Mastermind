import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

const UPLOAD_DIR = join(process.cwd(), "public", "uploads", "notes");
const MAX_SIZE_MB = 5;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) return NextResponse.json({ error: "Keine Datei" }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Nur JPG, PNG, WebP oder GIF erlaubt" }, { status: 415 });
  }
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    return NextResponse.json({ error: `Maximale Größe: ${MAX_SIZE_MB} MB` }, { status: 413 });
  }

  const ext = file.type.split("/")[1].replace("jpeg", "jpg");
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  await mkdir(UPLOAD_DIR, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(join(UPLOAD_DIR, filename), buffer);

  return NextResponse.json({ filename, size: file.size, mimeType: file.type });
}
