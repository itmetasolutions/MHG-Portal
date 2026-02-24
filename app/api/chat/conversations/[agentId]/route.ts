import { NextRequest, NextResponse } from "next/server";
import { getAuthSessionFromRequest } from "@/server/auth/session";
import { db } from "@/server/db";
import { UserRole } from "@prisma/client";

// DELETE /api/chat/conversations/[agentId]
// Admin only: delete all messages in a conversation with an agent
export async function DELETE(
  request: NextRequest,
  { params }: { params: { agentId: string } },
) {
  const session = await getAuthSessionFromRequest(request);
  if (!session || session.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { agentId } = params;

  await db.chatMessage.deleteMany({
    where: {
      OR: [
        { fromUserId: session.userId, toUserId: agentId },
        { fromUserId: agentId, toUserId: session.userId },
      ],
    },
  });

  return NextResponse.json({ success: true });
}
