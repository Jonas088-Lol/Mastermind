"use server";

import { writeFile } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";

export async function uploadAvatar(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "student") return;

  const file = formData.get("avatar") as File | null;
  if (!file || file.size === 0) return;

  const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
  if (file.size > MAX_SIZE) return;

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const filename = `${session.userId}.${ext}`;
  const dest = path.join(process.cwd(), "public", "uploads", "avatars", filename);

  const bytes = await file.arrayBuffer();
  await writeFile(dest, Buffer.from(bytes));

  await prisma.user.update({
    where: { id: session.userId },
    data: { avatarUrl: `/uploads/avatars/${filename}` },
  });

  revalidatePath("/app/profil");
}
