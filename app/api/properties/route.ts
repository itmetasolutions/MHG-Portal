import { Prisma, PropertyCategory, PropertyStatus, RoomType, UserRole, VacancyType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole, requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { canListProperties } from "@/server/policies";
import { assertMediaAssetsExist, buildPropertyMediaRows, normalizeMediaAssetIds, serializePropertyImageList } from "@/server/property-media";

const listQuerySchema = z
  .object({
    search: z.string().trim().min(1).optional(),
    phoneLast10: z.string().trim().regex(/^\d{10}$/).optional(),
    propertyRef: z.string().trim().min(1).optional(),
    status: z.nativeEnum(PropertyStatus).optional(),
    city: z.string().trim().min(1).optional(),
    postcode: z.string().trim().min(1).optional(),
    createdAt: z.coerce.date().optional(),
    includeSOLD: z.coerce.boolean().optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(200).default(50),
  })
  .strict();

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.ok) {
    return auth.response;
  }

  const roleCheck = requireRole(auth.user, [UserRole.ADMIN, UserRole.AGENT]);
  if (!roleCheck.ok) {
    return roleCheck.response;
  }

  if (!canListProperties(auth.user)) {
    return NextResponse.json(
      {
        error: "FORBIDDEN",
        message: "You do not have permission to list properties.",
      },
      { status: 403 },
    );
  }

  const parsedQuery = listQuerySchema.safeParse({
    search: request.nextUrl.searchParams.get("search") ?? undefined,
    phoneLast10:
      request.nextUrl.searchParams.get("phoneLast10") ??
      request.nextUrl.searchParams.get("landlordNumber") ??
      undefined,
    propertyRef: request.nextUrl.searchParams.get("propertyRef") ?? undefined,
    status: request.nextUrl.searchParams.get("status") ?? undefined,
    city: request.nextUrl.searchParams.get("city") ?? undefined,
    postcode: request.nextUrl.searchParams.get("postcode") ?? undefined,
    createdAt: request.nextUrl.searchParams.get("createdAt") ?? undefined,
    includeSOLD: request.nextUrl.searchParams.get("includeSOLD") ?? undefined,
    page: request.nextUrl.searchParams.get("page") ?? undefined,
    pageSize: request.nextUrl.searchParams.get("pageSize") ?? undefined,
  });

  if (!parsedQuery.success) {
    return NextResponse.json(
      {
        error: "INVALID_QUERY",
        message: "Invalid query parameters.",
        details: parsedQuery.error.flatten(),
      },
      { status: 400 },
    );
  }

  const { search, phoneLast10, propertyRef, status, city, postcode, createdAt, page, pageSize } =
    parsedQuery.data;
  const where: Prisma.PropertyWhereInput = {};

  if (phoneLast10) {
    where.landlord = {
      is: {
        phoneLast10: { contains: phoneLast10 },
      },
    };
  }

  if (propertyRef) {
    where.propertyRef = { contains: propertyRef, mode: "insensitive" };
  }

  if (status) {
    where.status = status;
  }
  // No default filter — show all statuses including CLOSED

  if (city) {
    where.city = { contains: city, mode: "insensitive" };
  }

  if (postcode) {
    where.postcode = { contains: postcode, mode: "insensitive" };
  }

  if (createdAt) {
    const start = new Date(createdAt);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    where.createdAt = {
      gte: start,
      lt: end,
    };
  }

  if (auth.user.role === "AGENT") {
    where.ownerAgentId = auth.user.id;
  }

  if (search) {
    const searchFilters: Prisma.PropertyWhereInput[] = [
      { propertyRef: { contains: search, mode: "insensitive" } },
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { addressLine1: { contains: search, mode: "insensitive" } },
      { addressLine2: { contains: search, mode: "insensitive" } },
      { city: { contains: search, mode: "insensitive" } },
      { postcode: { contains: search, mode: "insensitive" } },
      { propertyType: { contains: search, mode: "insensitive" } },
      { landlord: { is: { landlordName: { contains: search, mode: "insensitive" } } } },
      {
        ownerAgent: {
          is: {
            OR: [
              { agentDisplayName: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          },
        },
      },
    ];

    const existingAnd = Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : [];
    where.AND = [...existingAnd, { OR: searchFilters }];
  }

  const skip = (page - 1) * pageSize;

  const [total, properties] = await db.$transaction([
    db.property.count({ where }),
    db.property.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: {
        id: true,
        landlordId: true,
        ownerAgentId: true,
        propertyRef: true,
        title: true,
        description: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        county: true,
        postcode: true,
        propertyType: true,
        beds: true,
        baths: true,
        status: true,
        landlordDemand: true,
        expectedCommissionPct: true,
        createdAt: true,
        updatedAt: true,
        landlord: {
          select: {
            id: true,
            landlordName: true,
            phoneE164: true,
            phoneLast10: true,
            ownerAgentId: true,
          },
        },
        ownerAgent: {
          select: {
            id: true,
            agentDisplayName: true,
            email: true,
          },
        },
        vacancyType: true,
        mediaLinks: {
          orderBy: [{ sortOrder: "asc" }, { mediaAssetId: "asc" }],
          select: {
            mediaAsset: {
              select: {
                id: true,
                name: true,
                mimeType: true,
                dataUrl: true,
                createdAt: true,
                uploadedBy: {
                  select: {
                    id: true,
                    agentDisplayName: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
        sales: {
          select: {
            id: true,
            finalAmount: true,
            commissionPct: true,
            commissionAmount: true,
            otherCosts: true,
            profit: true,
            closedAt: true,
            roomId: true,
          },
        },
        rooms: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            roomName: true,
            landlordDemand: true,
            expectedCommissionPct: true,
            status: true,
            sale: {
              select: {
                id: true,
                finalAmount: true,
                closedAt: true,
                tenant: { select: { id: true, fullName: true } },
              },
            },
          },
        },
      },
    }),
  ]);

  return NextResponse.json({
    properties: serializePropertyImageList(properties),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
    },
  });
}

const postBool = z.enum(["true", "false"]).transform((v) => v === "true");
const postDecimal = z.coerce.number().positive();
const postOptDecimal = z.coerce.number().min(0).nullable().optional();

const postRoomSchema = z.object({
  roomType: z.nativeEnum(RoomType),
  rentPerMonth: postDecimal,
  depositAmount: postDecimal,
  expectedCommissionAmt: postDecimal,
}).strict();

const postPropertySchema = z.object({
  vacancyType: z.nativeEnum(VacancyType).default("SINGLE"),
  propertyCategory: z.nativeEnum(PropertyCategory).optional(),
  description: z.string().trim().min(1, "Description is required"),
  addressLine1: z.string().trim().min(1, "Address is required"),
  addressLine2: z.string().trim().optional(),
  postcode: z.string().trim().min(1, "Postcode is required"),
  city: z.string().trim().min(1, "City is required"),
  rentPerMonth: postOptDecimal,
  depositAmount: postOptDecimal,
  expectedCommissionAmt: postOptDecimal,
  totalRooms: z.coerce.number().int().min(0).nullable().optional(),
  availableRooms: z.coerce.number().int().min(0).nullable().optional(),
  isFurnished: postBool,
  livingLandlord: postBool,
  garden: postBool,
  parking: postBool,
  billsIncluded: postBool,
  balcony: postBool,
  disabledAccess: postBool,
  livingRoom: z.enum(["PRIVATE", "SHARED", "NONE"]),
  broadbandIncluded: postBool,
  couplesAllowed: postBool,
  petsAllowed: postBool,
  dssAllowed: postBool,
  childrenAllowed: postBool,
  availabilityDate: z.string().datetime({ offset: true }),
  status: z.enum(["DRAFT", "AVAILABLE"]).default("DRAFT"),
  mediaAssetIds: z.array(z.string().uuid()).max(50).optional(),
  rooms: z.array(postRoomSchema).max(200).optional(),
}).strict();

const postSchema = z.object({
  landlordId: z.string().uuid(),
  property: postPropertySchema,
}).strict().superRefine((val, ctx) => {
  if (val.property.vacancyType === "MULTIPLE" && (!val.property.rooms || val.property.rooms.length === 0)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "At least one room is required for Shared properties.", path: ["property", "rooms"] });
  }
  if (val.property.vacancyType === "SINGLE") {
    if (!val.property.rentPerMonth) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Rent per month is required.", path: ["property", "rentPerMonth"] });
    if (!val.property.depositAmount) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Deposit is required.", path: ["property", "depositAmount"] });
    if (!val.property.expectedCommissionAmt) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Commission amount is required.", path: ["property", "expectedCommissionAmt"] });
  }
});

