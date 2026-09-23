import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  PanResponder,
  Platform,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Bell, MessageSquare, Heart, UserPlus } from "lucide-react-native";
import { useSocketStore } from "../../store/socket.store";
import { useAuthStore } from "../../store/auth.store";
import { playNotificationSound } from "../../utils/chatSounds";
import { getMediaUrl } from "../../utils/media";

interface NotificationItem {
  id?: string;
  title?: string;
  message?: string;
  type?: string;
  postId?: string;
  actor?: {
    id?: string;
    fullName?: string;
    profilePicUrl?: string;
  } | null;
}

export const InAppNotificationBanner: React.FC = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const socket = useSocketStore((s) => s.socket);

  const [notification, setNotification] = useState<NotificationItem | null>(null);
  const translateY = useSharedValue(-150);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideBanner = () => {
    translateY.value = withTiming(-150, { duration: 250 }, (finished) => {
      if (finished) {
        runOnJS(setNotification)(null);
      }
    });
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const showBanner = (data: NotificationItem) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setNotification(data);
    playNotificationSound();

    translateY.value = -150;
    translateY.value = withSpring(0, { damping: 18, stiffness: 220 });

    timeoutRef.current = setTimeout(() => {
      hideBanner();
    }, 4500);
  };

  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (data: any) => {
      showBanner(data);
    };

    const handleIncomingMessage = (msg: any) => {
      const currentUserId = useAuthStore.getState().user?.id;
      if (msg?.senderId === currentUserId) return;
      showBanner({
        id: msg?.id || String(Date.now()),
        title: msg?.senderName || "New Message",
        message:
          msg?.messageType === "image"
            ? "📷 Sent a photo"
            : msg?.messageType === "video"
            ? "🎥 Sent a video"
            : msg?.message || "Sent you a message",
        type: "message",
        postId: msg?.conversationId || msg?.senderId,
        actor: {
          id: msg?.senderId,
          fullName: msg?.senderName,
          profilePicUrl: msg?.senderAvatar || msg?.senderProfilePicture,
        },
      });
    };

    socket.on("new_notification", handleNewNotification);
    socket.on("receive_message", handleIncomingMessage);

    return () => {
      socket.off("new_notification", handleNewNotification);
      socket.off("receive_message", handleIncomingMessage);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [socket]);

  // Swipe up to dismiss
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gesture) => gesture.dy < -8,
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy < -15 || gesture.vy < -0.3) {
          hideBanner();
        }
      },
    })
  ).current;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!notification) return null;

  const actor = notification.actor;
  const avatarUri = getMediaUrl(
    actor?.profilePicUrl ||
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"
  );

  const handlePress = () => {
    Haptics.selectionAsync();
    hideBanner();
    if (notification.type === "message") {
      router.push(`/chat/${notification.postId}` as any);
    } else if (notification.postId) {
      router.push(`/post/${notification.postId}` as any);
    } else {
      router.push("/notifications" as any);
    }
  };

  const renderTypeIcon = () => {
    const type = notification.type?.toLowerCase() || "";
    if (type.includes("message")) {
      return (
        <View style={[styles.badgeIcon, { backgroundColor: "#0A7CFF" }]}>
          <MessageSquare size={10} color="#FFFFFF" />
        </View>
      );
    }
    if (type.includes("like") || type.includes("upvote")) {
      return (
        <View style={[styles.badgeIcon, { backgroundColor: "#EF4444" }]}>
          <Heart size={10} color="#FFFFFF" fill="#FFFFFF" />
        </View>
      );
    }
    if (type.includes("comment")) {
      return (
        <View style={[styles.badgeIcon, { backgroundColor: "#10B981" }]}>
          <MessageSquare size={10} color="#FFFFFF" />
        </View>
      );
    }
    if (type.includes("follow") || type.includes("friend")) {
      return (
        <View style={[styles.badgeIcon, { backgroundColor: "#3B82F6" }]}>
          <UserPlus size={10} color="#FFFFFF" />
        </View>
      );
    }
    return (
      <View style={[styles.badgeIcon, { backgroundColor: "#3B82F6" }]}>
        <Bell size={10} color="#FFFFFF" />
      </View>
    );
  };

  return (
    <Animated.View
      style={[
        styles.container,
        { top: Math.max(insets.top, 8) },
        animatedStyle,
      ]}
      {...panResponder.panHandlers}
    >
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.88}
        onPress={handlePress}
      >
        <View style={styles.avatarWrapper}>
          <Image source={{ uri: avatarUri }} style={styles.avatar} contentFit="cover" />
          {renderTypeIcon()}
        </View>

        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={1}>
            {actor?.fullName || "Notification"}
          </Text>
          <Text style={styles.message} numberOfLines={2}>
            {notification.message || "You have a new update."}
          </Text>
        </View>

        <Text style={styles.time}>just now</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 12,
    right: 12,
    zIndex: 9999,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  avatarWrapper: {
    position: "relative",
    marginRight: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E2E8F0",
  },
  badgeIcon: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  message: {
    fontSize: 13,
    color: "#475569",
    marginTop: 1,
    lineHeight: 17,
  },
  time: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "500",
    marginLeft: 8,
    alignSelf: "flex-start",
    marginTop: 2,
  },
});

