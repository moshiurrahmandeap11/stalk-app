import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { userService } from "../services/user.service";

// Configure how notifications are presented when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data || {};
    // If it's an incoming call, always alert with sound and max priority
    const isCall = data.type === "call";

    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
      priority: isCall
        ? Notifications.AndroidNotificationPriority.MAX
        : Notifications.AndroidNotificationPriority.HIGH,
    };
  },
});

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (Platform.OS === "web") return true;

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === "granted";
  } catch (err) {
    console.warn("[requestNotificationPermission] error:", err);
    return false;
  }
};

export const setupNotificationChannels = async (): Promise<boolean> => {
  if (Platform.OS !== "android") return true;

  try {
    // 1. General notifications channel
    await Notifications.setNotificationChannelAsync("default", {
      name: "General Notifications",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#8B5CF6",
      showBadge: true,
    });

    // 2. Chat messages channel (Messenger style heads-up)
    await Notifications.setNotificationChannelAsync("messages", {
      name: "Chat Messages",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 150, 100, 150],
      lightColor: "#0084FF",
      sound: "default",
      showBadge: true,
    });

    // 3. Incoming calls channel (Full-screen intent priority & continuous ringtone)
    await Notifications.setNotificationChannelAsync("calls", {
      name: "Incoming Calls",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 1000, 500, 1000, 500, 1000],
      lightColor: "#22C55E",
      sound: "default",
      bypassDnd: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      showBadge: true,
    });

    return true;
  } catch (err) {
    console.warn("[setupNotificationChannels] error:", err);
    return false;
  }
};

/**
 * Registers device for push notifications and syncs token with backend database
 */
export const registerForPushNotificationsAsync = async (): Promise<string | null> => {
  if (Platform.OS === "web") return null;

  try {
    await setupNotificationChannels();
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) return null;

    // Get Expo push token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: "aab80e61-0ed6-42d6-bf1b-8c389cc232d3",
    });

    const pushToken = tokenData.data;

    if (pushToken) {
      // Sync with server-bdbook backend database
      await userService.updatePushToken(pushToken);
    }

    return pushToken;
  } catch (err) {
    console.warn("[registerForPushNotificationsAsync] error:", err);
    return null;
  }
};

export interface LocalNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
  channelId?: "default" | "messages" | "calls";
}

/**
 * Triggers native high-priority system notification (Heads-up with sound & vibration)
 */
export const presentSystemNotification = async ({
  title,
  body,
  data = {},
  channelId = "default",
}: LocalNotificationPayload): Promise<void> => {
  if (Platform.OS === "web") return;

  try {
    const isCall = data.type === "call" || channelId === "calls";

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: "default",
        categoryIdentifier: isCall ? "call" : undefined,
        priority: isCall
          ? Notifications.AndroidNotificationPriority.MAX
          : Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: null, // deliver immediately
    });
  } catch (err) {
    console.warn("[presentSystemNotification] error:", err);
  }
};

/**
 * Subscribes to notification taps (when user clicks on a banner or lockscreen notification)
 */
export const addNotificationResponseListener = (
  handler: (data: Record<string, any>) => void
): (() => void) => {
  if (Platform.OS === "web") return () => {};

  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data || {};
    handler(data);
  });

  return () => {
    subscription.remove();
  };
};
