import assert from "node:assert/strict";
import test from "node:test";
import type { RequestUser } from "../server/auth/requireUser";
import {
  canEditLandlord,
  canSetLandlordStatus,
  type LandlordPolicyResource,
} from "../server/policies/landlord";

const ownerAgent: RequestUser = {
  id: "agent-owner",
  email: "owner@example.com",
  role: "AGENT",
  isActive: true,
  agentDisplayName: "Owner Agent",
};

const otherAgent: RequestUser = {
  id: "agent-other",
  email: "other@example.com",
  role: "AGENT",
  isActive: true,
  agentDisplayName: "Other Agent",
};

const adminUser: RequestUser = {
  id: "admin-user",
  email: "admin@example.com",
  role: "ADMIN",
  isActive: true,
  agentDisplayName: "Admin",
};

const activeLandlord: LandlordPolicyResource = {
  ownerAgentId: ownerAgent.id,
  status: "ACTIVE",
};

const passiveLandlord: LandlordPolicyResource = {
  ownerAgentId: ownerAgent.id,
  status: "PASSIVE",
};

test("owner agent can set ACTIVE landlord to PASSIVE", () => {
  assert.equal(canSetLandlordStatus(ownerAgent, activeLandlord, "PASSIVE"), true);
});

test("non-owner agent cannot set landlord to PASSIVE", () => {
  assert.equal(canSetLandlordStatus(otherAgent, activeLandlord, "PASSIVE"), false);
});

test("PASSIVE landlord cannot be edited by agent owner", () => {
  assert.equal(canEditLandlord(ownerAgent, passiveLandlord), false);
});

test("PASSIVE landlord cannot revert to ACTIVE by default, including admin", () => {
  assert.equal(canSetLandlordStatus(ownerAgent, passiveLandlord, "ACTIVE"), false);
  assert.equal(canSetLandlordStatus(adminUser, passiveLandlord, "ACTIVE"), false);
});

test("admin can revert PASSIVE to ACTIVE only when override config is enabled", () => {
  assert.equal(
    canSetLandlordStatus(adminUser, passiveLandlord, "ACTIVE", {
      allowAdminPassiveRevert: true,
    }),
    true,
  );
});
