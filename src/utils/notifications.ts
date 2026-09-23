import { Platform } from "react-native";

// Safely obtain expo-notifications to prevent Expo Go SDK 53+ top-level crash
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Notifications: any = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Notifications = require("expo-notifications");
  if (Notifications?.setNotificationHandler) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
        priority: Notifications.AndroidNotificationPriority?.MAX ?? 5,
      }),
    });
  }
} catch (err) {
  console.warn("[Notifications] expo-notifications unavailable in current runtime:", err);
}

export const setupNotificationChannels = async () => {
  if (!Notifications) return false;

  if (Platform.OS === "android") {
    try {
      if (Notifications.setNotificationChannelAsync) {
        await Notifications.setNotificationChannelAsync("default", {
          name: "General Notifications",
          importance: Notifications.AndroidImportance?.MAX ?? 5,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#3B82F6",
          sound: "default",
          enableVibrate: true,
        });

        await Notifications.setNotificationChannelAsync("messages", {
          name: "Direct Messages",
          importance: Notifications.AndroidImportance?.MAX ?? 5,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#2563EB",
          sound: "default",
          enableVibrate: true,
        });
      }
    } catch (err) {
      console.warn("Could not set up Android notification channels:", err);
    }
  }

  // Request permissions
  try {
    if (Notifications.getPermissionsAsync) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== "granted" && Notifications.requestPermissionsAsync) {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      return finalStatus === "granted";
    }
  } catch {
    return false;
  }
  return false;
};

export interface LocalNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
  channelId?: "default" | "messages";
}

/**
 * Triggers an immediate system notification in the phone's notification bar.
 * Pops up over other apps with sound and vibration!
 */
export const presentSystemNotification = async ({
  title,
  body,
  data = {},
  channelId = "default",
}: LocalNotificationPayload) => {
  if (!Notifications?.scheduleNotificationAsync) return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: "default",
        badge: 1,
        priority: Notifications.AndroidNotificationPriority?.MAX ?? 5,
        ...(Platform.OS === "android" ? { channelId } : {}),
      },
      trigger: null, // null means present immediately
    });
  } catch (err) {
    console.warn("Failed to present system notification:", err);
  }
};

/**
 * Subscribes to notification click / tap responses safely
 */
export const addNotificationResponseListener = (
  handler: (data: Record<string, any>) => void
): (() => void) => {
  if (!Notifications?.addNotificationResponseReceivedListener) {
    return () => {};
  }
  try {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response: any) => {
        const data = response?.notification?.request?.content?.data;
        if (data) {
          handler(data);
        }
      }
    );
    return () => {
      subscription?.remove?.();
    };
  } catch (err) {
    console.warn("[Notifications] Failed to add response listener:", err);
    return () => {};
  }
};
