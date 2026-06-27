import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DocumentType, PrismaClient } from "@prisma/client";
import { runtimeEnvironmentIssues } from "../apps/web/src/lib/env/runtime";
import {
  isDocumentStorageError,
  type DocumentStorageProvider,
} from "../apps/web/src/lib/pdf/document-storage";
import { createConfiguredDocumentStorageProvider } from "../apps/web/src/lib/pdf/document-storage-provider";
import { buildQuotePdf, type QuotePdfOfferSnapshot } from "../packages/pdf/src/index";

export type PilotSmokeStatus = "ok" | "warn" | "skip" | "fail";

export type PilotSmokeCheckResult = Readonly<{
  name: string;
  status: PilotSmokeStatus;
  detail: string;
  issueCodes?: readonly string[];
}>;

export type SeedPresenceCounts = Readonly<{
  activeMemberships: number;
  tenants: number;
  users: number;
}>;

export const defaultSyntheticSmokeTenantId = "seed_tenant_synthetic_termopane";
export const defaultSyntheticSmokeQuoteNumber = "SYN-0001";

type FetchLike = (input: string, init?: { cache?: "no-store" }) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}>;

export function smokeEnvironmentIssueCodes(env: NodeJS.ProcessEnv = process.env) {
  const codes = runtimeEnvironmentIssues(env).map((issue) => issue.code);

  if (!env.DATABASE_URL?.trim() && !codes.includes("database_url_missing")) {
    codes.push("smoke_database_url_missing");
  }

  return codes;
}

export function validateSmokeEnvironment(
  env: NodeJS.ProcessEnv = process.env,
): PilotSmokeCheckResult {
  const issueCodes = smokeEnvironmentIssueCodes(env);

  if (issueCodes.length > 0) {
    return {
      name: "runtime-config",
      status: "fail",
      detail: "Required smoke-test environment is missing or unsafe.",
      issueCodes,
    };
  }

  return {
    name: "runtime-config",
    status: "ok",
    detail: "Runtime environment passed production safety validation for this smoke run.",
  };
}

export function healthUrlFromBaseUrl(baseUrl: string | undefined) {
  const trimmed = baseUrl?.trim();

  if (!trimmed) {
    return { ok: true as const, url: null };
  }

  try {
    const url = new URL("/api/health", trimmed);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return { ok: false as const, reason: "base_url_protocol" };
    }

    return { ok: true as const, url: url.toString() };
  } catch {
    return { ok: false as const, reason: "base_url_invalid" };
  }
}

export function summarizeHealthPayload(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return {
      status: "unknown",
      issueCodes: ["health_payload_invalid"],
    };
  }

  const record = payload as {
    status?: unknown;
    checks?: readonly { issueCodes?: readonly unknown[] }[];
  };
  const issueCodes = Array.isArray(record.checks)
    ? record.checks.flatMap((check) =>
        Array.isArray(check.issueCodes)
          ? check.issueCodes.filter((code): code is string => typeof code === "string")
          : [],
      )
    : [];

  return {
    status: typeof record.status === "string" ? record.status : "unknown",
    issueCodes,
  };
}

export function seedPresenceResult(counts: SeedPresenceCounts): PilotSmokeCheckResult {
  const missing: string[] = [];

  if (counts.tenants < 1) {
    missing.push("tenant");
  }

  if (counts.users < 1) {
    missing.push("user");
  }

  if (counts.activeMemberships < 1) {
    missing.push("active_tenant_member");
  }

  if (missing.length > 0) {
    return {
      name: "tenant-user-presence",
      status: "fail",
      detail: "Database does not contain the minimum tenant/user bootstrap records.",
      issueCodes: missing.map((name) => `missing_${name}`),
    };
  }

  return {
    name: "tenant-user-presence",
    status: "ok",
    detail: `Found ${counts.tenants} tenant(s), ${counts.users} user(s), and ${counts.activeMemberships} active tenant membership(s).`,
  };
}

export function buildSyntheticSmokeStorageKey(now = new Date(), nonce = randomUUID()) {
  const datePart = now.toISOString().slice(0, 10);
  const safeNonce = nonce.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 80) || "object";

  return `smoke-tests/pilot-deployment/${datePart}/${safeNonce}.pdf`;
}

