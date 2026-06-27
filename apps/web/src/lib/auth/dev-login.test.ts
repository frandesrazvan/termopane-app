import { describe, expect, it } from "vitest";
import { isSyntheticDevLoginEmail, normalizeAuthEmail } from "./dev-login";

describe("development login guards", () => {
  it("normalizes email before auth lookup", () => {
    expect(normalizeAuthEmail(" Owner@Example.Test ")).toBe("owner@example.test");
  });

  it("allows only synthetic example.test users for dev login", () => {
    expect(isSyntheticDevLoginEmail("owner@example.test")).toBe(true);
    expect(isSyntheticDevLoginEmail("owner@example.com")).toBe(false);
    expect(isSyntheticDevLoginEmail("owner@example.test.evil.test")).toBe(false);
  });
});
