import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/server/auth/requireUser";
import { createWorkflowCallLog } from "@/server/portal/workflows";

export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "INVALID_PAYLOAD" }, { status: 400 });

  const phone = String(body.phone ?? "").trim();
  if (!phone) return NextResponse.json({ error: "PHONE_REQUIRED" }, { status: 400 });

  const callRecord = await createWorkflowCallLog({
    agentId: auth.user.id,
    phoneNo: phone,
    outcome: "NOT_INTERESTED",
    landlordName: body.landlordName ?? null,
    notes: body.notes ?? null,
  });

  return NextResponse.json({ ok: true, callRecord });
}
