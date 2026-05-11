import { ArrowLeft, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db/client";
import { getSession } from "@/lib/session";
import { deleteNote } from "./actions";

interface PageParams {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { id } = await params;
  const note = await prisma.note.findUnique({ where: { id }, select: { title: true } });
  return { title: note?.title ?? "Notiz" };
}

export default async function NoteDetailPage({ params }: PageParams) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");

  const note = await prisma.note.findUnique({
    where: { id },
    include: {
      author: { select: { name: true } },
      images: { select: { id: true, filename: true } },
    },
  });

  if (!note) notFound();
  if (!note.isPublic && note.authorId !== session.userId) notFound();

  const isOwner = note.authorId === session.userId;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link href="/app/community/notizen" className="text-muted-fg hover:text-fg">
          <ArrowLeft className="size-4" />
        </Link>
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-fg">
            Notiz · {note.author.name}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">{note.title}</h1>
        </div>
        {isOwner && (
          <form action={deleteNote.bind(null, note.id)}>
            <Button type="submit" variant="ghost" size="sm" className="text-danger hover:text-danger">
              <Trash2 className="size-3.5" />
              Löschen
            </Button>
          </form>
        )}
      </div>

      <div className="border border-border bg-bg p-6">
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{note.content}</p>
      </div>

      {note.images.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {note.images.map((img) => (
            <Image
              key={img.id}
              src={`/uploads/notes/${img.filename}`}
              alt="Notiz-Bild"
              width={800}
              height={600}
              className="w-full border border-border object-contain"
            />
          ))}
        </div>
      )}
    </div>
  );
}
