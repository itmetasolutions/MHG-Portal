import { NextRequest, NextResponse } from "next/server";
import { getAuthSessionFromRequest } from "@/server/auth/session";
import { db } from "@/server/db";
import { UserRole } from "@prisma/client";

// GET /api/chat/messages?agentId=ID
// Admin: fetch messages between admin and specified agent
// Agent: fetch messages between self and admin (agentId ignored)
export async function GET(request: NextRequest) {
  const session = await getAuthSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get("agentId");

  if (session.role === UserRole.ADMIN) {
    if (!agentId) return NextResponse.json({ error: "agentId required" }, { status: 400 });

    const messages = await db.chatMessage.findMany({
      where: {
        OR: [
          { fromUserId: session.userId, toUserId: agentId },
          { fromUserId: agentId, toUserId: session.userId },
        ],
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        content: true,
        isRead: true,
        createdAt: true,
        fromUserId: true,
        toUserId: true,
        fromUser: { select: { agentDisplayName: true, role: true } },
      },
    });

    // Mark agent→admin messages as read
    await db.chatMessage.updateMany({
      where: { fromUserId: agentId, toUserId: session.userId, isRead: false },
      data: { isRead: true },
    });

    return NextResponse.json({ messages });
  }

  // Agent: find the admin
  const admin = await db.user.findFirst({
    where: { role: UserRole.ADMIN, isActive: true },
    select: { id: true, agentDisplayName: true },
  });
  if (!admin) return NextResponse.json({ messages: [], adminId: null });

  const messages = await db.chatMessage.findMany({
    where: {
      OR: [
        { fromUserId: session.userId, toUserId: admin.id },
        { fromUserId: admin.id, toUserId: session.userId },
      ],
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      content: true,
      isRead: true,
      createdAt: true,
      fromUserId: true,
      toUserId: true,
      fromUser: { select: { agentDisplayName: true, role: true } },
    },
  });

  // Mark admin→agent messages as read
  await db.chatMessage.updateMany({
    where: { fromUserId: admin.id, toUserId: session.userId, isRead: false },
    data: { isRead: true },
  });

  return NextResponse.json({ messages, adminId: admin.id, adminName: admin.agentDisplayName });
}

// POST /api/chat/messages
// Body: { toUserId: string, content: string }
export async function POST(request: NextRequest) {
  const session = await getAuthSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { toUserId, content } = body as { toUserId?: string; content?: string };

  if (!toUserId || !content?.trim()) {
    return NextResponse.json({ error: "toUserId and content required" }, { status: 400 });
  }

  const recipient = await db.user.findUnique({
    where: { id: toUserId },
    select: { id: true, role: true, isActive: true },
  });
  if (!recipient || !recipient.isActive) {
    return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
  }

  // Agents can only message admin
  if (session.role === UserRole.AGENT && recipient.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: "Agents can only message admin" }, { status: 403 });
  }

  const message = await db.chatMessage.create({
    data: {
      fromUserId: session.userId,
      toUserId,
      content: content.trim(),
    },
    select: {
      id: true,
      content: true,
      isRead: true,
      createdAt: true,
      fromUserId: true,
      toUserId: true,
      fromUser: { select: { agentDisplayName: true, role: true } },
    },
  });

  return NextResponse.json({ message });
}
