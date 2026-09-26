import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import {
  ArrowLeft,
  Bell,
  Heart,
  MessageSquare,
  UserPlus,
  CheckCheck,
  MessageCircle,
} from "lucide-react-native";
import { apiClient } from "../services/api.client";
import { getMediaUrl, DEFAULT_AVATAR } from "../utils/media";

function formatRelativeTime(dateString?: string | Date | null): string {
  if (!dateString) return "";
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function NotificationsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  const {
    data: notifications,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await apiClient.get<{ success: boolean; data: any[] }>("/notifications");
      return res.data.data;
    },
  });

  const handlePressNotification = async (item: any) => {
    Haptics.selectionAsync();

    // Mark single notification as read
    if (!item.isRead) {
      try {
        apiClient.patch(`/notifications/${item.id}/read`).catch(() => {});
        queryClient.setQueryData(["notifications"], (old: any[] | undefined) => {
          if (!old) return [];
          return old.map((n) => (n.id === item.id ? { ...n, isRead: true } : n));
        });
        queryClient.invalidateQueries({ queryKey: ["unreadNotificationsCount"] });
      } catch {}
    }

    // Smart routing based on notification payload
    const postId = item.postId || item.data?.postId;
    const actorId = item.actorId || item.actor?.id || item.data?.actorId;
    const actorUsername = item.actor?.username || item.data?.actorUsername;
    const notifType = (item.type || "").toLowerCase();

    if (postId) {
      router.push(`/post/${postId}` as any);
    } else if (notifType.includes("message") && actorId) {
      router.push(`/chat/${actorId}` as any);
    } else if (actorUsername) {
      router.push(`/s/${actorUsername}` as any);
    } else if (actorId) {
      router.push(`/s/${actorId}` as any);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setIsMarkingAll(true);
      await apiClient.patch("/notifications/read-all");
      queryClient.setQueryData(["notifications"], (old: any[] | undefined) => {
        if (!old) return [];
        return old.map((n) => ({ ...n, isRead: true }));
      });
      queryClient.invalidateQueries({ queryKey: ["unreadNotificationsCount"] });
    } catch {
    } finally {
      setIsMarkingAll(false);
    }
  };

  const renderBadgeIcon = (item: any) => {
    const type = (item.type || "").toLowerCase();
    const msg = (item.message || "").toLowerCase();

    if (type.includes("like") || msg.includes("like")) {
      return (
        <View style={[styles.badgeIcon, { backgroundColor: "#EF4444" }]}>
          <Heart size={11} color="#FFFFFF" fill="#FFFFFF" />
        </View>
      );
    }
    if (type.includes("comment") || msg.includes("comment")) {
      return (
        <View style={[styles.badgeIcon, { backgroundColor: "#10B981" }]}>
          <MessageSquare size={11} color="#FFFFFF" />
        </View>
      );
    }
    if (type.includes("follow") || type.includes("friend") || msg.includes("follow") || msg.includes("friend")) {
      return (
        <View style={[styles.badgeIcon, { backgroundColor: "#3B82F6" }]}>
          <UserPlus size={11} color="#FFFFFF" />
        </View>
      );
    }
    if (type.includes("message") || msg.includes("message")) {
      return (
        <View style={[styles.badgeIcon, { backgroundColor: "#0A7CFF" }]}>
          <MessageCircle size={11} color="#FFFFFF" />
        </View>
      );
    }
    return (
      <View style={[styles.badgeIcon, { backgroundColor: "#64748B" }]}>
        <Bell size={11} color="#FFFFFF" />
      </View>
    );
  };

  const hasUnread = notifications?.some((n: any) => !n.isRead);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color="#0F172A" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Notifications</Text>

        {hasUnread ? (
          <TouchableOpacity
            style={styles.markAllBtn}
            onPress={handleMarkAllAsRead}
            disabled={isMarkingAll}
            activeOpacity={0.7}
          >
            {isMarkingAll ? (
              <ActivityIndicator size="small" color="#3B82F6" />
            ) : (
              <CheckCheck size={20} color="#3B82F6" />
            )}
          </TouchableOpacity>
        ) : (
          <View style={{ width: 38 }} />
        )}
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      ) : (
        <FlatList
          data={notifications || []}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#3B82F6"
              colors={["#3B82F6"]}
            />
          }
          renderItem={({ item }) => {
            const avatar =
              getMediaUrl(item.actor?.profilePicUrl || item.actor?.avatar) ||
              DEFAULT_AVATAR;

            return (
              <TouchableOpacity
                style={[styles.notifItem, !item.isRead && styles.unreadNotif]}
                activeOpacity={0.75}
                onPress={() => handlePressNotification(item)}
              >
                {/* Avatar with Badge */}
                <View style={styles.avatarContainer}>
                  <Image source={{ uri: avatar }} style={styles.notifAvatar} contentFit="cover" />
                  {renderBadgeIcon(item)}
                </View>

                {/* Notification Text and Time */}
                <View style={styles.notifInfo}>
                  <Text
                    style={[styles.notifMsg, !item.isRead && styles.unreadText]}
                    numberOfLines={3}
                  >
                    {item.message}
                  </Text>
                  <Text style={styles.notifTime}>{formatRelativeTime(item.createdAt)}</Text>
                </View>

                {/* Unread Blue Dot */}
                {!item.isRead && <View style={styles.unreadDot} />}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Bell size={36} color="#94A3B8" />
              </View>
              <Text style={styles.emptyTitle}>No notifications yet</Text>
              <Text style={styles.emptySubtitle}>
                When you get likes, comments, or new followers, they'll show up here.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    height: 56,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
  },
  markAllBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EFF6FF",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    color: "#64748B",
    fontSize: 14,
    fontWeight: "500",
  },
  notifItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  unreadNotif: {
    backgroundColor: "#F0F7FF",
  },
  avatarContainer: {
    position: "relative",
    width: 48,
    height: 48,
  },
  notifAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#E2E8F0",
  },
  badgeIcon: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  notifInfo: {
    flex: 1,
    marginLeft: 14,
    marginRight: 8,
  },
  notifMsg: {
    fontSize: 14,
    color: "#334155",
    lineHeight: 20,
  },
  unreadText: {
    color: "#0F172A",
    fontWeight: "600",
  },
  notifTime: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 4,
    fontWeight: "500",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#3B82F6",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 100,
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 20,
  },
});
