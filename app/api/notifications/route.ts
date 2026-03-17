import { UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireRole, requireUser } from "@/server/auth";
import { db } from "@/server/db";

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  const roleCheck = requireRole(auth.user, [UserRole.ADMIN, UserRole.AGENT]);
  if (!roleCheck.ok) return roleCheck.response;

  const notifications = await db.notification.findMany({
    where: { userId: auth.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      type: true,
      title: true,
      body: true,
      metadata: true,
      isRead: true,
      createdAt: true,
    },
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return NextResponse.json({ notifications, unreadCount });
}
