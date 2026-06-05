import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { PageEditor } from "./PageEditor";

interface Props {
  params: Promise<{ id: string; pageId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { pageId } = await params;
  const page = await prisma.notebookPage.findUnique({
    where: { id: pageId },
    select: { title: true, notebook: { select: { title: true } } },
  });
  if (!page) return { title: "Heft" };
  return { title: `${page.title} — ${page.notebook.title}` };
}

export default async function NotebookPageRoute({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect("/");

  const { id, pageId } = await params;

  const notebook = await prisma.notebook.findUnique({
    where: { id },
    include: {
      pages: { orderBy: { order: "asc" } },
    },
  });

  if (!notebook || notebook.userId !== session.userId) notFound();

  const currentPage = notebook.pages.find((p) => p.id === pageId);
  if (!currentPage) {
    // Redirect to first page
    if (notebook.pages.length > 0) redirect(`/app/heft/${id}/${notebook.pages[0].id}`);
    notFound();
  }

  return (
    <PageEditor
      notebookId={notebook.id}
      notebookTitle={notebook.title}
      notebookColor={notebook.color}
      notebookSubject={notebook.subject}
      currentPage={currentPage}
      allPages={notebook.pages}
    />
  );
}
