import assert from "node:assert/strict";
import test from "node:test";
import { canEditLandlord, canSetLandlordStatus } from "../server/policies/landlord";
import { canViewProperty } from "../server/policies/property";

type LandlordStatus = "ACTIVE" | "PASSIVE";

type MockLandlord = {
  id: string;
  landlordNumber: string;
  status: LandlordStatus;
};

class MockLandlordStore {
  private rows: MockLandlord[] = [];

  create(record: Omit<MockLandlord, "id">): MockLandlord {
    if (
      record.status === "ACTIVE" &&
      this.rows.some(
        (existing) =>
          existing.status === "ACTIVE" && existing.landlordNumber === record.landlordNumber,
      )
    ) {
      throw new Error("ACTIVE_LANDLORD_NUMBER_CONFLICT");
    }

    const created: MockLandlord = {
      id: `${this.rows.length + 1}`,
      landlordNumber: record.landlordNumber,
      status: record.status,
    };
    this.rows.push(created);
    return created;
  }
}

const ownerAgent = {
  id: "agent-owner",
  email: "owner@example.com",
  role: "AGENT" as const,
  isActive: true,
  agentDisplayName: "Owner Agent",
};

const otherAgent = {
  id: "agent-other",
  email: "other@example.com",
  role: "AGENT" as const,
  isActive: true,
  agentDisplayName: "Other Agent",
};

const adminUser = {
  id: "admin-user",
  email: "admin@example.com",
  role: "ADMIN" as const,
  isActive: true,
  agentDisplayName: "Admin User",
};

test("mock rule: cannot create 2 ACTIVE landlords with same landlordNumber", () => {
  const store = new MockLandlordStore();

  store.create({ landlordNumber: "L-100", status: "ACTIVE" });
  assert.throws(
    () => store.create({ landlordNumber: "L-100", status: "ACTIVE" }),
    /ACTIVE_LANDLORD_NUMBER_CONFLICT/,
  );
});

test("mock rule: can create PASSIVE duplicates with same landlordNumber", () => {
  const store = new MockLandlordStore();

  const first = store.create({ landlordNumber: "L-200", status: "PASSIVE" });
  const second = store.create({ landlordNumber: "L-200", status: "PASSIVE" });

  assert.notEqual(first.id, second.id);
});

test("ACTIVE -> PASSIVE is allowed only for owner agent or admin", () => {
  const landlord = { ownerAgentId: ownerAgent.id, status: "ACTIVE" as const };

  assert.equal(canSetLandlordStatus(ownerAgent, landlord, "PASSIVE"), true);
  assert.equal(canSetLandlordStatus(adminUser, landlord, "PASSIVE"), true);
  assert.equal(canSetLandlordStatus(otherAgent, landlord, "PASSIVE"), false);
});

test("PASSIVE cannot be changed back to ACTIVE by default", () => {
  const landlord = { ownerAgentId: ownerAgent.id, status: "PASSIVE" as const };

  assert.equal(canSetLandlordStatus(ownerAgent, landlord, "ACTIVE"), false);
  assert.equal(canSetLandlordStatus(adminUser, landlord, "ACTIVE"), false);
});

test("PASSIVE cannot be edited by agent", () => {
  const landlord = { ownerAgentId: ownerAgent.id, status: "PASSIVE" as const };

  assert.equal(canEditLandlord(ownerAgent, landlord), false);
});

test("agent cannot edit another agent landlord", () => {
  const landlord = { ownerAgentId: ownerAgent.id, status: "ACTIVE" as const };

  assert.equal(canEditLandlord(otherAgent, landlord), false);
});

test("properties are visible only to owning agent or admin", () => {
  const property = {
    ownerAgentId: ownerAgent.id,
    landlordOwnerAgentId: ownerAgent.id,
  };

  assert.equal(canViewProperty(ownerAgent, property), true);
  assert.equal(canViewProperty(adminUser, property), true);
  assert.equal(canViewProperty(otherAgent, property), false);
});
