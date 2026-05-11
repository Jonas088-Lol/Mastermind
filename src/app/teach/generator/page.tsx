import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { getSession, effectiveRole } from "@/lib/session";
import { GeneratorClient } from "./GeneratorClient";

export const metadata: Metadata = { title: "KI-Generator" };

export default async function GeneratorPage() {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "teacher") redirect("/");

  const tscList = await prisma.teacherSubjectClass.findMany({
    where: { teacherId: session.userId },
    include: {
      class: { select: { id: true, name: true } },
      subject: { select: { id: true, name: true } },
    },
  });

  return <GeneratorClient tscList={tscList} />;
}
