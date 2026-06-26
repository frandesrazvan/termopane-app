import { describe, expect, it } from "vitest";
import {
  MIN_TOUCH_TARGET_PX,
  MOBILE_NAVIGATION_LABELS,
  MOBILE_QUOTE_ACTION_LABELS,
  MOBILE_STATE_LABELS,
  MOBILE_VIEWPORT_AUDIT_WIDTHS,
  isAuditedMobileViewport,
} from "./mobile-hardening";

describe("mobile hardening audit metadata", () => {
  it("tracks the requested narrow viewport audit widths", () => {
    expect(MOBILE_VIEWPORT_AUDIT_WIDTHS).toEqual([360, 390, 430]);
    expect(isAuditedMobileViewport(360)).toBe(true);
    expect(isAuditedMobileViewport(390)).toBe(true);
    expect(isAuditedMobileViewport(430)).toBe(true);
    expect(isAuditedMobileViewport(768)).toBe(false);
  });

  it("keeps persistent mobile navigation labels Romanian", () => {
    expect(MOBILE_NAVIGATION_LABELS).toEqual([
      "Panou",
      "Clienți",
      "Oferte",
      "Catalog",
    ]);
  });

  it("keeps quote actions and app states readable on touch screens", () => {
    expect(MIN_TOUCH_TARGET_PX).toBe(44);
    expect(MOBILE_QUOTE_ACTION_LABELS).toEqual(
      expect.arrayContaining([
        "Total curent",
        "Previzualizare",
        "Recalculează",
        "Generează PDF",
        "Revizie",
      ]),
    );
    expect(MOBILE_STATE_LABELS).toEqual(
      expect.arrayContaining([
        "Se încarcă spațiul de lucru",
        "Nu am putut încărca acest ecran",
      ]),
    );
  });
});
