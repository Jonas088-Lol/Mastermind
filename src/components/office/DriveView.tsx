/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { getSession } from "@/lib/session";
import { DriveClient } from "@/app/app/drive/drive-client";


const STORAGE_LIMIT_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB (nur Anzeige, kein Enforcement)

type PageProps = {
  searchParams: Promise<{ q?: string }>;
};

export async function DriveView({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { q: qRaw } = await searchParams;
  const q = (qRaw ?? "").trim().slice(0, 100);

  const [files, ownUsage] = await Promise.all([
    prisma.driveFile.findMany({
      where: {
        OR: [
          { userId: session.userId },
          ...(session.schoolId ? [{ schoolId: session.schoolId, isPublic: true }] : []),
        ],
        ...(q ? { name: { contains: q } } : {}),
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        mimeType: true,
        size: true,
        isPublic: true,
        createdAt: true,
        userId: true,
      },
    }),
    // Speicher-Nutzung: Summe aller eigenen Dateien, unabhängig vom Suchfilter
    prisma.driveFile.aggregate({
      where: { userId: session.userId },
      _sum: { size: true },
      _count: true,
    }),
  ]);

  return (
    <DriveClient
      files={files.map((f) => ({ ...f, createdAt: f.createdAt.toISOString() }))}
      ownUserId={session.userId}
      usedBytes={ownUsage._sum.size ?? 0}
      ownFileCount={ownUsage._count}
      limitBytes={STORAGE_LIMIT_BYTES}
      query={q}
    />
  );
}