export function isPdfLike(bytes: Uint8Array) {
  return new TextDecoder().decode(bytes.slice(0, 8)).startsWith("%PDF-");
}

export function syntheticQuotePdfSnapshot(now = new Date()): QuotePdfOfferSnapshot {
  return {
    templateKey: "template-a",
    locale: "ro",
    quote: {
      quoteNumber: "SMOKE-0001",
      versionNumber: 1,
      versionStatus: "LOCKED",
      quoteTitle: "Synthetic pilot smoke quote",
      currency: "RON",
      issueDateIso: now.toISOString(),
    },
    company: {
      displayName: "Synthetic Smoke Company",
    },
    customer: {
      displayName: "Synthetic Smoke Customer",
    },
    items: [
      {
        id: "smoke-item-1",
        sortOrder: 1,
        itemTypeLabel: "Synthetic item",
        customerDescription: "Synthetic fixed-window PDF smoke item",
        quantity: 1,
        widthMm: 1000,
        heightMm: 1200,
        subtotalMinor: 10000,
        vatMinor: 1900,
        totalMinor: 11900,
      },
    ],
    totals: {
      subtotalMinor: 10000,
      vatMinor: 1900,
      totalMinor: 11900,
      currency: "RON",
    },
    isDraft: false,
  };
}

export async function runHealthEndpointCheck(
  env: NodeJS.ProcessEnv = process.env,
  fetchImpl: FetchLike = fetch,
): Promise<PilotSmokeCheckResult> {
  const healthUrl = healthUrlFromBaseUrl(env.BASE_URL);

  if (!healthUrl.ok) {
    return {
      name: "http-health",
      status: "fail",
      detail: "BASE_URL is configured but is not a valid http(s) URL.",
      issueCodes: [healthUrl.reason],
    };
  }

  if (!healthUrl.url) {
    return {
      name: "http-health",
      status: "skip",
      detail: "BASE_URL is not configured, so /api/health was not called.",
    };
  }

  try {
    const response = await fetchImpl(healthUrl.url, { cache: "no-store" });
    const summary = summarizeHealthPayload(await response.json());

    if (response.ok && summary.status === "ok") {
      return {
        name: "http-health",
        status: "ok",
        detail: "/api/health returned ok.",
      };
    }

    return {
      name: "http-health",
      status: "fail",
      detail: `/api/health returned status ${response.status} with service status ${summary.status}.`,
      issueCodes: summary.issueCodes,
    };
  } catch {
    return {
      name: "http-health",
      status: "fail",
      detail: "/api/health could not be reached or did not return valid JSON.",
      issueCodes: ["health_unavailable"],
    };
  }
}

export async function runStorageProviderCheck(
  provider: DocumentStorageProvider = createConfiguredDocumentStorageProvider(),
): Promise<PilotSmokeCheckResult> {
  const storageKey = buildSyntheticSmokeStorageKey();
  const bytes = new TextEncoder().encode("%PDF-1.4\n% Synthetic Termopane pilot smoke test\n");
  let storedStorageKey: string | null = null;

  try {
    const putResult = await provider.put({
      storageKey,
      bytes,
      contentType: "application/pdf",
      metadata: {
        purpose: "pilot-smoke-test",
        pii: "none",
      },
    });

    storedStorageKey = putResult.storageKey;
    const readBytes = await provider.get(storedStorageKey);

    if (!sameBytes(bytes, readBytes)) {
      return {
        name: "document-storage",
        status: "fail",
        detail: "Synthetic object read did not match the bytes written.",
        issueCodes: ["storage_round_trip_mismatch"],
      };
    }

    await provider.delete(storedStorageKey);
    storedStorageKey = null;

    return {
      name: "document-storage",
      status: "ok",
      detail: `Synthetic write/read/delete passed for provider ${provider.kind}.`,
    };
  } catch (error) {
    return {
      name: "document-storage",
      status: "fail",
      detail: "Synthetic document storage round trip failed.",
      issueCodes: [
        isDocumentStorageError(error) ? `storage_${error.code}` : "storage_unavailable",
      ],
    };
  } finally {
    if (storedStorageKey) {
      try {
        await provider.delete(storedStorageKey);
      } catch {
        // The failed check above is the actionable signal; avoid printing provider errors.
      }
    }
  }
}

