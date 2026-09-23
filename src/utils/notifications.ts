/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Safe notification service interface.
 * Real-time notifications in Stalk are powered by Socket.io and rendered
 * through InAppNotificationBanner and FloatingChatHead, avoiding the need
 * for unconfigured native Firebase / push daemon background crashes.
 */

export const setupNotificationChannels = async (): Promise<boolean> => {
  return true;
};

export interface LocalNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
  channelId?: "default" | "messages";
}

/**
 * Triggers notification presentation.
 * In-app banners and sounds are handled by InAppNotificationBanner and FloatingChatHead.
 */
export const presentSystemNotification = async ({
  title,
  body,
  data = {},
  channelId = "default",
}: LocalNotificationPayload): Promise<void> => {
  // Safe no-op without requiring native FCM / Firebase configuration
};

/**
 * Subscribes to notification responses safely.
 */
export const addNotificationResponseListener = (
  handler: (data: Record<string, any>) => void
): (() => void) => {
  return () => {};
};
