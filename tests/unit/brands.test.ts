import { describe, expect, it } from "vitest";
import { getPublication, isBrandSlug, PUBLICATIONS } from "@/lib/brands";

describe("publication configuration", () => {
  it("exposes two distinct publication identities", () => {
    expect(PUBLICATIONS.edit.name).toBe("THE EDIT");
    expect(PUBLICATIONS.form.name).toBe("FORM");
    expect(PUBLICATIONS.edit.categories).not.toEqual(PUBLICATIONS.form.categories);
  });
  it("validates brand routes without falling back silently", () => {
    expect(isBrandSlug("edit")).toBe(true);
    expect(isBrandSlug("form")).toBe(true);
    expect(isBrandSlug("vogue")).toBe(false);
    expect(getPublication("unknown")).toBeNull();
  });
});