function calcWeeklyRent(rpm: number): number {
  return Math.round((rpm * 12 / 52) * 100) / 100;
}

function newPropertyRef(): string {
  const year = new Date().getFullYear();
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const rand = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `PROP-${year}-${rand}`;
}

export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  const roleCheck = requireRole(auth.user, [UserRole.AGENT, UserRole.ADMIN]);
  if (!roleCheck.ok) return roleCheck.response;

  let payload: z.infer<typeof postSchema>;
  try {
    payload = postSchema.parse(await request.json());
  } catch (error) {
    return NextResponse.json(
      { error: "INVALID_REQUEST", message: "Invalid payload.", details: error instanceof z.ZodError ? error.flatten() : undefined },
      { status: 400 },
    );
  }

  const landlord = await db.landlord.findUnique({
    where: { id: payload.landlordId },
    select: { id: true, ownerAgentId: true },
  });

  if (!landlord) {
    return NextResponse.json({ error: "LANDLORD_NOT_FOUND", message: "Landlord not found." }, { status: 404 });
  }

  if (auth.user.role === UserRole.AGENT && landlord.ownerAgentId !== auth.user.id) {
    return NextResponse.json({ error: "FORBIDDEN", message: "You do not own this landlord." }, { status: 403 });
  }

  const mediaAssetIds = normalizeMediaAssetIds(payload.property.mediaAssetIds);
  try {
    await assertMediaAssetsExist(db, mediaAssetIds);
  } catch {
    return NextResponse.json({ error: "MEDIA_ASSET_NOT_FOUND", message: "One or more images not found." }, { status: 400 });
  }

  const pData = payload.property;
  const postcode = pData.postcode.toUpperCase().trim();
  const propertyRef = newPropertyRef();
  const isStudio = pData.vacancyType === "SINGLE" && pData.propertyCategory === "STUDIO_FLAT";

  const property = await db.$transaction(async (tx) => {
    const prop = await tx.property.create({
      data: {
        landlordId: landlord.id,
        ownerAgentId: landlord.ownerAgentId,
        propertyRef,
        description: pData.description,
        addressLine1: pData.addressLine1,
        addressLine2: pData.addressLine2 ?? null,
        postcode,
        city: pData.city,
        vacancyType: pData.vacancyType,
        propertyCategory: pData.vacancyType === "SINGLE" ? (pData.propertyCategory ?? null) : null,
        status: pData.status === "AVAILABLE" ? "AVAILABLE" : "DRAFT",
        rentPerMonth: pData.vacancyType === "SINGLE" && pData.rentPerMonth ? pData.rentPerMonth : null,
        rentPerWeek: pData.vacancyType === "SINGLE" && pData.rentPerMonth ? calcWeeklyRent(pData.rentPerMonth) : null,
        depositAmount: pData.vacancyType === "SINGLE" ? (pData.depositAmount ?? null) : null,
        expectedCommissionAmt: pData.vacancyType === "SINGLE" ? (pData.expectedCommissionAmt ?? null) : null,
        totalRooms: !isStudio ? (pData.totalRooms ?? null) : null,
        availableRooms: !isStudio ? (pData.availableRooms ?? null) : null,
        isFurnished: pData.isFurnished,
        livingLandlord: pData.livingLandlord,
        garden: pData.garden,
        parking: pData.parking,
        billsIncluded: pData.billsIncluded,
        balcony: pData.balcony,
        disabledAccess: pData.disabledAccess,
        livingRoom: pData.livingRoom as "PRIVATE" | "SHARED" | "NONE",
        broadbandIncluded: pData.broadbandIncluded,
        couplesAllowed: pData.couplesAllowed,
        petsAllowed: pData.petsAllowed,
        dssAllowed: pData.dssAllowed,
        childrenAllowed: pData.childrenAllowed,
        availabilityDate: new Date(pData.availabilityDate),
        rooms: pData.vacancyType === "MULTIPLE" && pData.rooms?.length
          ? {
              create: pData.rooms.map((r) => ({
                roomName: r.roomType,
                roomType: r.roomType,
                rentPerMonth: r.rentPerMonth,
                rentPerWeek: calcWeeklyRent(r.rentPerMonth),
                depositAmount: r.depositAmount,
                expectedCommissionAmt: r.expectedCommissionAmt,
              })),
            }
          : undefined,
      },
      select: { id: true, propertyRef: true, status: true, landlordId: true },
    });

    if (mediaAssetIds.length > 0) {
      await tx.propertyMedia.createMany({ data: buildPropertyMediaRows(prop.id, mediaAssetIds) });
    }

    await tx.auditLog.create({
      data: {
        userId: auth.user.id,
        entityType: "PROPERTY",
        entityId: prop.id,
        action: "CREATE_PROPERTY",
        metadata: { landlordId: landlord.id, propertyRef },
        beforeJson: Prisma.JsonNull,
        afterJson: { propertyId: prop.id },
      },
    });

    return prop;
  });

  return NextResponse.json({ property }, { status: 201 });
}
