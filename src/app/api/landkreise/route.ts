import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";

export async function GET(req: NextRequest) {
  const bl = req.nextUrl.searchParams.get("bundesland");
  if (!bl) return NextResponse.json([]);

  const lks = await prisma.landkreis.findMany({
    where:   { bundeslandCode: bl },
    select:  { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(lks, {
    headers: { "Cache-Control": "public, max-age=86400" },
  });
}