export async function runDatabaseConnectionCheck(
  prisma: PrismaClient,
): Promise<PilotSmokeCheckResult> {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return {
      name: "database-connection",
      status: "ok",
      detail: "Prisma database connection succeeded.",
    };
  } catch {
    return {
      name: "database-connection",
      status: "fail",
      detail: "Prisma database connection failed.",
      issueCodes: ["database_unavailable"],
    };
  }
}

export async function runTenantUserPresenceCheck(
  prisma: PrismaClient,
): Promise<PilotSmokeCheckResult> {
  try {
    return seedPresenceResult({
      activeMemberships: await prisma.tenantMember.count({
        where: { status: "ACTIVE" },
      }),
      tenants: await prisma.tenant.count(),
      users: await prisma.user.count(),
    });
  } catch {
    return {
      name: "tenant-user-presence",
      status: "fail",
      detail: "Tenant/user bootstrap records could not be checked.",
      issueCodes: ["tenant_user_presence_unavailable"],
    };
  }
}

export function runSyntheticPdfRenderCheck(): PilotSmokeCheckResult {
  try {
    const pdfBytes = buildQuotePdf(syntheticQuotePdfSnapshot());

    if (!isPdfLike(pdfBytes)) {
      return {
        name: "synthetic-pdf-render",
        status: "fail",
        detail: "Synthetic quote PDF render did not produce PDF-like bytes.",
        issueCodes: ["synthetic_pdf_invalid"],
      };
    }

    return {
      name: "synthetic-pdf-render",
      status: "ok",
      detail: "Synthetic quote PDF rendered in memory.",
    };
  } catch {
    return {
      name: "synthetic-pdf-render",
      status: "fail",
      detail: "Synthetic quote PDF render failed.",
      issueCodes: ["synthetic_pdf_render_failed"],
    };
  }
}

export async function runSyntheticQuoteMetadataCheck(
  prisma: PrismaClient,
  env: NodeJS.ProcessEnv = process.env,
): Promise<PilotSmokeCheckResult> {
  const tenantId = env.PILOT_SMOKE_SYNTHETIC_TENANT_ID?.trim() || defaultSyntheticSmokeTenantId;
  const quoteNumber =
    env.PILOT_SMOKE_SYNTHETIC_QUOTE_NUMBER?.trim() || defaultSyntheticSmokeQuoteNumber;

  try {
    const quote = await prisma.quote.findFirst({
      where: { tenantId, quoteNumber },
      select: { currentVersionId: true, id: true },
    });

    if (!quote) {
      return {
        name: "synthetic-quote-metadata",
        status: "skip",
        detail: "Configured synthetic quote was not present; no quote records were created.",
      };
    }

    if (!quote.currentVersionId) {
      return {
        name: "synthetic-quote-metadata",
        status: "fail",
        detail: "Synthetic quote exists but has no current version.",
        issueCodes: ["synthetic_quote_current_version_missing"],
      };
    }

    const quoteVersion = await prisma.quoteVersion.findFirst({
      where: {
        id: quote.currentVersionId,
        quoteId: quote.id,
        tenantId,
      },
      select: { id: true },
    });

    if (!quoteVersion) {
      return {
        name: "synthetic-quote-metadata",
        status: "fail",
        detail: "Synthetic quote current version was not tenant-scoped correctly.",
        issueCodes: ["synthetic_quote_version_missing"],
      };
    }

    const [itemCount, documentCount] = await Promise.all([
      prisma.quoteItem.count({
        where: {
          quoteVersionId: quoteVersion.id,
          tenantId,
        },
      }),
      prisma.document.count({
        where: {
          quoteVersionId: quoteVersion.id,
          tenantId,
          type: DocumentType.QUOTE_PDF,
        },
      }),
    ]);

    if (itemCount < 1 || documentCount < 1) {
      return {
        name: "synthetic-quote-metadata",
        status: "fail",
        detail: "Synthetic quote is missing quote item or PDF document metadata.",
        issueCodes: [
          ...(itemCount < 1 ? ["synthetic_quote_item_missing"] : []),
          ...(documentCount < 1 ? ["synthetic_quote_pdf_metadata_missing"] : []),
        ],
      };
    }

    return {
      name: "synthetic-quote-metadata",
      status: "ok",
      detail: "Synthetic quote, version, item, and PDF document metadata are present.",
    };
  } catch {
    return {
      name: "synthetic-quote-metadata",
      status: "fail",
      detail: "Synthetic quote metadata check failed.",
      issueCodes: ["synthetic_quote_metadata_unavailable"],
    };
  }
}

