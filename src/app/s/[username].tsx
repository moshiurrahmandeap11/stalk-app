import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { ArrowLeft, UserPlus, UserCheck, MessageSquare, MapPin, Globe } from "lucide-react-native";
import { userService } from "../../services/user.service";
import { useAuthStore } from "../../store/auth.store";

export default function UserProfileScreen() {
  const router = useRouter();
  const { username } = useLocalSearchParams<{ username: string }>();
  const currentUserId = useAuthStore((s) => s.user?.id);

  const { data: user, isLoading, refetch } = useQuery({
    queryKey: ["userProfile", username],
    queryFn: () => userService.getUserByUsername(username!),
    enabled: !!username,
  });

  const [isFollowing, setIsFollowing] = useState(false);
  const isMe = currentUserId === user?.id;

  const handleToggleFollow = async () => {
    if (!user) return;
    setIsFollowing((prev) => !prev);
    try {
      const res = await userService.toggleFollow(user.id);
      setIsFollowing(res.isFollowing);
      refetch();
    } catch {
      setIsFollowing((prev) => !prev);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.notFoundContainer}>
        <Text style={styles.notFoundTitle}>User Not Found</Text>
        <Text style={styles.notFoundSubtitle}>
          @{username} does not exist or has been removed.
        </Text>
        <TouchableOpacity style={styles.backHomeBtn} onPress={() => router.back()}>
          <Text style={styles.backHomeText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const avatarUri =
    user.avatar ||
    user.profilePicUrl ||
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150";

  const coverUri =
    user.coverImage ||
    user.coverPhotoUrl ||
    "https://images.unsplash.com/photo-1707343843437-caacff5cfa74?w=800";

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Cover Photo */}
        <View style={styles.coverWrapper}>
          <Image source={{ uri: coverUri }} style={styles.coverPhoto} contentFit="cover" />
          <SafeAreaView style={styles.coverOverlay} edges={["top"]}>
            <TouchableOpacity style={styles.navBackBtn} onPress={() => router.back()}>
              <ArrowLeft size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </SafeAreaView>
        </View>

        {/* Profile Card Header */}
        <View style={styles.profileHeader}>
          <Image source={{ uri: avatarUri }} style={styles.avatar} contentFit="cover" />

          {/* Action Button Row */}
          {!isMe ? (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.followBtn, isFollowing && styles.followingBtn]}
                onPress={handleToggleFollow}
              >
                {isFollowing ? (
                  <>
                    <UserCheck size={18} color="#0F172A" />
                    <Text style={styles.followingBtnText}>Following</Text>
                  </>
                ) : (
                  <>
                    <UserPlus size={18} color="#FFFFFF" />
                    <Text style={styles.followBtnText}>Follow</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.msgBtn}
                onPress={() => router.push(`/chat/${user.id}` as any)}
              >
                <MessageSquare size={18} color="#0F172A" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.actionRow}>
              <View style={styles.myBadge}>
                <Text style={styles.myBadgeText}>Your Profile</Text>
              </View>
            </View>
          )}

          {/* Name & Username */}
          <Text style={styles.fullName}>{user.fullName}</Text>
          <Text style={styles.username}>@{user.username}</Text>

          {/* Bio */}
          {user.bio ? <Text style={styles.bio}>{user.bio}</Text> : null}

          {/* Location & Website */}
          <View style={styles.metaRow}>
            {user.location ? (
              <View style={styles.metaItem}>
                <MapPin size={15} color="#64748B" />
                <Text style={styles.metaText}>{user.location}</Text>
              </View>
            ) : null}
            {user.website ? (
              <View style={styles.metaItem}>
                <Globe size={15} color="#3B82F6" />
                <Text style={[styles.metaText, { color: "#3B82F6" }]}>{user.website}</Text>
              </View>
            ) : null}
          </View>

          {/* Stats Bar */}
          <View style={styles.statsBar}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{user.followersCount || 0}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{user.followingCount || 0}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{user.friendsCount || 0}</Text>
              <Text style={styles.statLabel}>Friends</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  notFoundContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  notFoundTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0F172A",
  },
  notFoundSubtitle: {
    fontSize: 15,
    color: "#64748B",
    marginTop: 8,
    textAlign: "center",
  },
  backHomeBtn: {
    marginTop: 20,
    backgroundColor: "#3B82F6",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  backHomeText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  scrollContent: {
    paddingBottom: 40,
  },
  coverWrapper: {
    height: 180,
    width: "100%",
    backgroundColor: "#CBD5E1",
  },
  coverPhoto: {
    width: "100%",
    height: "100%",
  },
  coverOverlay: {
    position: "absolute",
    top: 12,
    left: 16,
  },
  navBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  profileHeader: {
    paddingHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
    paddingTop: 16,
    paddingBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 4,
    borderColor: "#FFFFFF",
    marginTop: -52,
    backgroundColor: "#E2E8F0",
  },
  actionRow: {
    position: "absolute",
    top: 16,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  followBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#3B82F6",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  followBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  followingBtn: {
    backgroundColor: "#E2E8F0",
  },
  followingBtnText: {
    color: "#0F172A",
    fontWeight: "700",
    fontSize: 14,
  },
  msgBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  myBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  myBadgeText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },
  fullName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 12,
  },
  username: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 2,
  },
  bio: {
    fontSize: 15,
    lineHeight: 22,
    color: "#334155",
    marginTop: 12,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginTop: 12,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    color: "#64748B",
  },
  statsBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    paddingVertical: 14,
    marginTop: 20,
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },
  statLabel: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#E2E8F0",
  },
});

