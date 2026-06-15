import { Compass, Plus, Hash, Lock } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { createSpace } from "./actions";

export const metadata: Metadata = { title: "MasterSpace" };

const PLAN_EMOJI = ["🏠", "🎮", "📚", "🎵", "🎨", "⚽", "🔬", "🌍", "💡", "🚀"];

export default async function MasterSpacePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.schoolId) redirect("/app");

  const school = await prisma.school.findUnique({
    where: { id: session.schoolId },
    select: { plan: true },
  });

  const hasMasterSpace = school?.plan === "pro" || school?.plan === "enterprise";

  const [mySpaces, publicSpaces] = await Promise.all([
    prisma.space.findMany({
      where: { schoolId: session.schoolId, members: { some: { userId: session.userId } } },
      include: {
        channels: { orderBy: { position: "asc" }, take: 1 },
        _count: { select: { members: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.space.findMany({
      where: {
        schoolId: session.schoolId,
        isPublic: true,
        members: { none: { userId: session.userId } },
      },
      include: { _count: { select: { members: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  if (!hasMasterSpace) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 py-20 text-center">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-brand/10">
          <Compass className="size-8 text-brand" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">MasterSpace</h1>
          <p className="mt-2 text-muted-fg">
            Dein eigener Discord — Server, Kanäle, Privatchats.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-warning/30 bg-warning/8 px-5 py-3">
          <Lock className="size-4 text-warning" />
          <p className="text-sm font-medium text-warning">
            MasterSpace ist ab dem Pro-Abo verfügbar.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">MasterSpace</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Spaces</h1>
        </div>
        <button
          onClick={undefined}
          className="hidden"
        />
      </header>

      {/* Meine Spaces */}
      {mySpaces.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-muted-fg uppercase tracking-wider">Meine Spaces</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {mySpaces.map((space) => (
              <Link
                key={space.id}
                href={`/app/masterspace/${space.id}/${space.channels[0]?.id ?? ""}`}
                className="flex items-center gap-4 rounded-xl border border-border bg-surface p-4 transition-colors hover:bg-muted"
              >
                <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-muted text-2xl">
                  {space.emoji}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{space.name}</p>
                  {space.description && (
                    <p className="truncate text-xs text-muted-fg">{space.description}</p>
                  )}
                  <p className="mt-0.5 text-xs text-muted-fg">
                    {space._count.members} {space._count.members === 1 ? "Mitglied" : "Mitglieder"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Öffentliche Spaces beitreten */}
      {publicSpaces.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-muted-fg uppercase tracking-wider">Spaces entdecken</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {publicSpaces.map((space) => (
              <div
                key={space.id}
                className="flex items-center gap-4 rounded-xl border border-border bg-surface p-4"
              >
                <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-muted text-2xl">
                  {space.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{space.name}</p>
                  <p className="text-xs text-muted-fg">{space._count.members} Mitglieder</p>
                </div>
                <form action={async () => {
                  "use server";
                  const { joinSpace } = await import("./actions");
                  await joinSpace(space.id);
                }}>
                  <button type="submit" className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand/90">
                    Beitreten
                  </button>
                </form>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Neuen Space erstellen */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-fg uppercase tracking-wider">Neuen Space erstellen</h2>
        <form action={createSpace} className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5">
          <div className="flex gap-3">
            {/* Emoji-Auswahl */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-fg">Icon</label>
              <div className="flex flex-wrap gap-1.5">
                {PLAN_EMOJI.map((e, i) => (
                  <label key={e} className="cursor-pointer">
                    <input type="radio" name="emoji" value={e} defaultChecked={i === 0} className="sr-only peer" />
                    <span className="flex size-9 items-center justify-center rounded-lg border border-border text-lg transition-colors peer-checked:border-brand peer-checked:bg-brand/10 hover:bg-muted">
                      {e}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="name" className="text-sm font-medium">Name *</label>
            <input
              id="name" name="name" type="text" required maxLength={50}
              placeholder="z.B. Klasse 10a"
              className="rounded-lg border border-border bg-bg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="description" className="text-sm font-medium">Beschreibung</label>
            <input
              id="description" name="description" type="text" maxLength={200}
              placeholder="Worum geht es in diesem Space?"
              className="rounded-lg border border-border bg-bg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
            />
          </div>

          <div className="flex justify-end">
            <button type="submit" className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand/90">
              <Plus className="size-4" />
              Space erstellen
            </button>
          </div>
        </form>
      </section>

      {mySpaces.length === 0 && publicSpaces.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-10 text-center text-muted-fg">
          <Compass className="size-10" strokeWidth={1.5} />
          <p className="text-sm">Noch keine Spaces — erstelle den ersten!</p>
        </div>
      )}
    </div>
  );
}
