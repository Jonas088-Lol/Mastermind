import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ArrowRight, Plus, StickyNote, Trash2 } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { deleteNote } from "./[id]/actions";

export const metadata: Metadata = { title: "Notizen · Community" };

export default async function CommunityNotizenPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const role = effectiveRole(session);
  const canModerate = role === "teacher" || role === "admin" || role === "super";

  const notes = await prisma.note.findMany({
    where: {
      OR: [{ isPublic: true }, { authorId: session.userId }],
    },
    include: { author: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <header className="flex items-center gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Geteilte Notizen</h1>
          <p className="text-sm text-muted-fg">{notes.length} Notizen in deiner Klasse</p>
        </div>
        <Link href="/app/community/notizen/neu" className={buttonVariants({ size: "sm" })}>
          <Plus className="size-3.5" />
          Notiz teilen
        </Link>
      </header>

      {notes.length === 0 ? (
        <div className="grid place-items-center border border-dashed border-border py-16">
          <StickyNote className="size-8 text-muted-fg" strokeWidth={1.5} />
          <p className="mt-4 text-sm text-muted-fg">Noch keine Notizen geteilt.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {notes.map((n) => {
            const isOwner = n.authorId === session.userId;
            return (
              <li key={n.id}>
                <Card className="transition-colors hover:bg-surface">
                  <CardBody className="!p-5">
                    <div className="flex items-start gap-4">
                      <div className="grid size-10 shrink-0 place-items-center bg-surface">
                        <StickyNote className="size-5 text-brand" strokeWidth={1.5} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <Link href={`/app/community/notizen/${n.id}`}>
                          <p className="font-semibold hover:text-brand">{n.title}</p>
                        </Link>
                        <p className="mt-0.5 text-sm text-muted-fg">
                          {n.author.name} · {n.createdAt.toLocaleDateString("de-DE", { day: "numeric", month: "short" })}
                          {!n.isPublic && " · Privat"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/app/community/notizen/${n.id}`}
                          className="text-xs font-medium text-muted-fg hover:text-brand"
                        >
                          <ArrowRight className="size-3.5" />
                        </Link>
                        {(isOwner || canModerate) && (
                          <form action={deleteNote.bind(null, n.id)}>
                            <button
                              type="submit"
                              className="grid size-7 place-items-center text-muted-fg transition-colors hover:text-danger"
                              title="Notiz löschen"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </form>
                        )}
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