export async function runPilotSmokeChecks(
  options: {
    env?: NodeJS.ProcessEnv;
    fetchImpl?: FetchLike;
    prisma?: PrismaClient;
    storageProvider?: DocumentStorageProvider;
  } = {},
): Promise<PilotSmokeCheckResult[]> {
  const env = options.env ?? process.env;
  const checks: PilotSmokeCheckResult[] = [validateSmokeEnvironment(env)];

  if (checks[0]?.status === "fail") {
    checks.push(
      {
        name: "http-health",
        status: "skip",
        detail: "Skipped until runtime-config issues are fixed.",
      },
      {
        name: "document-storage",
        status: "skip",
        detail: "Skipped until runtime-config issues are fixed.",
      },
      {
        name: "database-connection",
        status: "skip",
        detail: "Skipped until runtime-config issues are fixed.",
      },
      {
        name: "tenant-user-presence",
        status: "skip",
        detail: "Skipped until runtime-config issues are fixed.",
      },
      runSyntheticPdfRenderCheck(),
      {
        name: "synthetic-quote-metadata",
        status: "skip",
        detail: "Skipped until runtime-config issues are fixed.",
      },
    );

    return checks;
  }

  const prisma = options.prisma ?? new PrismaClient();
  const ownsPrisma = !options.prisma;

  try {
    checks.push(await runHealthEndpointCheck(env, options.fetchImpl ?? fetch));
    checks.push(
      await runStorageProviderCheck(
        options.storageProvider ?? createConfiguredDocumentStorageProvider({ env }),
      ),
    );

    const databaseCheck = await runDatabaseConnectionCheck(prisma);
    checks.push(databaseCheck);

    if (databaseCheck.status === "ok") {
      checks.push(await runTenantUserPresenceCheck(prisma));
      checks.push(runSyntheticPdfRenderCheck());
      checks.push(await runSyntheticQuoteMetadataCheck(prisma, env));
    } else {
      checks.push(
        {
          name: "tenant-user-presence",
          status: "skip",
          detail: "Skipped because database connection failed.",
        },
        runSyntheticPdfRenderCheck(),
        {
          name: "synthetic-quote-metadata",
          status: "skip",
          detail: "Skipped because database connection failed.",
        },
      );
    }
  } finally {
    if (ownsPrisma) {
      await prisma.$disconnect();
    }
  }

  return checks;
}

async function main() {
  const checks = await runPilotSmokeChecks();
  const hasFailure = checks.some((check) => check.status === "fail");

  console.info("Pilot deployment smoke test");

  for (const check of checks) {
    const issueSuffix = check.issueCodes?.length
      ? ` (${check.issueCodes.join(", ")})`
      : "";

    console.info(`[${check.status}] ${check.name}: ${check.detail}${issueSuffix}`);
  }

  process.exitCode = hasFailure ? 1 : 0;
}

function sameBytes(left: Uint8Array, right: Uint8Array) {
  if (left.byteLength !== right.byteLength) {
    return false;
  }

  return left.every((value, index) => value === right[index]);
}

function isDirectlyExecuted() {
  const entrypoint = process.argv[1];

  return Boolean(
    entrypoint && fileURLToPath(import.meta.url) === path.resolve(entrypoint),
  );
}

if (isDirectlyExecuted()) {
  main().catch((error: unknown) => {
    const issueCodes =
      error && typeof error === "object" && "issues" in error
        ? (error as { issues?: readonly { code?: string }[] }).issues
            ?.map((issue) => issue.code)
            .filter((code): code is string => Boolean(code)) ?? []
        : [];

    console.error(
      `Pilot deployment smoke test failed unexpectedly${
        issueCodes.length ? ` (${issueCodes.join(", ")})` : ""
      }.`,
    );
    process.exitCode = 1;
  });
}
