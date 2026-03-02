import { spawnSync } from "node:child_process";

const npxCmd = process.platform === "win32" ? "npx.cmd" : "npx";

function runPrisma(args, { allowFailure = false } = {}) {
  const result = spawnSync(npxCmd, ["prisma", ...args], {
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
