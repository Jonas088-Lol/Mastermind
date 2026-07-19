/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";

import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";
import { canManageSchool, canAccessArea } from "@/lib/school-admin";

// SVG bewusst NICHT erlaubt — SVG kann <script> enthalten und wird direkt
// statisch ausgeliefert (stored XSS). Nur Rastergrafiken.
const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};
const MAX_LOGO_SIZE = 2 * 1024 * 1024; // 2 MB

async function saveUploadedFile(
  file: File,
  subfolder: string,
  schoolId: string,
  suffix = "",
): Promise<string> {
  // Extension aus dem (validierten) MIME-Typ ableiten, nicht aus file.name.
  const ext = ALLOWED_IMAGE_TYPES[file.type] ?? "png";
  const dir = join(process.cwd(), "public", "uploads", subfolder);
  await mkdir(dir, { recursive: true });
  const filename = `${schoolId}${suffix}.${ext}`;
  const bytes = await file.arrayBuffer();
  await writeFile(join(dir, filename), Buffer.from(bytes));
  return `/uploads/${subfolder}/${filename}`;
}

export async function saveBranding(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canManageSchool(effectiveRole(session))) redirect(ROLE_HOME[effectiveRole(session)]);
  if (!canAccessArea(effectiveRole(session), "branding")) redirect("/admin");
  if (!session.schoolId) return;

  const schoolName = (formData.get("schoolName") as string | null)?.trim() ?? "";
  if (!schoolName) return;

  const brandName = (formData.get("brandName") as string | null)?.trim() || null;
  const accentColor = (formData.get("accentHex") as string | null)?.trim() ?? null;
  const secondaryColor = (formData.get("secondaryHex") as string | null)?.trim() ?? null;
  const logoFile = formData.get("logo") as File | null;
  const logoDarkFile = formData.get("logoDark") as File | null;
  const faviconFile = formData.get("favicon") as File | null;

  const data: Record<string, unknown> = {
    name: schoolName,
    brandName,
  };

  if (accentColor && /^#[0-9a-fA-F]{6}$/.test(accentColor)) {
    data.accentColor = accentColor;
  }

  if (secondaryColor && /^#[0-9a-fA-F]{6}$/.test(secondaryColor)) {
    data.secondaryColor = secondaryColor;
  }

  if (logoFile && logoFile.size > 0) {
    if (!(logoFile.type in ALLOWED_IMAGE_TYPES)) {
      throw new Error("Logo: nur PNG, JPEG oder WebP erlaubt");
    }
    if (logoFile.size > MAX_LOGO_SIZE) {
      throw new Error("Logo: max. 2 MB");
    }
    data.logoUrl = await saveUploadedFile(logoFile, "logos", session.schoolId);
  }

  if (logoDarkFile && logoDarkFile.size > 0) {
    if (!(logoDarkFile.type in ALLOWED_IMAGE_TYPES)) {
      throw new Error("Dark Logo: nur PNG, JPEG oder WebP erlaubt");
    }
    if (logoDarkFile.size > MAX_LOGO_SIZE) {
      throw new Error("Dark Logo: max. 2 MB");
    }
    data.logoDarkUrl = await saveUploadedFile(logoDarkFile, "logos", session.schoolId, "-dark");
  }

  if (faviconFile && faviconFile.size > 0) {
    if (!(faviconFile.type in ALLOWED_IMAGE_TYPES)) {
      throw new Error("Favicon: nur PNG, JPEG oder WebP erlaubt");
    }
    if (faviconFile.size > MAX_LOGO_SIZE) {
      throw new Error("Favicon: max. 2 MB");
    }
    data.faviconUrl = await saveUploadedFile(faviconFile, "favicons", session.schoolId);
  }

  await prisma.school.update({
    where: { id: session.schoolId },
    data,
  });

  revalidatePath("/admin/branding");
  revalidatePath("/admin");
  revalidatePath("/app");
  revalidatePath("/teach");
}
