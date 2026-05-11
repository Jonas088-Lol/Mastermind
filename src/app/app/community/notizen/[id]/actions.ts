"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { getSession } from "@/lib/session";

export async function deleteNote(noteId: string): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");

  const note = await prisma.note.findUnique({
    where: { id: noteId },
    select: { authorId: true },
  });

  if (!note || note.authorId !== session.userId) return;

  await prisma.note.delete({ where: { id: noteId } });
  revalidatePath("/app/community/notizen");
  redirect("/app/community/notizen");
}
