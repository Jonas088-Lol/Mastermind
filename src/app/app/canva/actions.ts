"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { getSession } from "@/lib/session";

function toEmbedUrl(raw: string): string {
  // Accept both share URLs and embed URLs
  // Share: https://www.canva.com/design/XXXXX/anything
  // Embed: https://www.canva.com/design/XXXXX/.../view?embed
  const match = raw.match(/canva\.com\/design\/([A-Za-z0-9_-]+)/);
  if (!match) return raw;
  const designId = match[1];
  // Extract the view-key part if present, otherwise use a generic path
  const viewMatch = raw.match(/canva\.com\/design\/[A-Za-z0-9_-]+\/([A-Za-z0-9_-]+)\/view/);
  const viewKey = viewMatch?.[1] ?? "view";
  return `https://www.canva.com/design/${designId}/${viewKey}/view?embed`;
}

export async function saveCanvaEmbed(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");

  const title = String(formData.get("title") ?? "").trim();
  const rawUrl = String(formData.get("embedUrl") ?? "").trim();
  const isPublic = formData.get("isPublic") === "on";

  if (!title || !rawUrl) return;
  if (!rawUrl.includes("canva.com")) return;

  const embedUrl = toEmbedUrl(rawUrl);

  await prisma.canvaEmbed.create({
    data: {
      title,
      embedUrl,
      userId: session.userId,
      schoolId: session.schoolId ?? null,
      isPublic,
    },
  });

  revalidatePath("/app/canva");
  redirect("/app/canva");
}

export async function deleteCanvaEmbed(id: string) {
  const session = await getSession();
  if (!session) return;

  const embed = await prisma.canvaEmbed.findUnique({ where: { id } });
  if (!embed || embed.userId !== session.userId) return;

  await prisma.canvaEmbed.delete({ where: { id } });
  revalidatePath("/app/canva");
}
