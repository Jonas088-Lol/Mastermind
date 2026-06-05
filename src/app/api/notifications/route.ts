import { NextResponse } from "next/server";
import { fetchNotifications } from "@/lib/notifications";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ notifications: [], unreadCount: 0 });

  const data = await fetchNotifications(session.userId);
  return NextResponse.json(data);
}
