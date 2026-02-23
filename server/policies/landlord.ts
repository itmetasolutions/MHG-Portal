import type { LandlordStatus } from "@prisma/client";
import type { RequestUser } from "@/server/auth/requireUser";

export type LandlordPolicyResource = {
  ownerAgentId: string;
  status: LandlordStatus;
};

export type LandlordStatusPolicyOptions = {
  allowAdminPassiveRevert?: boolean;
};

export function canViewLandlordRegistry(user: RequestUser): boolean {
  return user.role === "ADMIN" || user.role === "AGENT";
}

export function canCreateLandlord(user: RequestUser, ownerAgentId: string): boolean {
  if (user.role === "ADMIN") {
    return true;
  }

  return ownerAgentId === user.id;
}

export function canEditLandlord(user: RequestUser, landlord: LandlordPolicyResource): boolean {
  if (user.role === "ADMIN") {
    return true;
  }

  return landlord.ownerAgentId === user.id && landlord.status !== "PASSIVE";
}

export function canSetLandlordStatus(
  user: RequestUser,
  landlord: LandlordPolicyResource,
  nextStatus: LandlordStatus,
  options: LandlordStatusPolicyOptions = {},
): boolean {
  if (nextStatus === landlord.status) {
    return true;
  }

  if (nextStatus === "PASSIVE") {
    if (user.role === "ADMIN") {
      return true;
    }

    if (landlord.ownerAgentId !== user.id) {
      return false;
    }

    // Agent rule: only own ACTIVE landlords can transition to PASSIVE.
    return landlord.status === "ACTIVE";
  }

  if (nextStatus === "ACTIVE") {
    if (landlord.status !== "PASSIVE") {
      return false;
    }

    if (user.role !== "ADMIN") {
      return false;
    }

    return options.allowAdminPassiveRevert === true;
  }

  return false;
}

export function canChangeLandlordOwnership(user: RequestUser): boolean {
  return user.role === "ADMIN";
}
