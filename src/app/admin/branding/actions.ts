"use server";

import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";

const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"];
const MAX_LOGO_SIZE = 2 * 1024 * 1024; // 2 MB

async function saveUploadedFile(
  file: File,
  subfolder: string,
  schoolId: string,
): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
  const dir = join(process.cwd(), "public", "uploads", subfolder);
  await mkdir(dir, { recursive: true });
  const filename = `${schoolId}.${ext}`;
  const bytes = await file.arrayBuffer();
  await writeFile(join(dir, filename), Buffer.from(bytes));
  return `/uploads/${subfolder}/${filename}`;
}

export async function saveBranding(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "admin") redirect(ROLE_HOME[effectiveRole(session)]);
  if (!session.schoolId) return;

  const schoolName = (formData.get("schoolName") as string | null)?.trim() ?? "";
  if (!schoolName) return;

  const accentColor = (formData.get("accentHex") as string | null)?.trim() ?? null;
  const logoFile = formData.get("logo") as File | null;
  const faviconFile = formData.get("favicon") as File | null;

  const data: Record<string, unknown> = { name: schoolName };

  if (accentColor && /^#[0-9a-fA-F]{6}$/.test(accentColor)) {
    data.accentColor = accentColor;
  }

  if (logoFile && logoFile.size > 0) {
    if (!ALLOWED_IMAGE_TYPES.includes(logoFile.type)) {
      throw new Error("Logo: nur PNG, JPEG, SVG oder WebP erlaubt");
    }
    if (logoFile.size > MAX_LOGO_SIZE) {
      throw new Error("Logo: max. 2 MB");
    }
    data.logoUrl = await saveUploadedFile(logoFile, "logos", session.schoolId);
  }

  if (faviconFile && faviconFile.size > 0) {
    if (!ALLOWED_IMAGE_TYPES.includes(faviconFile.type) && faviconFile.type !== "image/x-icon") {
      throw new Error("Favicon: nur PNG, SVG oder ICO erlaubt");
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
}
