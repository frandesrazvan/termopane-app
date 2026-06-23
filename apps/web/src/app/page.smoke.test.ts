import { describe, expect, it } from "vitest";
import Home from "./page";

describe("home dashboard smoke test", () => {
  it("loads the dashboard route module", () => {
    expect(Home).toBeTypeOf("function");
  });
});
