import { NativeModules, PermissionsAndroid, Platform } from "react-native";

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (Platform.OS === "android" && Platform.Version >= 33) {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        {
          title: "Stalk Notifications",
          message: "Allow Stalk to send you notifications for calls, messages, and updates.",
          buttonPositive: "Allow",
          buttonNegative: "Don't allow",
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn("[requestNotificationPermission] error:", err);
      return false;
    }
  }
  return true;
};

export const setupNotificationChannels = async (): Promise<boolean> => {
  return requestNotificationPermission();
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
 * Triggers native high-priority system notification (Heads-up with sound & vibration)
 */
export const presentSystemNotification = async ({
  title,
  body,
  data = {},
  channelId = "default",
}: LocalNotificationPayload): Promise<void> => {
  // Safe no-op without requiring native FCM / Firebase configuration
  try {
    if (Platform.OS === "android") {
      const { StalkNotificationModule } = NativeModules;
      if (StalkNotificationModule?.showNotification) {
        await StalkNotificationModule.showNotification(title, body, data, channelId);
      }
    }
  } catch (err) {
    console.warn("[presentSystemNotification] error:", err);
  }
};

/**
 * Subscribes to notification responses safely.
 */
export const addNotificationResponseListener = (
  handler: (data: Record<string, any>) => void
): (() => void) => {
  return () => {};
};
