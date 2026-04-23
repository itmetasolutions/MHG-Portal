import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { env } from "@/lib/env";
import { sendFollowUpReminderEmail } from "@/server/email/service";

function isCronAuthorized(request: NextRequest): boolean {
  if (!env.CRON_SECRET) return true; // allow if no secret configured (dev)
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${env.CRON_SECRET}`;
}

export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const now = new Date();
  const in5min = new Date(now.getTime() + 5 * 60 * 1000);
  const in65min = new Date(now.getTime() + 65 * 60 * 1000);

  // 5-minute reminder: scheduledAt between now and now+5min, not yet sent
  const fiveMinReminders = await db.potentialLandlord.findMany({
    where: {
      scheduledAt: { gt: now, lte: in5min },
      reminder5mSent: false,
      landlordId: null, // not yet converted
    },
    select: {
      id: true,
      fullName: true,
      phone: true,
      scheduledAt: true,
      addedByAgent: {
        select: { id: true, email: true, agentDisplayName: true },
      },
    },
  });

  // 1-hour reminder: scheduledAt between now+5min and now+65min, not yet sent
  const oneHourReminders = await db.potentialLandlord.findMany({
    where: {
      scheduledAt: { gt: in5min, lte: in65min },
      reminder1hSent: false,
      landlordId: null,
    },
    select: {
      id: true,
      fullName: true,
      phone: true,
      scheduledAt: true,
      addedByAgent: {
        select: { id: true, email: true, agentDisplayName: true },
      },
    },
  });

  const sent5m: string[] = [];
  const sent1h: string[] = [];
  const errors: string[] = [];

  for (const pl of fiveMinReminders) {
    try {
      await sendFollowUpReminderEmail({
        to: pl.addedByAgent.email,
        agentName: pl.addedByAgent.agentDisplayName,
        landlordName: pl.fullName,
        landlordPhone: pl.phone,
        scheduledAt: pl.scheduledAt!,
        minutesUntil: 5,
        potentialLandlordId: pl.id,
      });

      await db.$transaction([
        db.potentialLandlord.update({
          where: { id: pl.id },
          data: { reminder5mSent: true },
        }),
        db.notification.create({
          data: {
            userId: pl.addedByAgent.id,
            type: "FOLLOW_UP_REMINDER",
            title: `Follow-up in 5 minutes – ${pl.fullName}`,
            body: `Your follow-up with ${pl.fullName} (${pl.phone}) is in 5 minutes.`,
            metadata: { potentialLandlordId: pl.id, landlordName: pl.fullName, landlordPhone: pl.phone },
          },
        }),
      ]);

      sent5m.push(pl.id);
    } catch (err) {
      errors.push(`5m:${pl.id}:${String(err)}`);
    }
  }

  for (const pl of oneHourReminders) {
    try {
      await sendFollowUpReminderEmail({
        to: pl.addedByAgent.email,
        agentName: pl.addedByAgent.agentDisplayName,
        landlordName: pl.fullName,
        landlordPhone: pl.phone,
        scheduledAt: pl.scheduledAt!,
        minutesUntil: 60,
        potentialLandlordId: pl.id,
      });

      await db.potentialLandlord.update({
        where: { id: pl.id },
        data: { reminder1hSent: true },
      });

      sent1h.push(pl.id);
    } catch (err) {
      errors.push(`1h:${pl.id}:${String(err)}`);
    }
  }

  return NextResponse.json({
    processed: { fiveMin: sent5m.length, oneHour: sent1h.length },
    errors: errors.length > 0 ? errors : undefined,
  });
}
