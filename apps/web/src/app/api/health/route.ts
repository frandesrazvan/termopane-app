import { NextResponse } from "next/server";
import { runHealthCheck } from "@/lib/health/health-check";
import { logger } from "@/lib/logging/safe-logger";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await runHealthCheck({
    async pingDatabase() {
      await prisma.$queryRaw`SELECT 1`;
    },
  });
  const status = result.status === "ok" ? 200 : 503;

  logger.info("health.check", {
    status: result.status,
    checks: result.checks.map((check) => ({
      check: check.name,
      status: check.status,
      issueCodes: check.issueCodes ?? [],
    })),
  });

  return NextResponse.json(result, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
