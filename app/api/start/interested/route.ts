import { CallLogStatus, Prisma, PropertyCategory, RoomType, UserRole, VacancyType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole, requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { normalizeUkPhone } from "@/server/phone";
import { assertMediaAssetsExist, buildPropertyMediaRows, normalizeMediaAssetIds } from "@/server/property-media";

const boolField = z.enum(["true", "false"]).transform((v) => v === "true");
const decimalField = z.coerce.number().positive();
const optDecimal = z.coerce.number().min(0).nullable().optional();

const roomSchema = z.object({
  roomType: z.nativeEnum(RoomType),
  rentPerMonth: decimalField,
  depositAmount: decimalField,
  expectedCommissionAmt: decimalField,
}).strict();

const propertySchema = z.object({
  vacancyType: z.nativeEnum(VacancyType).default("SINGLE"),
  propertyCategory: z.nativeEnum(PropertyCategory).optional(),
  description: z.string().trim().min(1, "Description is required"),
  addressLine1: z.string().trim().min(1, "Address is required"),
  addressLine2: z.string().trim().optional(),
  postcode: z.string().trim().min(1, "Postcode is required"),
  city: z.string().trim().min(1, "City is required"),
  rentPerMonth: optDecimal,
  depositAmount: optDecimal,
  expectedCommissionAmt: optDecimal,
  totalRooms: z.coerce.number().int().min(0).nullable().optional(),
  availableRooms: z.coerce.number().int().min(0).nullable().optional(),
  isFurnished: boolField,
  livingLandlord: boolField,
  garden: boolField,
  parking: boolField,
  billsIncluded: boolField,
  balcony: boolField,
  disabledAccess: boolField,
  livingRoom: z.enum(["PRIVATE", "SHARED", "NONE"]),
  broadbandIncluded: boolField,
  couplesAllowed: boolField,
  petsAllowed: boolField,
  dssAllowed: boolField,
  childrenAllowed: boolField,
  availabilityDate: z.string().datetime({ offset: true }),
  status: z.enum(["DRAFT", "AVAILABLE"]).default("DRAFT"),
  mediaAssetIds: z.array(z.string().uuid()).max(50).optional(),
  rooms: z.array(roomSchema).max(200).optional(),
}).strict();

const schema = z.object({
  landlord: z.object({
    firstName: z.string().trim().min(1, "First name is required"),
    lastName: z.string().trim().min(1, "Last name is required"),
    phone: z.string().trim().min(1, "Phone is required"),
    email: z.string().trim().email().optional().or(z.literal("")),
  }).strict(),
  property: propertySchema,
  potentialLandlordId: z.string().uuid().optional(),
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

function calcRentPerWeek(rentPerMonth: number): number {
  return Math.round((rentPerMonth * 12 / 52) * 100) / 100;
}

function generatePropertyRef(): string {
  const year = new Date().getFullYear();
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const random = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `PROP-${year}-${random}`;
}

async function autoAddToDialerContacts(agentId: string, fullName: string, phoneE164: string, note: string) {
  try {
    const existing = await db.dialerContact.findFirst({
      where: { ownerUserId: agentId, phoneNumber: phoneE164 },
      select: { id: true },
    });
    if (!existing) {
      await db.dialerContact.create({
        data: { ownerUserId: agentId, fullName, phoneNumber: phoneE164, notes: note },
      });
    }
  } catch { /* non-critical */ }
}

export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  const roleCheck = requireRole(auth.user, [UserRole.AGENT, UserRole.ADMIN]);
  if (!roleCheck.ok) return roleCheck.response;

  let payload: z.infer<typeof schema>;
  try {
    payload = schema.parse(await request.json());
  } catch (error) {
    return NextResponse.json(
      { error: "INVALID_REQUEST", message: "Invalid payload.", details: error instanceof z.ZodError ? error.flatten() : undefined },
      { status: 400 },
    );
  }

  const normalized = normalizeUkPhone(payload.landlord.phone);
  if (!normalized.ok) {
    return NextResponse.json({ error: "INVALID_PHONE", message: normalized.message }, { status: 400 });
  }

  // Block if locked by another agent
  const existingLocked = await db.potentialLandlord.findFirst({
    where: {
      phoneLast10: normalized.phoneLast10,
      isLocked: true,
      lockedUntil: { gt: new Date() },
      NOT: { addedByAgentId: auth.user.id },
    },
    select: { addedByAgent: { select: { agentDisplayName: true } }, lockedUntil: true },
  });

  if (existingLocked) {
    return NextResponse.json(
      { error: "POTENTIAL_LANDLORD_LOCKED", message: `This landlord is locked by ${existingLocked.addedByAgent.agentDisplayName} until ${existingLocked.lockedUntil?.toLocaleDateString("en-GB")}.` },
      { status: 409 },
    );
  }

  // Check if landlord already exists
  const existingLandlord = await db.landlord.findUnique({
    where: { phoneLast10: normalized.phoneLast10 },
    select: { id: true, ownerAgentId: true },
  });

  if (existingLandlord && existingLandlord.ownerAgentId !== auth.user.id && auth.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "LANDLORD_ASSIGNED_TO_OTHER_AGENT", message: "This landlord is already registered with another agent." },
      { status: 409 },
    );
  }

  const mediaAssetIds = normalizeMediaAssetIds(payload.property.mediaAssetIds);
  try {
    await assertMediaAssetsExist(db, mediaAssetIds);
  } catch {
    return NextResponse.json({ error: "MEDIA_ASSET_NOT_FOUND", message: "One or more images not found." }, { status: 400 });
  }

  const fullName = `${payload.landlord.firstName} ${payload.landlord.lastName}`.trim();
  const postcode = payload.property.postcode.toUpperCase().trim();

  const result = await db.$transaction(async (tx) => {
    let landlord = existingLandlord
      ? await tx.landlord.findUniqueOrThrow({ where: { id: existingLandlord.id }, select: { id: true, ownerAgentId: true, phoneLast10: true, landlordName: true } })
      : await tx.landlord.create({
          data: {
            landlordName: fullName,
            firstName: payload.landlord.firstName,
            lastName: payload.landlord.lastName,
            landlordNumber: normalized.phoneLast10,
            phoneE164: normalized.phoneE164,
            phoneLast10: normalized.phoneLast10,
            email: payload.landlord.email?.trim() || null,
            createdByUserId: auth.user.id,
            updatedByUserId: auth.user.id,
            ownerAgentId: auth.user.id,
          },
          select: { id: true, ownerAgentId: true, phoneLast10: true, landlordName: true },
        });

    // Link potential landlord if this was a follow-up continuation
    if (payload.potentialLandlordId) {
      await tx.potentialLandlord.updateMany({
        where: { id: payload.potentialLandlordId, addedByAgentId: auth.user.id },
        data: { landlordId: landlord.id, isLocked: false },
      });
    }

    const propertyRef = generatePropertyRef();
    const pData = payload.property;

    const property = await tx.property.create({
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
        rentPerWeek: pData.vacancyType === "SINGLE" && pData.rentPerMonth ? calcRentPerWeek(pData.rentPerMonth) : null,
        depositAmount: pData.vacancyType === "SINGLE" ? (pData.depositAmount ?? null) : null,
        expectedCommissionAmt: pData.vacancyType === "SINGLE" ? (pData.expectedCommissionAmt ?? null) : null,
        totalRooms: pData.vacancyType !== "SINGLE" || pData.propertyCategory !== "STUDIO_FLAT" ? (pData.totalRooms ?? null) : null,
        availableRooms: pData.vacancyType !== "SINGLE" || pData.propertyCategory !== "STUDIO_FLAT" ? (pData.availableRooms ?? null) : null,
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
                rentPerWeek: calcRentPerWeek(r.rentPerMonth),
                depositAmount: r.depositAmount,
                expectedCommissionAmt: r.expectedCommissionAmt,
              })),
            }
          : undefined,
      },
      select: { id: true, propertyRef: true, status: true },
    });

    if (mediaAssetIds.length > 0) {
      await tx.propertyMedia.createMany({ data: buildPropertyMediaRows(property.id, mediaAssetIds) });
    }

    const callLog = await tx.callLog.create({
      data: {
        agentId: auth.user.id,
        landlordId: landlord.id,
        potentialLandlordId: payload.potentialLandlordId ?? null,
        phone: payload.landlord.phone,
        phoneLast10: normalized.phoneLast10,
        status: CallLogStatus.CONFIRMED,
        landlordFirstName: payload.landlord.firstName,
        landlordLastName: payload.landlord.lastName,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: auth.user.id,
        entityType: "PROPERTY",
        entityId: property.id,
        action: "CREATE_PROPERTY_INTERESTED_FLOW",
        metadata: { landlordId: landlord.id, propertyRef },
        beforeJson: Prisma.JsonNull,
        afterJson: { propertyId: property.id },
      },
    });

    return { landlord, property, callLog };
  });

  // Auto-add to dialer contacts (non-blocking)
  void autoAddToDialerContacts(auth.user.id, fullName, normalized.phoneE164, "Auto-added from Interested flow");

  return NextResponse.json(result, { status: 201 });
}
