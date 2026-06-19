"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { ALL_SKILL_TREES } from "@/lib/game";

export async function unlockSkillNode(
  subject: string,
  nodeSlug: string,
): Promise<void> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "student") return;

  const tree = ALL_SKILL_TREES[subject];
  if (!tree) return;

  const nodeDef = tree.find((n) => n.slug === nodeSlug);
  if (!nodeDef) return;

  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { xp: true } });
  if (!user || user.xp < nodeDef.requiredXp) return;

  // Check parent is unlocked — search across all subjects (parent may be "core" in a different subject)
  if (nodeDef.parentSlug) {
    const parentNode = await prisma.skillNode.findFirst({
      where: { slug: nodeDef.parentSlug },
    });
    // If parent has never been unlocked by anyone, it doesn't exist in DB → block
    if (!parentNode) return;
    const parentUnlocked = await prisma.userSkillNode.findFirst({
      where: { userId: session.userId, nodeId: parentNode.id },
    });
    if (!parentUnlocked) return;
  }

  // Upsert the SkillNode record (source of truth for slug→id mapping)
  const node = await prisma.skillNode.upsert({
    where: { subject_slug: { subject, slug: nodeSlug } },
    create: {
      subject,
      slug: nodeSlug,
      title: nodeDef.title,
      description: nodeDef.description,
      tier: nodeDef.tier,
      requiredXp: nodeDef.requiredXp,
      icon: nodeDef.icon,
      color: nodeDef.color,
      parentSlug: nodeDef.parentSlug,
      xpBonus: nodeDef.xpBonus,
    },
    update: {},
  });

  await prisma.userSkillNode.upsert({
    where: { userId_nodeId: { userId: session.userId, nodeId: node.id } },
    create: { userId: session.userId, nodeId: node.id },
    update: {},
  });

  revalidatePath("/app/skills");
  revalidatePath("/app/uebungen");
}
