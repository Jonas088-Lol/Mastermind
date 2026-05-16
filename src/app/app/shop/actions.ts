"use server";

import { revalidatePath } from "next/cache";
import { getSession, effectiveRole } from "@/lib/session";
import { buyItem } from "@/lib/shop";

export async function purchaseItem(itemSlug: string): Promise<void> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "student") return;
  await buyItem(session.userId, itemSlug);
  revalidatePath("/app/shop");
  revalidatePath("/app/inventar");
}
