import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { PresentationEditor } from "./PresentationEditor";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const pres = await prisma.presentation.findUnique({ where: { id }, select: { title: true } });
  return { title: pres ? `${pres.title} · Präsentationen` : "Präsentation" };
}

export default async function PresentationEditorPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect("/");

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
