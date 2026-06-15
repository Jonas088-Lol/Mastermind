import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { DocumentEditor } from "./DocumentEditor";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const doc = await prisma.document.findUnique({ where: { id }, select: { title: true } });
  return { title: doc ? `${doc.title} · Dokumente` : "Dokument" };
}

export default async function DokumentEditorPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect("/");

  const { id } = await params;
  const doc = await prisma.document.findUnique({ where: { id } });

  if (!doc || doc.userId !== session.userId) notFound();

  return (
    <DocumentEditor
      documentId={doc.id}
      initialTitle={doc.title}
      initialContent={doc.content}
    />
  );
}
