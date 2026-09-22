import { ENV } from "../config/env";

/**
 * Normalizes any media/image URL.
 * Replaces localhost or 127.0.0.1 with the actual server IP (ENV.API_BASE_URL)
 * and prefixes relative paths (/uploads/...) with ENV.API_BASE_URL.
 */
export function getMediaUrl(url?: string | null): string {
  if (!url) return "";

  let cleaned = url.trim();

  // If already a valid web/cloud URL (cloudinary, unsplash, etc.), return as is
  if (
    cleaned.startsWith("https://res.cloudinary.com") ||
    cleaned.startsWith("https://images.unsplash.com")
  ) {
    return cleaned;
  }

  // Handle localhost / 127.0.0.1 from local server
  if (
    cleaned.startsWith("http://localhost:6969") ||
    cleaned.startsWith("http://127.0.0.1:6969")
  ) {
    return cleaned.replace(/^http:\/\/(localhost|127\.0\.0\.1):6969/, ENV.API_BASE_URL);
  }

  // Handle relative upload paths (e.g. "/uploads/username/...")
  if (cleaned.startsWith("/uploads") || cleaned.startsWith("uploads/")) {
    const rel = cleaned.startsWith("/") ? cleaned : `/${cleaned}`;
    return `${ENV.API_BASE_URL}${rel}`;
  }

  return cleaned;
}
