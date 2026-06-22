"use server";

import { revalidatePath } from "next/cache";
import { getSession, effectiveRole } from "@/lib/session";
import { buyItem, buyItemDef } from "@/lib/shop";

/** Legacy: purchase by slug (old ShopItem system) */
export async function purchaseItem(itemSlug: string): Promise<void> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "student") return;
  await buyItem(session.userId, itemSlug);
  revalidatePath("/app/shop");
  revalidatePath("/app/inventar");
}

/** New: purchase by ItemDef ID */
export async function purchaseItemDef(itemDefId: string): Promise<void> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "student") return;
  await buyItemDef(session.userId, itemDefId);
  revalidatePath("/app/shop");
  revalidatePath("/app/inventar");
}
