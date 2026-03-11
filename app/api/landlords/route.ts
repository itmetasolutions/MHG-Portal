import { Prisma, UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole, requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { normalizeUkPhone } from "@/server/phone";
import { canCreateLandlord, canViewLandlordRegistry } from "@/server/policies";

const createLandlordSchema = z
  .object({
    fullName: z.string().trim().min(1, "fullName is required"),
    phone: z.string().trim().min(1, "phone is required"),
    email: z.string().trim().email("email must be valid").optional(),
    notes: z.string().trim().max(5000).optional(),
    ownerAgentId: z.string().uuid().optional(),
  })
  .strict();

const listQuerySchema = z
  .object({
    search: z.string().trim().min(1).optional(),
    agent: z.string().trim().min(1).optional(),
    phoneLast10: z.string().trim().regex(/^\d{10}$/).optional(),
    mine: z.coerce.boolean().optional(),
    dateFrom: z.coerce.date().optional(),
    dateTo: z.coerce.date().optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .superRefine((value, ctx) => {
    if (value.dateFrom && value.dateTo && value.dateFrom > value.dateTo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "dateFrom must be before or equal to dateTo",
      });
    }
  });

const landlordListSelect = Prisma.validator<Prisma.LandlordSelect>()({
  id: true,
  landlordName: true,
  landlordNumber: true,
  phoneE164: true,
  phoneLast10: true,
  email: true,
  notes: true,
  isPassive: true,
  passiveMarkedAt: true,
  createdAt: true,
  updatedAt: true,
  ownerAgent: {
    select: {
      id: true,
      agentDisplayName: true,
    },
  },
  _count: {
    select: {
      properties: true,
    },
  },
});

const conflictSelect = Prisma.validator<Prisma.LandlordSelect>()({
  id: true,
  landlordName: true,
  phoneE164: true,
  phoneLast10: true,
  ownerAgentId: true,
  createdAt: true,
  ownerAgent: {
    select: {
      id: true,
      agentDisplayName: true,
    },
  },
});

type LandlordConflictSummary = Prisma.LandlordGetPayload<{ select: typeof conflictSelect }>;

function conflictResponse(existingLandlord: LandlordConflictSummary) {
  return NextResponse.json(
    {
      error: "LANDLORD_PHONE_CONFLICT",
      message: "A landlord already exists with this phone (last 10 digits).",
      existingLandlord,
    },
    { status: 409 },
  );
}

async function ensureOwnerAgent(ownerAgentId: string) {
  const ownerAgent = await db.user.findUnique({
    where: { id: ownerAgentId },
    select: { id: true, role: true, isActive: true },
  });

  if (!ownerAgent || !ownerAgent.isActive || ownerAgent.role !== "AGENT") {
    return null;
  }

  return ownerAgent;
}

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.ok) {
    return auth.response;
  }

  const roleCheck = requireRole(auth.user, [UserRole.ADMIN, UserRole.AGENT]);
  if (!roleCheck.ok) {
    return roleCheck.response;
  }

  if (!canViewLandlordRegistry(auth.user)) {
    return NextResponse.json({ error: "FORBIDDEN", message: "Access denied." }, { status: 403 });
  }

  const queryParse = listQuerySchema.safeParse({
    search: request.nextUrl.searchParams.get("search") ?? undefined,
    agent: request.nextUrl.searchParams.get("agent") ?? undefined,
    phoneLast10: request.nextUrl.searchParams.get("phoneLast10") ?? undefined,
    mine: request.nextUrl.searchParams.get("mine") ?? undefined,
    dateFrom: request.nextUrl.searchParams.get("dateFrom") ?? undefined,
    dateTo: request.nextUrl.searchParams.get("dateTo") ?? undefined,
    page: request.nextUrl.searchParams.get("page") ?? undefined,
    pageSize: request.nextUrl.searchParams.get("pageSize") ?? undefined,
  });

  if (!queryParse.success) {
    return NextResponse.json(
      {
        error: "INVALID_QUERY",
        message: "Invalid query parameters.",
        details: queryParse.error.flatten(),
      },
      { status: 400 },
    );
  }

  const { search, agent, phoneLast10, mine, dateFrom, dateTo, page, pageSize } = queryParse.data;
  const where: Prisma.LandlordWhereInput = {};

  if (search) {
    where.OR = [
      { landlordName: { contains: search, mode: "insensitive" } },
      { phoneLast10: { contains: search } },
      { phoneE164: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  if (phoneLast10) {
    where.phoneLast10 = phoneLast10;
  }

  if (auth.user.role === "AGENT") {
    where.ownerAgentId = auth.user.id;
  } else if (mine) {
    where.ownerAgentId = auth.user.id;
  }

  if (auth.user.role === "ADMIN" && agent) {
    where.ownerAgent = {
      is: {
        OR: [
          { id: agent },
          { email: { contains: agent, mode: "insensitive" } },
          { agentDisplayName: { contains: agent, mode: "insensitive" } },
        ],
      },
    };
  }

  if (dateFrom || dateTo) {
    const createdAt: Prisma.DateTimeFilter = {};
    if (dateFrom) {
      createdAt.gte = dateFrom;
    }
    if (dateTo) {
      const inclusiveDateTo = new Date(dateTo);
      inclusiveDateTo.setHours(23, 59, 59, 999);
      createdAt.lte = inclusiveDateTo;
    }
    where.createdAt = createdAt;
  }

  // Auto-passive sync: mark landlords with no sale after 21 days
  const passiveCutoff = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000);
  await Promise.all([
    db.landlord.updateMany({
      where: {
        createdAt: { lt: passiveCutoff },
        isPassive: false,
        properties: { none: { sales: { some: {} } } },
      },
      data: { isPassive: true, passiveMarkedAt: new Date() },
    }),
    db.landlord.updateMany({
      where: {
        isPassive: true,
        properties: { some: { sales: { some: {} } } },
      },
      data: { isPassive: false, passiveMarkedAt: null },
    }),
  ]);

  const skip = (page - 1) * pageSize;
  const [total, landlords] = await db.$transaction([
    db.landlord.count({ where }),
    db.landlord.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: landlordListSelect,
    }),
  ]);

  return NextResponse.json({
    landlords,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
    },
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.ok) {
    return auth.response;
  }

  const roleCheck = requireRole(auth.user, [UserRole.ADMIN, UserRole.AGENT]);
  if (!roleCheck.ok) {
    return roleCheck.response;
  }

  let payload: z.infer<typeof createLandlordSchema>;
  try {
    payload = createLandlordSchema.parse(await request.json());
  } catch (error) {
    return NextResponse.json(
      {
        error: "INVALID_REQUEST",
        message: "Invalid landlord payload.",
        details: error instanceof z.ZodError ? error.flatten() : undefined,
      },
      { status: 400 },
    );
  }

  const normalizedPhone = normalizeUkPhone(payload.phone);
  if (!normalizedPhone.ok) {
    return NextResponse.json(
      {
        error: "INVALID_PHONE",
        message: normalizedPhone.message,
      },
      { status: 400 },
    );
  }

  const ownerAgentId =
    auth.user.role === "ADMIN" ? payload.ownerAgentId ?? auth.user.id : auth.user.id;

  if (!canCreateLandlord(auth.user, ownerAgentId)) {
    return NextResponse.json(
      {
        error: "FORBIDDEN",
        message: "You cannot create landlords for another owner.",
      },
      { status: 403 },
    );
  }

  if (auth.user.role === "ADMIN" && !payload.ownerAgentId) {
    return NextResponse.json(
      {
        error: "OWNER_AGENT_REQUIRED",
        message: "ownerAgentId is required when an admin creates a landlord.",
      },
      { status: 400 },
    );
  }

  const ownerAgent = await ensureOwnerAgent(ownerAgentId);
  if (!ownerAgent) {
    return NextResponse.json(
      {
        error: "INVALID_OWNER_AGENT",
        message: "ownerAgentId must reference an active AGENT user.",
      },
      { status: 400 },
    );
  }

  const existingLandlord = await db.landlord.findUnique({
    where: {
      phoneLast10: normalizedPhone.phoneLast10,
    },
    select: conflictSelect,
  });

  if (existingLandlord) {
    return conflictResponse(existingLandlord);
  }

  // Check for active potential-landlord lock held by a different agent
  const lockCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const potentialLock = await db.potentialLandlord.findFirst({
    where: {
      phoneLast10: normalizedPhone.phoneLast10,
      createdAt: { gte: lockCutoff },
      NOT: { addedByAgentId: ownerAgentId },
    },
    orderBy: { createdAt: "desc" },
    select: {
      createdAt: true,
      addedByAgent: { select: { agentDisplayName: true } },
    },
  });

  if (potentialLock) {
    const lockExpiry = new Date(potentialLock.createdAt.getTime() + 7 * 24 * 60 * 60 * 1000);
    return NextResponse.json(
      {
        error: "POTENTIAL_LANDLORD_LOCKED",
        message: `This landlord is currently locked by ${potentialLock.addedByAgent.agentDisplayName} until ${lockExpiry.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}. You cannot add their property yet.`,
      },
      { status: 409 },
    );
  }

  try {
    const landlord = await db.$transaction(async (tx) => {
      const created = await tx.landlord.create({
        data: {
          landlordName: payload.fullName,
          landlordNumber: normalizedPhone.phoneLast10,
          phoneE164: normalizedPhone.phoneE164,
          phoneLast10: normalizedPhone.phoneLast10,
          email: payload.email?.trim() || null,
          notes: payload.notes?.trim() || null,
          createdByUserId: auth.user.id,
          updatedByUserId: auth.user.id,
          ownerAgentId: ownerAgent.id,
        },
        select: {
          id: true,
          landlordName: true,
          landlordNumber: true,
          phoneE164: true,
          phoneLast10: true,
          email: true,
          notes: true,
          ownerAgentId: true,
          createdAt: true,
          updatedAt: true,
          ownerAgent: {
            select: {
              id: true,
              agentDisplayName: true,
            },
          },
        },
      });

      await tx.auditLog.create({
        data: {
          userId: auth.user.id,
          entityType: "LANDLORD",
          entityId: created.id,
          action: "CREATE_LANDLORD",
          metadata: {
            phoneLast10: created.phoneLast10,
            ownerAgentId: created.ownerAgentId,
          },
          beforeJson: Prisma.JsonNull,
          afterJson: created,
        },
      });

      return created;
    });

    return NextResponse.json({ landlord }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const duplicate = await db.landlord.findUnique({
        where: {
          phoneLast10: normalizedPhone.phoneLast10,
        },
        select: conflictSelect,
      });

      if (duplicate) {
        return conflictResponse(duplicate);
      }
    }

    throw error;
  }
}
