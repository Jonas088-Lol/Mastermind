/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { canUseOffice } from "@/lib/office";
import { PresentationEditor } from "@/app/app/praesentationen/[id]/PresentationEditor";

interface Props {
  params: Promise<{ id: string }>;
}


export async function PraesentationEditorView({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canUseOffice(effectiveRole(session))) redirect("/");

  const { id } = await params;
  const pres = await prisma.presentation.findUnique({ where: { id } });

  if (!pres || pres.userId !== session.userId) notFound();

  return (
    <PresentationEditor
      presentationId={pres.id}
      initialTitle={pres.title}
      initialSlides={pres.slides}
    />
  );
}
