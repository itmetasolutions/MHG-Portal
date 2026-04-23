import { RoomType, UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole, requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { normalizeUkPhone } from "@/server/phone";

const boolField = z.enum(["true", "false"]).transform((v) => v === "true");

const createSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  email: z.string().trim().email().optional().or(z.literal("")),
  phone: z.string().trim().min(1, "Phone is required"),
  accommodationType: z.string().trim().optional(),
  countryOriginal: z.string().trim().optional(),
  nationality: z.string().trim().optional(),
  roomType: z.nativeEnum(RoomType).optional(),
  numberOfOccupants: z.coerce.number().int().min(1).optional(),
  numberOfChildren: z.coerce.number().int().min(0).optional(),
  onDSS: boolField.optional(),
  currentlyEmployed: boolField.optional(),
  annualIncome: z.coerce.number().min(0).optional(),
  currentLivingPostcode: z.string().trim().optional(),
  workplacePostcode: z.string().trim().optional(),
  maximumBudget: z.coerce.number().min(0).optional(),
  workingProfession: z.string().trim().optional(),
  immigrationStatus: z.string().trim().optional(),
  moveInDate: z.string().datetime({ offset: true }).optional(),
  notes: z.string().trim().max(5000).optional(),
}).strict();

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  agentId: z.string().uuid().optional(),
});

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  const roleCheck = requireRole(auth.user, [UserRole.ADMIN, UserRole.AGENT]);
  if (!roleCheck.ok) return roleCheck.response;

  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parse = querySchema.safeParse(params);
  if (!parse.success) {
    return NextResponse.json({ error: "INVALID_QUERY", details: parse.error.flatten() }, { status: 400 });
  }

  const { page, pageSize, agentId } = parse.data;
  const effectiveAgentId = auth.user.role === UserRole.ADMIN ? agentId : auth.user.id;

  const where = effectiveAgentId ? { addedByAgentId: effectiveAgentId } : {};

  const [total, potentialTenants] = await Promise.all([
    db.potentialTenant.count({ where }),
    db.potentialTenant.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        fullName: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        phoneLast10: true,
        accommodationType: true,
        countryOriginal: true,
        nationality: true,
        roomType: true,
        numberOfOccupants: true,
        numberOfChildren: true,
        onDSS: true,
        currentlyEmployed: true,
        annualIncome: true,
        currentLivingPostcode: true,
        workplacePostcode: true,
        maximumBudget: true,
        workingProfession: true,
        immigrationStatus: true,
        moveInDate: true,
        notes: true,
        createdAt: true,
        addedByAgent: { select: { id: true, agentDisplayName: true } },
      },
    }),
  ]);

  return NextResponse.json({
    potentialTenants,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  const roleCheck = requireRole(auth.user, [UserRole.ADMIN, UserRole.AGENT]);
  if (!roleCheck.ok) return roleCheck.response;

  let payload: z.infer<typeof createSchema>;
  try {
    payload = createSchema.parse(await request.json());
  } catch (error) {
    return NextResponse.json(
      { error: "INVALID_REQUEST", message: "Invalid payload.", details: error instanceof z.ZodError ? error.flatten() : undefined },
      { status: 400 },
    );
  }

  const normalized = normalizeUkPhone(payload.phone);
  if (!normalized.ok) {
    return NextResponse.json({ error: "INVALID_PHONE", message: normalized.message }, { status: 400 });
  }

  const fullName = `${payload.firstName} ${payload.lastName}`.trim();

  const potentialTenant = await db.potentialTenant.create({
    data: {
      fullName,
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email?.trim() || null,
      phone: payload.phone.trim(),
      phoneLast10: normalized.phoneLast10,
      accommodationType: payload.accommodationType?.trim() || null,
      countryOriginal: payload.countryOriginal?.trim() || null,
      nationality: payload.nationality?.trim() || null,
      roomType: payload.roomType ?? null,
      numberOfOccupants: payload.numberOfOccupants ?? null,
      numberOfChildren: payload.numberOfChildren ?? null,
      onDSS: payload.onDSS ?? null,
      currentlyEmployed: payload.currentlyEmployed ?? null,
      annualIncome: payload.annualIncome ?? null,
      currentLivingPostcode: payload.currentLivingPostcode?.trim().toUpperCase() || null,
      workplacePostcode: payload.workplacePostcode?.trim().toUpperCase() || null,
      maximumBudget: payload.maximumBudget ?? null,
      workingProfession: payload.workingProfession?.trim() || null,
      immigrationStatus: payload.immigrationStatus?.trim() || null,
      moveInDate: payload.moveInDate ? new Date(payload.moveInDate) : null,
      notes: payload.notes?.trim() || null,
      addedByAgentId: auth.user.id,
    },
    select: {
      id: true,
      fullName: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      phoneLast10: true,
      accommodationType: true,
      countryOriginal: true,
      nationality: true,
      roomType: true,
      numberOfOccupants: true,
      numberOfChildren: true,
      onDSS: true,
      currentlyEmployed: true,
      annualIncome: true,
      currentLivingPostcode: true,
      workplacePostcode: true,
      maximumBudget: true,
      workingProfession: true,
      immigrationStatus: true,
      moveInDate: true,
      notes: true,
      createdAt: true,
      addedByAgent: { select: { id: true, agentDisplayName: true } },
    },
  });

  return NextResponse.json({ potentialTenant }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  const roleCheck = requireRole(auth.user, [UserRole.ADMIN]);
  if (!roleCheck.ok) return roleCheck.response;

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "ID_REQUIRED", message: "Provide ?id=" }, { status: 400 });
  }

  await db.potentialTenant.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
