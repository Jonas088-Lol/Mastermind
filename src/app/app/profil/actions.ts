"use server";

import { writeFile } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { awardCoins } from "@/lib/coins";

export async function uploadAvatar(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "student") return;

  const file = formData.get("avatar") as File | null;
  if (!file || file.size === 0) return;

  const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
  if (file.size > MAX_SIZE) return;

  // Nur Bild-Typen erlauben (Avatare werden direkt statisch ausgeliefert).
  const AVATAR_EXT: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
  };
  const ext = AVATAR_EXT[file.type];
  if (!ext) return;
  const filename = `${session.userId}.${ext}`;
  const dest = path.join(process.cwd(), "public", "uploads", "avatars", filename);

  const bytes = await file.arrayBuffer();
  await writeFile(dest, Buffer.from(bytes));

  const hadAvatar = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { avatarUrl: true },
  });

  await prisma.user.update({
    where: { id: session.userId },
    data: { avatarUrl: `/uploads/avatars/${filename}` },
  });

  // Award coins for first-time avatar upload
  if (!hadAvatar?.avatarUrl) {
    awardCoins(session.userId, "profil_foto_gesetzt").catch(() => undefined);
  }

  revalidatePath("/app/profil");
}

export async function updateBio(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "student") return;

  const bio             = String(formData.get("bio")             ?? "").slice(0, 300);
  const quote           = String(formData.get("quote")           ?? "").slice(0, 150);
  const favoriteSubject = String(formData.get("favoriteSubject") ?? "").slice(0, 50);

  await prisma.user.update({
    where: { id: session.userId },
    data: {
      bio:             bio             || null,
      quote:           quote           || null,
      favoriteSubject: favoriteSubject || null,
    },
  });

  revalidatePath("/app/profil");
}
