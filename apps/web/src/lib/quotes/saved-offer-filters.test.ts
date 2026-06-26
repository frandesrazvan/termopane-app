import { QuoteStatus, QuoteVersionStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  matchesSavedOfferWorkflowFilter,
  normalizeSavedOfferFilter,
  quoteListOptionsFromSavedOfferFilter,
  savedOfferFilterFromJson,
  savedOfferFilterToSearchParams,
  savedOfferQuickFilters,
  type SavedOfferFilterRow,
} from "./saved-offer-filters";

describe("saved offer filters", () => {
  it("defines the required Romanian quick filters", () => {
    expect(savedOfferQuickFilters.map((filter) => filter.label)).toEqual([
      "Ciorne",
      "Trimise",
      "Acceptate",
      "Respinsă",
      "Expiră curând",
      "Cu PDF generat",
      "Fără calcul",
      "Cu avertizări",
    ]);
  });

  it("normalizes saved filter JSON and ignores unsupported values", () => {
    expect(
      normalizeSavedOfferFilter({
        quickFilter: "with-pdf",
        status: "NOT_A_STATUS",
        customerId: " customer-a ",
        createdFrom: "2026-06-01",
        createdTo: "invalid",
        totalMinMinor: "123.8",
      }),
    ).toEqual({
      quickFilter: "with-pdf",
      customerId: "customer-a",
      createdFrom: "2026-06-01",
      totalMinMinor: 124,
    });
    expect(savedOfferFilterFromJson(null)).toEqual({});
  });

  it("serializes filters back to query parameters", () => {
    const params = savedOfferFilterToSearchParams({
      quickFilter: "with-warnings",
      status: QuoteStatus.SENT,
      createdById: "user-a",
      totalMaxMinor: 5_000,
    });

    expect(params.toString()).toBe(
      "quickFilter=with-warnings&status=SENT&authorId=user-a&totalMaxMinor=5000",
    );
  });

  it("maps status quick filters into repository quote options", () => {
    expect(
      quoteListOptionsFromSavedOfferFilter({ quickFilter: "accepted" }),
    ).toMatchObject({
      status: QuoteStatus.ACCEPTED,
    });
  });

  it("matches workflow-only quick filters after row enrichment", () => {
    const base = row();

    expect(
      matchesSavedOfferWorkflowFilter(
        row({
          currentVersion: {
            ...base.currentVersion!,
            companySettingsSnapshot: { offerValidityDays: 6 },
          },
        }),
        { quickFilter: "expiring-soon" },
        new Date("2026-06-01T00:00:00.000Z"),
      ),
    ).toBe(true);
    expect(matchesSavedOfferWorkflowFilter(row({ documentCount: 1 }), { quickFilter: "with-pdf" })).toBe(true);
    expect(
      matchesSavedOfferWorkflowFilter(row({ hasCalculation: false }), {
        quickFilter: "without-calculation",
      }),
    ).toBe(true);
    expect(
      matchesSavedOfferWorkflowFilter(
        row({
          currentVersion: {
            ...base.currentVersion!,
            warningsSnapshot: [{ code: "missing-price" }],
          },
        }),
        { quickFilter: "with-warnings" },
      ),
    ).toBe(true);
  });

  it("applies customer-visible total range filters", () => {
    expect(
      matchesSavedOfferWorkflowFilter(row({ totalMinor: 12_000 }), {
        totalMinMinor: 10_000,
        totalMaxMinor: 13_000,
      }),
    ).toBe(true);
    expect(
      matchesSavedOfferWorkflowFilter(row({ totalMinor: 9_999 }), {
        totalMinMinor: 10_000,
      }),
    ).toBe(false);
  });
});

function row(
  overrides: Partial<
    SavedOfferFilterRow & {
      totalMinor: number;
    }
  > = {},
): SavedOfferFilterRow {
  const currentVersion = overrides.currentVersion ?? {
    status: QuoteVersionStatus.SENT,
    createdAt: new Date("2026-06-01T00:00:00.000Z"),
    lockedAt: null,
    sentAt: null,
    companySettingsSnapshot: { offerValidityDays: 30 },
    warningsSnapshot: [],
    totalMinor: overrides.totalMinor ?? 10_000,
  };

  return {
    quote: overrides.quote ?? { status: QuoteStatus.SENT },
    currentVersion,
    documentCount: overrides.documentCount ?? 0,
    hasCalculation: overrides.hasCalculation ?? true,
    calculationWarningCount: overrides.calculationWarningCount ?? 0,
  };
}
