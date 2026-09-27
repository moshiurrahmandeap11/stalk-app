/**
 * Formats user's last active status in Messenger style.
 * e.g. "Active now", "Active 5m ago", "Active 2h ago", "Active yesterday"
 */
export function formatLastActive(
  lastActiveAt?: string | Date | null,
  isOnline?: boolean
): string {
  if (isOnline) {
    return "Active now";
  }
  if (!lastActiveAt) {
    return "";
  }

  const date = typeof lastActiveAt === "string" ? new Date(lastActiveAt) : lastActiveAt;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  if (isNaN(diffMs) || diffMs < 0) {
    return "";
  }

  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return "Active just now";
  }
  if (diffMinutes < 60) {
    return `Active ${diffMinutes}m ago`;
  }
  if (diffHours < 24) {
    return `Active ${diffHours}h ago`;
  }
  if (diffDays === 1) {
    return "Active yesterday";
  }
  if (diffDays < 7) {
    return `Active ${diffDays}d ago`;
  }
  return `Active ${date.toLocaleDateString()}`;
}
