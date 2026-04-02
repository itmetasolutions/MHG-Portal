import { apiDelete, apiGet, apiPatch, apiPost, type ApiResult } from "./api-client";

export type SessionRole = "ADMIN" | "AGENT";

export type PropertyStatus = "DRAFT" | "AVAILABLE" | "CLOSED";
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

export type MediaAssetRow = {
  id: string;
  name: string;
  mimeType: string;
  dataUrl: string;
  createdAt: string;
  uploadedBy?: {
    id: string;
    agentDisplayName: string;
    email: string;
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
  title: string | null;
  description: string | null;
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
  expectedCommissionAmt: string | null;
  totalRooms: number | null;
  availableRooms: number | null;
  rentPerMonth: string | null;
  depositAmount: string | null;
  isFurnished: boolean | null;
  personsAllowed: number | null;
  petsAllowed: boolean | null;
  dssAllowed: boolean | null;
  childrenAllowed: boolean | null;
  availabilityDate: string | null;
  livingLandlord: boolean | null;
  createdAt: string;
  updatedAt: string;
  ownerAgent?: {
    id: string;
    agentDisplayName: string;
    email?: string;
  };
  images?: MediaAssetRow[];
  sales?: SaleRow[];
  rooms?: PropertyRoomRow[];
  // Backward compatibility for legacy screens still expecting one sale.
  sale?: SaleRow | null;
};

export type AgentRow = {
  id: string;
  email: string;
  agentDisplayName: string;
  profilePicture?: string | null;
  isActive: boolean;
  createdAt: string;
  _count?: {
    ownedLandlords: number;
    ownedProperties: number;
  };
};

export type AgentTransferCategory =
  | "LANDLORDS"
  | "PROPERTIES"
  | "TENANTS"
  | "POTENTIAL_TENANTS"
  | "POTENTIAL_LANDLORDS";

export type AgentTransferEntityType =
  | "LANDLORD"
  | "PROPERTY"
  | "TENANT"
  | "POTENTIAL_TENANT"
  | "POTENTIAL_LANDLORD";

export type AgentTransferSummary = {
  landlordsMoved: number;
  propertiesMoved: number;
  standaloneTenantsMoved: number;
  potentialTenantsMoved: number;
  potentialLandlordsMoved: number;
  linkedSaleTenantsAffected: number;
  skippedProperties: number;
  skippedTenants: number;
  warnings: string[];
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

export type ApprovalRow = {
  id: string;
  entityType: "LANDLORD" | "PROPERTY" | "TENANT" | "POTENTIAL_TENANT" | "POTENTIAL_LANDLORD";
  entityId: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  summary: string | null;
  beforeJson: unknown;
  proposedJson: unknown;
  reviewerNotes: string | null;
  createdAt: string;
  reviewedAt: string | null;
  requestedBy: {
    id: string;
    email: string;
    agentDisplayName: string;
  };
  reviewedBy: {
    id: string;
    email: string;
    agentDisplayName: string;
  } | null;
};

export type ApprovalListResponse = {
  approvals: ApprovalRow[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export type DialerDomainConfigRow = {
  id: string;
  dialerMode: "SIP" | "LINKUS";
  linkusWebClientUrl: string | null;
  pbxPlatform: string | null;
  domain: string | null;
  sipPort: number | null;
  sipTransport: string | null;
  websocketHost: string | null;
  isEnabled: boolean;
  updatedAt: string | null;
  updatedBy?: {
    id: string;
    agentDisplayName: string;
    email: string;
  } | null;
};

export type AdminAgentDialerSettings = {
  id: string;
  email: string;
  agentDisplayName: string;
  isActive: boolean;
  createdAt: string;
  dialer: {
    extensionNumber: string | null;
    extensionName: string | null;
    providerUsername: string | null;
    autoDetectExtension: boolean;
    hasProviderPassword: boolean;
    updatedAt: string | null;
  };
};

export type DialerLabelRow = {
  id: string;
  name: string;
  colorHex: string;
  createdAt: string;
  updatedAt: string;
  contactsCount: number;
};

export type DialerContactRow = {
  id: string;
  fullName: string;
  phoneNumber: string;
  extensionNumber: string | null;
  email: string | null;
  notes: string | null;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
  labels: Array<{
    id: string;
    name: string;
    colorHex: string;
  }>;
};

export type DialerCallHistoryRow = {
  id: string;
  direction: "INCOMING" | "OUTGOING" | "INTERNAL";
  status: "MISSED" | "RINGING" | "ANSWERED" | "REJECTED" | "COMPLETED" | "FAILED";
  peerName: string | null;
  peerNumber: string | null;
  peerExtension: string | null;
  startedAt: string;
  answeredAt: string | null;
  endedAt: string | null;
  durationSec: number;
  recordingUrl: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  contact: {
    id: string;
    fullName: string;
    phoneNumber: string;
    extensionNumber: string | null;
  } | null;
  counterpartUser: {
    id: string;
    name: string;
    email: string;
  } | null;
};

export type DialerBootstrapResponse = {
  dialerDomain: {
    dialerMode: "SIP" | "LINKUS";
    linkusWebClientUrl: string | null;
    domain: string | null;
    websocketHost: string | null;
    isEnabled: boolean;
    updatedAt: string | null;
  };
  me: {
    id: string;
    email: string;
    name: string;
    role: SessionRole;
    dialer: {
      extensionNumber: string | null;
      extensionName: string | null;
      providerUsername: string | null;
      providerPassword: string | null;
      autoDetectExtension: boolean;
      updatedAt: string | null;
    };
  };
  intercomAgents: Array<{
    id: string;
    name: string;
    email: string;
    extensionNumber: string | null;
    extensionName: string | null;
  }>;
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
  landlordId?: string;
  propertyRef?: string;
  title?: string | null;
  description?: string | null;
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
  expectedCommissionAmt?: number | string | null;
  totalRooms?: number | null;
  availableRooms?: number | null;
  rentPerMonth?: number | null;
  depositAmount?: number | null;
  isFurnished?: boolean | null;
  personsAllowed?: number | null;
  petsAllowed?: boolean | null;
  dssAllowed?: boolean | null;
  childrenAllowed?: boolean | null;
  availabilityDate?: string | null;
  livingLandlord?: boolean | null;
  mediaAssetIds?: string[];
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

// Fetch a small list of landlords for use in dropdowns (max 200, no pagination needed for selects)
export function fetchLandlordsForDropdown(): Promise<ApiResult<LandlordListResponse>> {
  return apiGet<LandlordListResponse>("/api/landlords?mine=true&pageSize=200");
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
    email: string | null;
    notes: string | null;
    isPassive: boolean;
    ownerAgentId: string;
    reassignmentReason: string;
  }>,
): Promise<ApiResult<{
  landlord: LandlordDetails;
  approvalRequired?: boolean;
  approvalRequest?: {
    id: string;
    status: string;
    entityType: string;
    entityId: string;
    summary: string | null;
    createdAt: string;
  };
  message?: string;
}>> {
  return apiPatch(`/api/landlords/${id}`, payload);
}

export function setLandlordPassive(
  id: string,
  isPassive: boolean,
): Promise<ApiResult<{ landlord: LandlordDetails }>> {
  return apiPatch(`/api/landlords/${id}`, { isPassive });
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
  search?: string;
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
  if (params.search) query.set("search", params.search);
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
): Promise<ApiResult<{
  property: PropertyRow;
  approvalRequired?: boolean;
  approvalRequest?: {
    id: string;
    status: string;
    entityType: string;
    entityId: string;
    summary: string | null;
    createdAt: string;
  };
  message?: string;
}>> {
  return apiPatch(`/api/properties/${propertyId}`, payload);
}

export function listMediaLibrary(): Promise<ApiResult<{ assets: MediaAssetRow[] }>> {
  return apiGet("/api/media-library");
}

export function uploadMediaAssets(payload: {
  files: Array<{
    name?: string;
    dataUrl: string;
  }>;
}): Promise<ApiResult<{ assets: MediaAssetRow[] }>> {
  return apiPost("/api/media-library", payload);
}

export function createTenant(payload: {
  fullName: string;
  phone: string;
  email?: string | null;
  currentAddress?: string | null;
  moveInDate?: string | null;
  rentAmount?: number | null;
  depositAmount?: number | null;
  notes?: string | null;
}): Promise<ApiResult<{ tenant: TenantRow }>> {
  return apiPost("/api/tenants", payload);
}

// Phone is not editable — use createTenant phone for unique ID
export function updateTenant(
  tenantId: string,
  payload: {
    fullName?: string;
    email?: string | null;
    currentAddress?: string | null;
    moveInDate?: string | null;
    rentAmount?: number | null;
    depositAmount?: number | null;
    notes?: string | null;
  },
): Promise<ApiResult<{
  tenant: TenantRow;
  approvalRequired?: boolean;
  approvalRequest?: {
    id: string;
    status: string;
    entityType: string;
    entityId: string;
    summary: string | null;
    createdAt: string;
  };
  message?: string;
}>> {
  return apiPatch(`/api/tenants/${tenantId}`, payload);
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

export function reassignAgentRecords(
  agentId: string,
  payload:
    | {
        mode: "BULK";
        targetAgentId: string;
        categories: AgentTransferCategory[];
        reason: string;
      }
    | {
        mode: "SINGLE";
        targetAgentId: string;
        entityType: AgentTransferEntityType;
        entityId: string;
        reason: string;
      },
): Promise<
  ApiResult<{
    message: string;
    summary: AgentTransferSummary;
    sourceAgent: {
      id: string;
      agentDisplayName: string;
      email: string;
    };
    targetAgent: {
      id: string;
      agentDisplayName: string;
      email: string;
    };
  }>
> {
  return apiPost(`/api/admin/users/${agentId}/reassign`, payload);
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

export function listApprovals(params?: {
  status?: "PENDING" | "APPROVED" | "REJECTED";
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<ApiResult<ApprovalListResponse>> {
  const query = new URLSearchParams();
  if (params?.status) query.set("status", params.status);
  if (params?.search) query.set("search", params.search);
  if (params?.page) query.set("page", String(params.page));
  if (params?.pageSize) query.set("pageSize", String(params.pageSize));

  return apiGet(`/api/approvals?${query.toString()}`);
}

export function fetchDialerDomain(): Promise<ApiResult<{ config: DialerDomainConfigRow }>> {
  return apiGet("/api/admin/dialer-domain");
}

export function updateDialerDomain(payload: {
  dialerMode?: "SIP" | "LINKUS";
  linkusWebClientUrl?: string | null;
  pbxPlatform?: string | null;
  domain?: string | null;
  sipPort?: number | null;
  sipTransport?: string | null;
  websocketHost?: string | null;
  isEnabled?: boolean;
}): Promise<ApiResult<{ message: string; config: DialerDomainConfigRow }>> {
  return apiPatch("/api/admin/dialer-domain", payload);
}

export function fetchAdminAgentDialerSettings(
  agentId: string,
): Promise<ApiResult<{ agent: AdminAgentDialerSettings }>> {
  return apiGet(`/api/admin/users/${agentId}/settings`);
}

export function updateAdminAgentDialerSettings(
  agentId: string,
  payload: Partial<{
    email: string;
    agentDisplayName: string;
    isActive: boolean;
    newPassword: string;
    providerUsername: string | null;
    providerPassword: string | null;
    extensionNumber: string | null;
    extensionName: string | null;
    autoDetectExtension: boolean;
  }>,
): Promise<ApiResult<{ message: string; agent: AdminAgentDialerSettings }>> {
  return apiPatch(`/api/admin/users/${agentId}/settings`, payload);
}

export function fetchDialerBootstrap(): Promise<ApiResult<DialerBootstrapResponse>> {
  return apiGet("/api/dialer/bootstrap");
}

export function listDialerContacts(params?: {
  search?: string;
  labelId?: string;
}): Promise<ApiResult<{ contacts: DialerContactRow[] }>> {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.labelId) query.set("labelId", params.labelId);
  const suffix = query.size > 0 ? `?${query.toString()}` : "";
  return apiGet(`/api/dialer/contacts${suffix}`);
}

export function createDialerContact(payload: {
  fullName: string;
  phoneNumber: string;
  extensionNumber?: string | null;
  email?: string | null;
  notes?: string | null;
  isFavorite?: boolean;
  labelIds?: string[];
}): Promise<ApiResult<{ message: string; contact: DialerContactRow }>> {
  return apiPost("/api/dialer/contacts", payload);
}

export function updateDialerContact(
  contactId: string,
  payload: Partial<{
    fullName: string;
    phoneNumber: string;
    extensionNumber: string | null;
    email: string | null;
    notes: string | null;
    isFavorite: boolean;
    labelIds: string[];
  }>,
): Promise<ApiResult<{ message: string; contact: DialerContactRow }>> {
  return apiPatch(`/api/dialer/contacts/${contactId}`, payload);
}

export function deleteDialerContact(
  contactId: string,
): Promise<ApiResult<{ message: string }>> {
  return apiDelete(`/api/dialer/contacts/${contactId}`);
}

export function listDialerLabels(): Promise<ApiResult<{ labels: DialerLabelRow[] }>> {
  return apiGet("/api/dialer/labels");
}

export function createDialerLabel(payload: {
  name: string;
  colorHex?: string;
}): Promise<ApiResult<{ message: string; label: DialerLabelRow }>> {
  return apiPost("/api/dialer/labels", payload);
}

export function updateDialerLabel(
  labelId: string,
  payload: Partial<{ name: string; colorHex: string }>,
): Promise<ApiResult<{ message: string; label: DialerLabelRow }>> {
  return apiPatch(`/api/dialer/labels/${labelId}`, payload);
}

export function deleteDialerLabel(
  labelId: string,
): Promise<ApiResult<{ message: string }>> {
  return apiDelete(`/api/dialer/labels/${labelId}`);
}

export function listDialerHistory(params?: {
  direction?: DialerCallHistoryRow["direction"];
  status?: DialerCallHistoryRow["status"];
  search?: string;
  from?: string;
  to?: string;
  contactId?: string;
  limit?: number;
}): Promise<ApiResult<{ calls: DialerCallHistoryRow[] }>> {
  const query = new URLSearchParams();
  if (params?.direction) query.set("direction", params.direction);
  if (params?.status) query.set("status", params.status);
  if (params?.search) query.set("search", params.search);
  if (params?.from) query.set("from", params.from);
  if (params?.to) query.set("to", params.to);
  if (params?.contactId) query.set("contactId", params.contactId);
  if (params?.limit) query.set("limit", String(params.limit));
  const suffix = query.size > 0 ? `?${query.toString()}` : "";
  return apiGet(`/api/dialer/history${suffix}`);
}

export function createDialerCallHistory(payload: {
  direction: DialerCallHistoryRow["direction"];
  status?: DialerCallHistoryRow["status"];
  contactId?: string;
  counterpartUserId?: string | null;
  peerName?: string | null;
  peerNumber?: string | null;
  peerExtension?: string | null;
  startedAt?: string;
  answeredAt?: string | null;
  endedAt?: string | null;
  durationSec?: number;
  recordingUrl?: string | null;
  notes?: string | null;
}): Promise<ApiResult<{ message: string; call: DialerCallHistoryRow }>> {
  return apiPost("/api/dialer/history", payload);
}

export function updateDialerCallHistory(
  callId: string,
  payload: Partial<{
    status: DialerCallHistoryRow["status"];
    answeredAt: string | null;
    endedAt: string | null;
    durationSec: number;
    recordingUrl: string | null;
    notes: string | null;
  }>,
): Promise<ApiResult<{ message: string; call: DialerCallHistoryRow }>> {
  return apiPatch(`/api/dialer/history/${callId}`, payload);
}

export function deleteDialerCallHistory(
  callId: string,
): Promise<ApiResult<{ message: string }>> {
  return apiDelete(`/api/dialer/history/${callId}`);
}
