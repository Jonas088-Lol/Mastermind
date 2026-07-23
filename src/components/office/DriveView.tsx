/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { getSession } from "@/lib/session";
import { DriveClient } from "@/app/app/drive/drive-client";


const STORAGE_LIMIT_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB (nur Anzeige, kein Enforcement)

type PageProps = {
  searchParams: Promise<{ q?: string; trash?: string }>;
};

export async function DriveView({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { q: qRaw, trash: trashRaw } = await searchParams;
  const q = (qRaw ?? "").trim().slice(0, 100);
  const trash = trashRaw === "1";

  const [files, ownUsage, trashCount] = await Promise.all([
    prisma.driveFile.findMany({
      where: trash
        ? // Papierkorb: nur eigene, gelöschte Dateien
          { userId: session.userId, deletedAt: { not: null }, ...(q ? { name: { contains: q } } : {}) }
        : {
            // Aktive Ansicht: eigene + geteilte, ohne gelöschte
            deletedAt: null,
            OR: [
              { userId: session.userId },
              ...(session.schoolId ? [{ schoolId: session.schoolId, isPublic: true }] : []),
            ],
            ...(q ? { name: { contains: q } } : {}),
          },
      // Favoriten zuerst, dann nach Datum
      orderBy: [{ favorite: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        name: true,
        mimeType: true,
        size: true,
        isPublic: true,
        favorite: true,
        deletedAt: true,
        createdAt: true,
        userId: true,
      },
    }),
    // Speicher-Nutzung: aktive eigene Dateien (Papierkorb zählt nicht)
    prisma.driveFile.aggregate({
      where: { userId: session.userId, deletedAt: null },
      _sum: { size: true },
      _count: true,
    }),
    prisma.driveFile.count({ where: { userId: session.userId, deletedAt: { not: null } } }),
  ]);

  return (
    <DriveClient
      files={files.map((f) => ({ ...f, createdAt: f.createdAt.toISOString() }))}
      ownUserId={session.userId}
      usedBytes={ownUsage._sum.size ?? 0}
      ownFileCount={ownUsage._count}
      limitBytes={STORAGE_LIMIT_BYTES}
      query={q}
      trash={trash}
      trashCount={trashCount}
    />
  );
}
