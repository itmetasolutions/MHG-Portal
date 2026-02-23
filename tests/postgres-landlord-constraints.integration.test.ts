import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { ensureTestEnv, hasPostgresTestDatabase, usePostgresTestDatabase } from "./helpers/test-env";

ensureTestEnv();
usePostgresTestDatabase();

const hasPg = hasPostgresTestDatabase();

test(
  "postgres integration: one ACTIVE landlord per landlordNumber, PASSIVE duplicates allowed",
  { skip: !hasPg },
  async () => {
    const [{ db }, { Prisma }] = await Promise.all([
      import("../server/db"),
      import("@prisma/client"),
    ]);

    const suffix = randomUUID().slice(0, 8);
    const landlordNumber = `INT-${Date.now()}-${suffix}`;
    const agentEmail = `agent-${suffix}@example.com`;

    const agent = await db.user.create({
      data: {
        email: agentEmail,
        passwordHash: "not-used-in-this-test",
        role: "AGENT",
        agentDisplayName: `Agent ${suffix}`,
        isActive: true,
      },
      select: { id: true },
    });

    try {
      await db.landlord.create({
        data: {
          landlordName: "Active Landlord",
          landlordNumber,
          propertyId: `PROP-${suffix}`,
          url: "https://example.com/active",
          status: "ACTIVE",
          createdByUserId: agent.id,
          updatedByUserId: agent.id,
          ownerAgentId: agent.id,
        },
      });

      await assert.rejects(
        async () =>
          db.landlord.create({
            data: {
              landlordName: "Duplicate Active",
              landlordNumber,
              propertyId: `PROP2-${suffix}`,
              url: "https://example.com/active-2",
              status: "ACTIVE",
              createdByUserId: agent.id,
              updatedByUserId: agent.id,
              ownerAgentId: agent.id,
            },
          }),
        (error: unknown) =>
          error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002",
      );

      const passiveOne = await db.landlord.create({
        data: {
          landlordName: "Passive A",
          landlordNumber,
          propertyId: `PPA-${suffix}`,
          url: "https://example.com/passive-a",
          status: "PASSIVE",
          lockedAt: new Date(),
          createdByUserId: agent.id,
          updatedByUserId: agent.id,
          ownerAgentId: agent.id,
        },
        select: { id: true },
      });

      const passiveTwo = await db.landlord.create({
        data: {
          landlordName: "Passive B",
          landlordNumber,
          propertyId: `PPB-${suffix}`,
          url: "https://example.com/passive-b",
          status: "PASSIVE",
          lockedAt: new Date(),
          createdByUserId: agent.id,
          updatedByUserId: agent.id,
          ownerAgentId: agent.id,
        },
        select: { id: true },
      });

      assert.notEqual(passiveOne.id, passiveTwo.id);
    } finally {
      await db.landlord.deleteMany({
        where: { ownerAgentId: agent.id },
      });
      await db.user.delete({
        where: { id: agent.id },
      });
    }
  },
);
