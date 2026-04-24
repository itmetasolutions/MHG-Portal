import { spawnSync } from "node:child_process";
import { readdirSync, chmodSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// Deployment environments (e.g. cPanel, zip-extracted builds) often strip execute
// permissions from binaries. Restore +x on all Prisma engine binaries before use.
if (process.platform !== "win32") {
  try {
    const enginesDir = join(
      fileURLToPath(new URL(".", import.meta.url)),
      "..",
      "node_modules",
      "@prisma",
      "engines",
    );
    for (const entry of readdirSync(enginesDir)) {
      if (
        entry.startsWith("schema-engine-") ||
        entry.startsWith("query-engine-") ||
        entry.startsWith("migration-engine-") ||
        entry.startsWith("libquery_engine-")
      ) {
        try {
          chmodSync(join(enginesDir, entry), 0o755);
        } catch {
          // best-effort; ignore per-file failures
        }
      }
    }
    process.stdout.write("[migrate] Prisma engine binaries chmod +x applied.\n");
  } catch {
    // engines dir may not exist; continue
  }
}

const prismaCli = join(process.cwd(), "node_modules", "prisma", "build", "index.js");

function runPrisma(args, { allowFailure = false } = {}) {
  const result = spawnSync(process.execPath, [prismaCli, ...args], {
    encoding: "utf8",
    stdio: "pipe",
  });

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);

  if (result.error) throw result.error;
  const exitCode = result.status ?? 1;
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;

  if (exitCode !== 0 && !allowFailure) {
    const error = new Error(`prisma ${args.join(" ")} failed with exit code ${exitCode}`);
    error.output = output;
    throw error;
  }

  return { exitCode, output };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Neon pooled connections don't support advisory locks required by Prisma Migrate.
// Override DATABASE_URL with the direct (non-pooled) URL for migrations.
if (process.env.DIRECT_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL;
  process.stdout.write("[migrate] Using DIRECT_URL for migrations (non-pooled connection).\n");
}

const retriesRaw = Number.parseInt(process.env.PRISMA_MIGRATE_DEPLOY_RETRIES ?? "5", 10);
const delayRaw = Number.parseInt(process.env.PRISMA_MIGRATE_DEPLOY_DELAY_MS ?? "15000", 10);
const maxRetries = Number.isFinite(retriesRaw) && retriesRaw > 0 ? retriesRaw : 5;
const retryDelayMs = Number.isFinite(delayRaw) && delayRaw > 0 ? delayRaw : 15000;

runPrisma(["migrate", "resolve", "--rolled-back", "20260227000000_rooms_passive_multi_vacancy"], {
  allowFailure: true,
});
runPrisma(["migrate", "resolve", "--rolled-back", "20260228000000_property_status_simplify"], {
  allowFailure: true,
});

for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
  const { exitCode, output } = runPrisma(["migrate", "deploy"], { allowFailure: true });
  if (exitCode === 0) {
    process.stdout.write(`[migrate] prisma migrate deploy succeeded on attempt ${attempt}/${maxRetries}.\n`);
    process.exit(0);
  }

  const retryable = /\bP1002\b/i.test(output) || /advisory lock/i.test(output) || /timed out/i.test(output);
  if (!retryable || attempt === maxRetries) {
    process.stderr.write(`[migrate] prisma migrate deploy failed on attempt ${attempt}/${maxRetries}.\n`);
    process.exit(exitCode);
  }

  process.stderr.write(
    `[migrate] advisory lock timeout (attempt ${attempt}/${maxRetries}); retrying in ${retryDelayMs}ms...\n`,
  );
  await sleep(retryDelayMs);
}
