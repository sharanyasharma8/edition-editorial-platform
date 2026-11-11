/** Allow only configured image origins plus safe local media-library paths. */
export function isAllowedEditorialImageUrl(value: string): boolean {
  const candidate = value.trim();
  if (!candidate) return true;

  if (candidate.startsWith("/api/media/") || candidate.startsWith("/uploads/")) {
    try {
      const decoded = decodeURIComponent(candidate);
      const generatedMediaPath = /^\/api\/media\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(?:jpg|png|webp)$/i;
      const legacyUploadPath = /^\/uploads\/[a-z0-9][a-z0-9._-]*\.(?:jpe?g|png|webp)$/i;
      return generatedMediaPath.test(decoded) || legacyUploadPath.test(decoded);
    } catch {
      return false;
    }
  }

  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:" || url.username || url.password) return false;
    const hostname = url.hostname.toLowerCase();
    return hostname === "images.unsplash.com" || hostname.endsWith(".cloudfront.net");
  } catch {
    return false;
  }
}
