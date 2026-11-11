import { describe, expect, it } from "vitest";
import { isAllowedEditorialImageUrl } from "@/lib/image-url";

describe("editorial image URL allow-list", () => {
  it("accepts generated local media routes and approved HTTPS image hosts", () => {
    expect(isAllowedEditorialImageUrl("/api/media/550e8400-e29b-41d4-a716-446655440000.webp")).toBe(true);
    expect(isAllowedEditorialImageUrl("/uploads/legacy-asset.webp")).toBe(true);
    expect(isAllowedEditorialImageUrl("https://images.unsplash.com/photo-123?w=1200")).toBe(true);
    expect(isAllowedEditorialImageUrl("https://d123456789.cloudfront.net/editorial/photo.webp")).toBe(true);
    expect(isAllowedEditorialImageUrl("")).toBe(true);
  });

  it("rejects unconfigured hosts, insecure URLs and credential-bearing URLs", () => {
    expect(isAllowedEditorialImageUrl("https://example.com/photo.jpg")).toBe(false);
    expect(isAllowedEditorialImageUrl("https://images.unsplash.com.evil.test/photo.jpg")).toBe(false);
    expect(isAllowedEditorialImageUrl("https://user:password@images.unsplash.com/photo.jpg")).toBe(false);
    expect(isAllowedEditorialImageUrl("http://images.unsplash.com/photo.jpg")).toBe(false);
  });

  it("rejects local traversal and URL suffixes from upload paths", () => {
    expect(isAllowedEditorialImageUrl("/uploads/../private.jpg")).toBe(false);
    expect(isAllowedEditorialImageUrl("/uploads/%2e%2e/private.jpg")).toBe(false);
    expect(isAllowedEditorialImageUrl("/api/media/../secret")).toBe(false);
    expect(isAllowedEditorialImageUrl("/api/media/asset.webp?redirect=https://example.com")).toBe(false);
    expect(isAllowedEditorialImageUrl("/api/media/asset.webp#fragment")).toBe(false);
    expect(isAllowedEditorialImageUrl("/api/media/not-a-generated-filename.webp")).toBe(false);
    expect(isAllowedEditorialImageUrl("/api/media/123e4567-e89b-12d3-a456-426614174000.svg")).toBe(false);
    expect(isAllowedEditorialImageUrl("/api/media/%2e%2e%2fsecret.jpg")).toBe(false);
  });
});
