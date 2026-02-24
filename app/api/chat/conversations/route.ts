import { NextRequest, NextResponse } from "next/server";
import { getAuthSessionFromRequest } from "@/server/auth/session";
import { db } from "@/server/db";
import { UserRole } from "@prisma/client";

// GET /api/chat/conversations
// Admin only: list all agents with last message preview and unread count
export async function GET(request: NextRequest) {
  const session = await getAuthSessionFromRequest(request);
  if (!session || session.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const agents = await db.user.findMany({
    where: { role: UserRole.AGENT, isActive: true },
    select: { id: true, agentDisplayName: true, email: true },
    orderBy: { agentDisplayName: "asc" },
  });

  const conversations = await Promise.all(
    agents.map(async (agent) => {
      const [lastMessage, unreadCount] = await Promise.all([
        db.chatMessage.findFirst({
          where: {
            OR: [
              { fromUserId: session.userId, toUserId: agent.id },
              { fromUserId: agent.id, toUserId: session.userId },
            ],
          },
          orderBy: { createdAt: "desc" },
          select: { content: true, createdAt: true, fromUserId: true },
        }),
        db.chatMessage.count({
          where: { fromUserId: agent.id, toUserId: session.userId, isRead: false },
        }),
      ]);

      return { agent, lastMessage, unreadCount };
    }),
  );

  return NextResponse.json({ conversations });
}
