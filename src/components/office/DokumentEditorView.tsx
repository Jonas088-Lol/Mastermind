/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { canUseOffice } from "@/lib/office";
import { DocumentEditor } from "@/app/app/dokumente/[id]/DocumentEditor";

interface Props {
  params: Promise<{ id: string }>;
}


export async function DokumentEditorView({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canUseOffice(effectiveRole(session))) redirect("/");

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
