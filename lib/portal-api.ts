import { apiGet, apiPatch, apiPost, type ApiResult } from "./api-client";

export type SessionRole = "ADMIN" | "AGENT";

export type PropertyStatus = "DRAFT" | "LIVE" | "UNDER_OFFER" | "SOLD" | "WITHDRAWN";
export type VacancyType = "SINGLE" | "MULTIPLE";
export type RoomStatus = "AVAILABLE" | "UNDER_OFFER" | "CLOSED";

export type TenantRow = {
  id: string;
  saleId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  currentAddress: string | null;
  moveInDate: string | null;
  rentAmount: string | null;
  depositAmount: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SaleRow = {
  id: string;
  propertyId: string;
  roomId?: string | null;
  closedByUserId: string;
  finalAmount: string;
  commissionPct: string;
  commissionAmount: string;
  otherCosts: string | null;
  profit: string;
  closedAt: string;
  tenant?: TenantRow | null;
};

export type PropertyRoomRow = {
  id: string;
  propertyId: string;
  roomName: string;
  landlordDemand: string | null;
  expectedCommissionPct: string | null;
  status: RoomStatus;
  createdAt: string;
  sale?: {
    id: string;
    finalAmount: string;
    commissionAmount: string;
    profit: string;
    closedAt: string;
    tenant?: { id: string; fullName: string } | null;
  } | null;
};

export type LandlordRow = {
  id: string;
  landlordName: string;
  landlordNumber: string;
  phoneE164: string | null;
  phoneLast10: string;
  email: string | null;
  notes: string | null;
  isPassive?: boolean;
  passiveMarkedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  ownerAgent: {
    id: string;
    agentDisplayName: string;
  };
  _count?: {
    properties: number;
  };
};

export type LandlordDetails = {
  id: string;
  landlordName: string;
  landlordNumber: string;
  phoneE164: string | null;
  phoneLast10: string;
  email: string | null;
  notes: string | null;
  isPassive?: boolean;
  passiveMarkedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  createdByUserId: string;
  updatedByUserId: string;
  ownerAgentId: string;
  ownerAgent: {
    id: string;
    agentDisplayName: string;
  };
  _count?: {
    properties: number;
  };
  canEdit: boolean;
};

export type PropertyRow = {
  id: string;
  landlordId: string;
  ownerAgentId: string;
  propertyRef: string;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  county: string | null;
  postcode: string | null;
  propertyType: string | null;
  beds: number | null;
  baths: number | null;
  status: PropertyStatus;
  vacancyType?: VacancyType;
  landlordDemand: string | null;
  expectedCommissionPct: string | null;
  createdAt: string;
  updatedAt: string;
  sales?: SaleRow[];
  rooms?: PropertyRoomRow[];
  // Backward compatibility for legacy screens still expecting one sale.
  sale?: SaleRow | null;
};

export type AgentRow = {
  id: string;
  email: string;
  agentDisplayName: string;
  isActive: boolean;
  createdAt: string;
  _count?: {
    ownedLandlords: number;
    ownedProperties: number;
  };
};

export type AuditLogRow = {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  metadata: unknown;
  beforeJson: unknown;
  afterJson: unknown;
  createdAt: string;
  user: {
    id: string;
    email: string;
    agentDisplayName: string;
    role: SessionRole;
  };
};

export type AuditLogListResponse = {
  logs: AuditLogRow[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export type LandlordListResponse = {
  landlords: LandlordRow[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export type LandlordLookupResponse = {
  phoneInput: string;
  phoneLast10: string;
  phoneE164: string;
  landlordExists: boolean;
  ownershipConflict: boolean;
  canCreateLandlord: boolean;
  canCreateProperty: boolean;
  landlord: (LandlordRow & { ownerAgentId: string; _count: { properties: number } }) | null;
};

export type RoomDraftInput = {
  roomName: string;
  landlordDemand?: number | string | null;
  expectedCommissionPct?: number | string | null;
};

export type PropertyDraftPayload = {
  propertyRef?: string;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  county?: string | null;
  postcode?: string | null;
  propertyType?: string | null;
  beds?: number | null;
  baths?: number | null;
  status?: PropertyStatus;
  vacancyType?: VacancyType;
  landlordDemand?: number | string | null;
  expectedCommissionPct?: number | string | null;
  rooms?: RoomDraftInput[];
};

export type CloseSaleTenantPayload = {
  fullName: string;
  email?: string;
  phone?: string;
  currentAddress?: string;
  moveInDate?: string;
  rentAmount?: number;
  depositAmount?: number;
  notes?: string;
};

export type CloseSalePayload = {
  finalAmount: number;
  commissionPct: number;
  otherCosts?: number;
  tenant: CloseSaleTenantPayload;
};

export function fetchLandlords(params: {
  search?: string;
  agent?: string;
  phoneLast10?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
  mine?: boolean;
}): Promise<ApiResult<LandlordListResponse>> {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.agent) query.set("agent", params.agent);
  if (params.phoneLast10) query.set("phoneLast10", params.phoneLast10);
  if (params.dateFrom) query.set("dateFrom", params.dateFrom);
  if (params.dateTo) query.set("dateTo", params.dateTo);
  if (params.page) query.set("page", String(params.page));
  if (params.pageSize) query.set("pageSize", String(params.pageSize));
  if (params.mine) query.set("mine", "true");

  return apiGet<LandlordListResponse>(`/api/landlords?${query.toString()}`);
}

export function checkLandlordNumber(
  phone: string,
): Promise<ApiResult<LandlordLookupResponse>> {
  return apiGet(`/api/landlords/check-number?phone=${encodeURIComponent(phone)}`);
}

export function createLandlord(payload: {
  fullName: string;
  phone: string;
  email?: string;
  notes?: string;
  ownerAgentId?: string;
}): Promise<ApiResult<{ landlord: LandlordRow }>> {
  return apiPost("/api/landlords", payload);
}

export function fetchLandlordDetails(id: string): Promise<ApiResult<{ landlord: LandlordDetails }>> {
  return apiGet(`/api/landlords/${id}`);
}

export function updateLandlord(
  id: string,
  payload: Partial<{
    fullName: string;
    phone: string;
    email: string | null;
    notes: string | null;
    ownerAgentId: string;
    reassignmentReason: string;
  }>,
): Promise<ApiResult<{ landlord: LandlordDetails }>> {
  return apiPatch(`/api/landlords/${id}`, payload);
}

export function fetchLandlordProperties(
  landlordId: string,
): Promise<
  ApiResult<{
    landlord: {
      id: string;
      fullName: string;
      phoneE164: string | null;
      phoneLast10: string;
      email: string | null;
      ownerAgentId: string;
    };
    properties: PropertyRow[];
  }>
> {
  return apiGet(`/api/landlords/${landlordId}/properties`);
}

export function createLandlordProperty(
  landlordId: string,
  payload: PropertyDraftPayload,
): Promise<ApiResult<{ property: PropertyRow }>> {
  return apiPost(`/api/landlords/${landlordId}/properties`, payload);
}

export function createPropertyIntake(payload: {
  landlord: {
    fullName?: string;
    phone: string;
    email?: string | null;
    notes?: string | null;
    ownerAgentId?: string;
  };
  property: PropertyDraftPayload;
}): Promise<
  ApiResult<{
    landlordCreated: boolean;
    landlord: {
      id: string;
      landlordName: string;
      ownerAgentId: string;
      phoneLast10: string;
    };
    property: PropertyRow;
  }>
> {
  return apiPost("/api/properties/intake", payload);
}

export function fetchProperties(params: {
  phoneLast10?: string;
  propertyRef?: string;
  status?: PropertyStatus;
  city?: string;
  postcode?: string;
  createdAt?: string;
  page?: number;
  pageSize?: number;
}): Promise<
  ApiResult<{
    properties: Array<
      PropertyRow & {
        landlord: {
          id: string;
          landlordName: string;
          phoneE164: string | null;
          phoneLast10: string;
          ownerAgentId: string;
        };
      }
    >;
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  }>
> {
  const query = new URLSearchParams();
  if (params.phoneLast10) query.set("phoneLast10", params.phoneLast10);
  if (params.propertyRef) query.set("propertyRef", params.propertyRef);
  if (params.status) query.set("status", params.status);
  if (params.city) query.set("city", params.city);
  if (params.postcode) query.set("postcode", params.postcode);
  if (params.createdAt) query.set("createdAt", params.createdAt);
  if (params.page) query.set("page", String(params.page));
  if (params.pageSize) query.set("pageSize", String(params.pageSize));

  return apiGet(`/api/properties?${query.toString()}`);
}

export function updateProperty(
  propertyId: string,
  payload: Partial<PropertyDraftPayload>,
): Promise<ApiResult<{ property: PropertyRow }>> {
  return apiPatch(`/api/properties/${propertyId}`, payload);
}

export function addPropertyRoom(
  propertyId: string,
  payload: RoomDraftInput,
): Promise<ApiResult<{ room: PropertyRoomRow }>> {
  return apiPost(`/api/properties/${propertyId}/rooms`, payload);
}

export function closePropertySale(
  propertyId: string,
  payload: CloseSalePayload,
): Promise<ApiResult<{ sale: SaleRow; tenant: TenantRow }>> {
  return apiPost(`/api/properties/${propertyId}/close-sale`, payload);
}

export function closePropertyRoomSale(
  propertyId: string,
  roomId: string,
  payload: CloseSalePayload,
): Promise<ApiResult<{ sale: SaleRow; tenant: { id: string; fullName: string }; allRoomsClosed: boolean }>> {
  return apiPost(`/api/properties/${propertyId}/rooms/${roomId}/close`, payload);
}

export function listSales(params: {
  dateFrom?: string;
  dateTo?: string;
  agent?: string;
  status?: PropertyStatus;
  city?: string;
  postcode?: string;
  format?: "json" | "csv";
  page?: number;
  pageSize?: number;
}): Promise<
  ApiResult<{
    sales: Array<
      SaleRow & {
        property: {
          id: string;
          propertyRef: string;
          status: PropertyStatus;
          city: string | null;
          postcode: string | null;
          ownerAgentId: string;
          ownerAgent: {
            id: string;
            agentDisplayName: string;
            email: string;
          };
          landlord: {
            id: string;
            landlordName: string;
            phoneLast10: string;
          };
        };
      }
    >;
    totals: {
      finalAmount: number | null;
      commissionAmount: number | null;
      profit: number | null;
    };
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  }>
> {
  const query = new URLSearchParams();
  if (params.dateFrom) query.set("dateFrom", params.dateFrom);
  if (params.dateTo) query.set("dateTo", params.dateTo);
  if (params.agent) query.set("agent", params.agent);
  if (params.status) query.set("status", params.status);
  if (params.city) query.set("city", params.city);
  if (params.postcode) query.set("postcode", params.postcode);
  if (params.format) query.set("format", params.format);
  if (params.page) query.set("page", String(params.page));
  if (params.pageSize) query.set("pageSize", String(params.pageSize));

  return apiGet(`/api/sales?${query.toString()}`);
}

export function listAgents(params: {
  search?: string;
  includeDisabled?: boolean;
}): Promise<ApiResult<{ agents: AgentRow[] }>> {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.includeDisabled !== undefined) {
    query.set("includeDisabled", String(params.includeDisabled));
  }
  return apiGet(`/api/admin/users?${query.toString()}`);
}

export function listAuditLogs(params: {
  entityType?: string;
  action?: string;
  user?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}): Promise<ApiResult<AuditLogListResponse>> {
  const query = new URLSearchParams();
  if (params.entityType) query.set("entityType", params.entityType);
  if (params.action) query.set("action", params.action);
  if (params.user) query.set("user", params.user);
  if (params.dateFrom) query.set("dateFrom", params.dateFrom);
  if (params.dateTo) query.set("dateTo", params.dateTo);
  if (params.page) query.set("page", String(params.page));
  if (params.pageSize) query.set("pageSize", String(params.pageSize));

  return apiGet(`/api/admin/audit?${query.toString()}`);
}

