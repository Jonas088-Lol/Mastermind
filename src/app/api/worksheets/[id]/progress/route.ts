import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return new Response(JSON.stringify({ error: "Nicht angemeldet" }), { status: 401 });
  }
  if (effectiveRole(session) !== "teacher") {
    return new Response(JSON.stringify({ error: "Nur für Lehrer" }), { status: 403 });
  }

  const { id } = await params;

  const assignment = await prisma.worksheetAssignment.findUnique({
    where: { id },
    include: {
      worksheet: { select: { creatorId: true, title: true } },
      class: { include: { students: { select: { id: true } } } },
    },
  });

  if (!assignment || assignment.worksheet.creatorId !== session.userId) {
    return new Response(JSON.stringify({ error: "Nicht gefunden" }), { status: 404 });
  }

  const totalStudents = assignment.class?.students.length ?? 0;
  const worksheetTitle = assignment.worksheet.title;

  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  const sendEvent = async (data: unknown) => {
    try {
      await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
    } catch {
      // client disconnected
    }
  };

  const signal = req.signal;

  async function fetchAndSend() {
    const rows = await prisma.worksheetSubmission.findMany({
      where: { assignmentId: id },
      select: {
        studentId: true,
        student: { select: { name: true } },
        status: true,
        score: true,
        maxScore: true,
        startedAt: true,
        submittedAt: true,
      },
    });
    const submissions = rows.map((r) => ({
      studentId: r.studentId,
      studentName: r.student.name,
      status: r.status,
      score: r.score,
      maxScore: r.maxScore,
      startedAt: r.startedAt,
      submittedAt: r.submittedAt,
    }));
    await sendEvent({ submissions, totalStudents, worksheetTitle });
  }

  const intervalId = setInterval(async () => {
    if (signal.aborted) {
      clearInterval(intervalId);
      writer.close().catch(() => undefined);
      return;
    }
    await fetchAndSend();
  }, 3000);

  signal.addEventListener("abort", () => {
    clearInterval(intervalId);
    writer.close().catch(() => undefined);
  });

  // Send initial snapshot immediately
  fetchAndSend().catch(() => undefined);

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
