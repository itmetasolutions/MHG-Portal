import { NextRequest, NextResponse } from "next/server";
import { getAuthSessionFromRequest } from "@/server/auth/session";
import { db } from "@/server/db";

type Params = { params: { agentId: string } };

// DELETE /api/chat/conversations/:agentId — clear all messages between the
// current user and the given user (used by the admin chat panel).
export async function DELETE(request: NextRequest, { params }: Params) {
  const session = getAuthSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await db.chatMessage.deleteMany({
    where: {
      OR: [
        { fromUserId: session.userId, toUserId: params.agentId },
        { fromUserId: params.agentId, toUserId: session.userId },
      ],
    },
  });

  return NextResponse.json({ ok: true });
}
