import { describe, expect, it } from "vitest";
import manifest from "./manifest";

describe("PWA manifest", () => {
  it("defines installable Romanian app metadata", () => {
    const metadata = manifest();

    expect(metadata.name).toBe("Termopane App - oferte mobile");
    expect(metadata.short_name).toBe("Termopane");
    expect(metadata.lang).toBe("ro");
    expect(metadata.start_url).toBe("/dashboard");
    expect(metadata.display).toBe("standalone");
    expect(metadata.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          src: "/icons/termopane-icon.svg",
          purpose: "any",
        }),
        expect.objectContaining({
          src: "/icons/termopane-maskable.svg",
          purpose: "maskable",
        }),
      ]),
    );
  });
});
