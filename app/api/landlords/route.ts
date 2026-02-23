import { LandlordStatus, Prisma, UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole, requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { canCreateLandlord, canViewLandlordRegistry } from "@/server/policies";

const createLandlordSchema = z
  .object({
    landlordName: z.string().trim().min(1, "landlordName is required"),
    landlordNumber: z.string().trim().min(1, "landlordNumber is required"),
    propertyId: z.string().trim().min(1, "propertyId is required"),
    url: z.string().url("url must be a valid URL"),
  })
  .strict();

const listQuerySchema = z
  .object({
    search: z.string().trim().min(1).optional(),
    status: z.enum(["ACTIVE", "PASSIVE"]).optional(),
    agent: z.string().trim().min(1).optional(),
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

const activeConflictSelect = Prisma.validator<Prisma.LandlordSelect>()({
  id: true,
  landlordName: true,
  landlordNumber: true,
  status: true,
  ownerAgentId: true,
  createdAt: true,
  ownerAgent: {
    select: {
      id: true,
      agentDisplayName: true,
    },
  },
});

const landlordListCoreSelect = Prisma.validator<Prisma.LandlordSelect>()({
  id: true,
  landlordName: true,
  landlordNumber: true,
  propertyId: true,
  url: true,
  status: true,
  lockedAt: true,
  createdAt: true,
  updatedAt: true,
  ownerAgent: {
    select: {
      id: true,
      agentDisplayName: true,
    },
  },
});

type LandlordActiveConflictSummary = Prisma.LandlordGetPayload<{
  select: typeof activeConflictSelect;
}>;

function conflictResponse(existingActiveLandlord: LandlordActiveConflictSummary) {
  return NextResponse.json(
    {
      error: "LANDLORD_NUMBER_CONFLICT",
      message: "An ACTIVE landlord with this landlordNumber already exists.",
      existingActiveLandlord,
    },
    { status: 409 },
  );
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
    status: request.nextUrl.searchParams.get("status") ?? undefined,
    agent: request.nextUrl.searchParams.get("agent") ?? undefined,
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

  const { search, status, agent, mine, dateFrom, dateTo, page, pageSize } = queryParse.data;

  const where: Prisma.LandlordWhereInput = {};

  if (search) {
    where.OR = [
      { landlordName: { contains: search, mode: "insensitive" } },
      { landlordNumber: { contains: search, mode: "insensitive" } },
      { propertyId: { contains: search, mode: "insensitive" } },
      { url: { contains: search, mode: "insensitive" } },
    ];
  }

  if (status) {
    where.status = status as LandlordStatus;
  }

  if (agent) {
    where.ownerAgent = {
      is: {
        agentDisplayName: { contains: agent, mode: "insensitive" },
      },
    };
  }

  if (mine === true && auth.user.role === "AGENT") {
    where.ownerAgentId = auth.user.id;
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

  const skip = (page - 1) * pageSize;

  const [total, landlords] = await db.$transaction([
    db.landlord.count({ where }),
    db.landlord.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: landlordListCoreSelect,
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
        message:
          "landlordName, landlordNumber, propertyId and url are required, and url must be valid.",
        details: error instanceof z.ZodError ? error.flatten() : undefined,
      },
      { status: 400 },
    );
  }

  const ownerAgentId = auth.user.id;
  if (!canCreateLandlord(auth.user, ownerAgentId)) {
    return NextResponse.json(
      {
        error: "FORBIDDEN",
        message: "You cannot create landlords for another owner.",
      },
      { status: 403 },
    );
  }

  const existingActive = await db.landlord.findFirst({
    where: {
      landlordNumber: payload.landlordNumber,
      status: "ACTIVE",
    },
    select: activeConflictSelect,
  });

  if (existingActive) {
    return conflictResponse(existingActive);
  }

  try {
    const landlord = await db.$transaction(async (tx) => {
      const created = await tx.landlord.create({
        data: {
          landlordName: payload.landlordName,
          landlordNumber: payload.landlordNumber,
          propertyId: payload.propertyId,
          url: payload.url,
          status: "ACTIVE",
          createdByUserId: auth.user.id,
          updatedByUserId: auth.user.id,
          ownerAgentId,
        },
        select: {
          id: true,
          landlordName: true,
          landlordNumber: true,
          propertyId: true,
          url: true,
          status: true,
          lockedAt: true,
          ownerAgentId: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: auth.user.id,
          entityType: "LANDLORD",
          entityId: created.id,
          action: "LANDLORD_CREATE",
          beforeJson: Prisma.JsonNull,
          afterJson: created,
        },
      });

      return created;
    });

    return NextResponse.json({ landlord }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const duplicate = await db.landlord.findFirst({
        where: {
          landlordNumber: payload.landlordNumber,
          status: "ACTIVE",
        },
        select: activeConflictSelect,
      });

      if (duplicate) {
        return conflictResponse(duplicate);
      }
    }

    throw error;
  }
}
