import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db/client";
import { getSession } from "@/lib/session";
import { awardXp } from "@/lib/xp";
import { NotizenNeuForm } from "./NotizenNeuForm";

export const metadata: Metadata = { title: "Notiz teilen" };

async function createNote(formData: FormData) {
  "use server";
  const session = await getSession();
  if (!session) redirect("/login");

  const title = (formData.get("title") as string | null)?.trim() ?? "";
  const content = (formData.get("content") as string | null)?.trim() ?? "";
  const isPublic = formData.get("isPublic") === "on";
  const imageFilenames = (formData.getAll("imageFilename") as string[]).filter(Boolean);

  if (!title || !content) return;

  const note = await prisma.note.create({
    data: {
      title,
      content,
      isPublic,
      authorId: session.userId,
      images: {
        create: imageFilenames.map((filename) => ({
          filename,
          mimeType: filename.endsWith(".png") ? "image/png" : "image/jpeg",
          size: 0,
        })),
      },
    },
  });

  if (isPublic) {
    await awardXp(session.userId, "note_geteilt", note.id);
  }

  revalidatePath("/app/community/notizen");
  revalidatePath("/app/community");
  redirect("/app/community/notizen");
}

export default async function NotizenNeuPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link
          href="/app/community"
          className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-fg transition-colors hover:text-fg"
        >
          <ArrowLeft className="size-3.5" />
          Zurück zur Community
        </Link>
      </div>

      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">
          Community · Notizen
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">
          Notiz teilen
        </h1>
        <p className="mt-1 text-sm text-muted-fg">
          Teile deine Lernnotizen mit der Klasse oder behalte sie privat.
        </p>
      </header>

      <NotizenNeuForm action={createNote} />
    </div>
  );
}
