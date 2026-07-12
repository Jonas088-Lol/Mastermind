/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getSession } from "@/lib/session";

// Returns all files owned by the current user + school-public files from same school
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const files = await prisma.driveFile.findMany({
    where: {
      OR: [
        { userId: session.userId },
        ...(session.schoolId ? [{ schoolId: session.schoolId, isPublic: true }] : []),
      ],
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, mimeType: true, size: true, isPublic: true, createdAt: true, userId: true },
  });

  return NextResponse.json(files);
}
