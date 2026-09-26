import { ENV } from "../config/env";

export const DEFAULT_AVATAR =
  "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png";

export const DEFAULT_COVER =
  "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1200";

export const DEFAULT_GROUP_AVATAR =
  "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150";

/**
 * Normalizes any media/image URL.
 * Replaces localhost or 127.0.0.1 with the actual server IP (ENV.API_BASE_URL)
 * and prefixes relative paths (/uploads/...) with ENV.API_BASE_URL.
 */
export function getMediaUrl(url?: string | null): string {
  if (!url || !url.trim()) return "";

  let cleaned = url.trim();

  // If already a valid web/cloud URL (cloudinary, unsplash, pixabay, etc.), return as is
  if (
    cleaned.startsWith("https://") ||
    cleaned.startsWith("http://")
  ) {
    if (
      cleaned.startsWith("http://localhost:6969") ||
      cleaned.startsWith("http://127.0.0.1:6969")
    ) {
      return cleaned.replace(/^http:\/\/(localhost|127\.0\.0\.1):6969/, ENV.API_BASE_URL);
    }
    return cleaned;
  }

  // Handle relative upload paths (e.g. "/uploads/username/...")
  if (cleaned.startsWith("/uploads") || cleaned.startsWith("uploads/")) {
    const rel = cleaned.startsWith("/") ? cleaned : `/${cleaned}`;
    return `${ENV.API_BASE_URL}${rel}`;
  }

  return cleaned;
}
