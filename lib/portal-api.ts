import { apiGet, apiPatch, apiPost, type ApiResult } from "./api-client";

export type SessionRole = "ADMIN" | "AGENT";

export type LandlordRow = {
  id: string;
  landlordName: string;
  landlordNumber: string;
  propertyId: string;
  url: string;
  status: "ACTIVE" | "PASSIVE";
  lockedAt: string | null;
  createdAt: string;
  updatedAt: string;
  ownerAgent: {
    id: string;
    agentDisplayName: string;
  };
};

export type LandlordDetails = {
  id: string;
  landlordName: string;
  landlordNumber: string;
  propertyId: string;
  url: string;
  status: "ACTIVE" | "PASSIVE";
  lockedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdByUserId: string;
  updatedByUserId: string;
  ownerAgentId: string;
  ownerAgent: {
    id: string;
    agentDisplayName: string;
  };
  canEdit: boolean;
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

export type PropertyRow = {
  id: string;
  landlordId: string;
  ownerAgentId: string;
  propertyRef: string;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  stateRegion: string | null;
  postalCode: string | null;
  country: string | null;
  url: string | null;
  status: string | null;
  createdAt: string;
  updatedAt: string;
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

export function fetchLandlords(params: {
  search?: string;
  status?: "ACTIVE" | "PASSIVE";
  agent?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
  mine?: boolean;
}): Promise<ApiResult<LandlordListResponse>> {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.status) query.set("status", params.status);
  if (params.agent) query.set("agent", params.agent);
  if (params.dateFrom) query.set("dateFrom", params.dateFrom);
  if (params.dateTo) query.set("dateTo", params.dateTo);
  if (params.page) query.set("page", String(params.page));
  if (params.pageSize) query.set("pageSize", String(params.pageSize));
  if (params.mine) query.set("mine", "true");

  return apiGet<LandlordListResponse>(`/api/landlords?${query.toString()}`);
}

export function checkLandlordNumber(
  landlordNumber: string,
): Promise<
  ApiResult<{
    landlordNumber: string;
    activeExists: boolean;
    existingActiveLandlord: LandlordRow | null;
    passiveCount: number;
    canCreate: boolean;
  }>
> {
  return apiGet(`/api/landlords/check-number?landlordNumber=${encodeURIComponent(landlordNumber)}`);
}

export function createLandlord(payload: {
  landlordName: string;
  landlordNumber: string;
  propertyId: string;
  url: string;
}): Promise<ApiResult<{ landlord: LandlordRow }>> {
  return apiPost("/api/landlords", payload);
}

export function fetchLandlordDetails(id: string): Promise<ApiResult<{ landlord: LandlordDetails }>> {
  return apiGet(`/api/landlords/${id}`);
}

export function updateLandlord(
  id: string,
  payload: Partial<{
    landlordName: string;
    landlordNumber: string;
    propertyId: string;
    url: string;
    status: "ACTIVE" | "PASSIVE";
  }>,
): Promise<ApiResult<{ landlord: LandlordDetails }>> {
  return apiPatch(`/api/landlords/${id}`, payload);
}

export function setLandlordPassive(id: string): Promise<ApiResult<{ landlord: LandlordDetails }>> {
  return apiPatch(`/api/landlords/${id}/status`, { status: "PASSIVE" });
}

export function fetchLandlordProperties(
  landlordId: string,
): Promise<ApiResult<{ landlord: Pick<LandlordDetails, "id" | "landlordName" | "landlordNumber" | "ownerAgentId">; properties: PropertyRow[] }>> {
  return apiGet(`/api/landlords/${landlordId}/properties`);
}

export function createLandlordProperty(
  landlordId: string,
  payload: Partial<PropertyRow> & { propertyRef: string },
): Promise<ApiResult<{ property: PropertyRow }>> {
  return apiPost(`/api/landlords/${landlordId}/properties`, payload);
}

export function fetchProperties(params: {
  landlordNumber?: string;
  propertyRef?: string;
  createdAt?: string;
  page?: number;
  pageSize?: number;
}): Promise<
  ApiResult<{
    properties: Array<
      PropertyRow & {
        landlord: {
          id: string;
          landlordNumber: string;
          landlordName: string;
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
  if (params.landlordNumber) query.set("landlordNumber", params.landlordNumber);
  if (params.propertyRef) query.set("propertyRef", params.propertyRef);
  if (params.createdAt) query.set("createdAt", params.createdAt);
  if (params.page) query.set("page", String(params.page));
  if (params.pageSize) query.set("pageSize", String(params.pageSize));

  return apiGet(`/api/properties?${query.toString()}`);
}

export function updateProperty(
  propertyId: string,
  payload: Partial<PropertyRow>,
): Promise<ApiResult<{ property: PropertyRow }>> {
  return apiPatch(`/api/properties/${propertyId}`, payload);
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
