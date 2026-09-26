import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Search, UserCheck, UserPlus, Users } from "lucide-react-native";
import { IUser } from "../../interfaces/user.interface";
import { followService } from "../../services/follow.service";
import { useAuthStore } from "../../store/auth.store";
import { getMediaUrl, DEFAULT_AVATAR } from "../../utils/media";

interface FollowersModalProps {
  visible: boolean;
  userId: string;
  username: string;
  initialTab?: "followers" | "following";
  onClose: () => void;
}

export const FollowersModal: React.FC<FollowersModalProps> = ({
  visible,
  userId,
  username,
  initialTab = "followers",
  onClose,
}) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [activeTab, setActiveTab] = useState<"followers" | "following">(initialTab);
  const [searchQuery, setSearchQuery] = useState("");

  // Sync initial tab when modal opens
  React.useEffect(() => {
    if (visible) {
      setActiveTab(initialTab);
      setSearchQuery("");
    }
  }, [visible, initialTab]);

  // Fetch Followers
  const { data: followers = [], isLoading: loadingFollowers } = useQuery<IUser[]>({
    queryKey: ["followers", userId],
    queryFn: () => followService.getFollowers(userId),
    enabled: visible && !!userId,
    staleTime: 60 * 1000,
  });

  // Fetch Following
  const { data: following = [], isLoading: loadingFollowing } = useQuery<IUser[]>({
    queryKey: ["following", userId],
    queryFn: () => followService.getFollowing(userId),
    enabled: visible && !!userId,
    staleTime: 60 * 1000,
  });

  const activeList = activeTab === "followers" ? followers : following;
  const isLoading = activeTab === "followers" ? loadingFollowers : loadingFollowing;

  // Filter list by search query
  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return activeList;
    return activeList.filter(
      (u) =>
        u.fullName?.toLowerCase().includes(q) ||
        u.username?.toLowerCase().includes(q)
    );
  }, [activeList, searchQuery]);

  const handleUserPress = (targetUsername?: string) => {
    if (!targetUsername) return;
    Haptics.selectionAsync();
    onClose();
    router.push(`/s/${targetUsername}` as any);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerSpacer} />
          <Text style={styles.headerTitle}>@{username}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
            <X size={22} color="#0F172A" />
          </TouchableOpacity>
        </View>

        {/* Instagram-style Tabs */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "followers" && styles.activeTab]}
            onPress={() => {
              Haptics.selectionAsync();
              setActiveTab("followers");
            }}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "followers" && styles.activeTabText,
              ]}
            >
              {followers.length} Followers
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === "following" && styles.activeTab]}
            onPress={() => {
              Haptics.selectionAsync();
              setActiveTab("following");
            }}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "following" && styles.activeTabText,
              ]}
            >
              {following.length} Following
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputWrapper}>
            <Search size={18} color="#94A3B8" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search users..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && Platform.OS === "android" && (
              <TouchableOpacity onPress={() => setSearchQuery("")} style={{ padding: 4 }}>
                <X size={16} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* User List */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.loadingText}>Loading users...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredUsers}
            keyExtractor={(item) => item.id || (item as any)._id || item.username}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <UserRow
                targetUser={item}
                currentUserId={currentUserId}
                isAuthenticated={isAuthenticated}
                onPress={() => handleUserPress(item.username)}
              />
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                  <Users size={32} color="#94A3B8" />
                </View>
                <Text style={styles.emptyTitle}>
                  {searchQuery ? "No users found" : `No ${activeTab} yet`}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {searchQuery
                    ? `No matching users found for "${searchQuery}".`
                    : activeTab === "followers"
                    ? "When someone follows this profile, they will appear here."
                    : "When this profile follows someone, they will appear here."}
                </Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </Modal>
  );
};

interface UserRowProps {
  targetUser: IUser;
  currentUserId?: string;
  isAuthenticated: boolean;
  onPress: () => void;
}

const UserRow: React.FC<UserRowProps> = ({
  targetUser,
  currentUserId,
  isAuthenticated,
  onPress,
}) => {
  const queryClient = useQueryClient();
  const targetId = targetUser.id || (targetUser as any)._id;
  const isMe = currentUserId === targetId;

  const avatarUri =
    getMediaUrl(targetUser.profilePicUrl || targetUser.avatar) ||
    DEFAULT_AVATAR;

  // Check follow status of this specific user
  const { data: isFollowing = false } = useQuery({
    queryKey: ["follow-status", targetId],
    queryFn: () => followService.getFollowStatus(targetId),
    enabled: Boolean(isAuthenticated && targetId && !isMe),
    staleTime: 60 * 1000,
  });

  const followMutation = useMutation({
    mutationFn: async (next: boolean) => {
      if (next) {
        return followService.followUser(targetId);
      } else {
        return followService.unfollowUser(targetId);
      }
    },
    onMutate: async (next: boolean) => {
      await queryClient.cancelQueries({ queryKey: ["follow-status", targetId] });
      const prev = queryClient.getQueryData(["follow-status", targetId]);
      queryClient.setQueryData(["follow-status", targetId], next);
      return { prev };
    },
    onError: (_err, _vars, context: any) => {
      if (context?.prev !== undefined) {
        queryClient.setQueryData(["follow-status", targetId], context.prev);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["follow-status", targetId] });
    },
  });

  const handleToggleFollow = () => {
    if (!isAuthenticated || isMe || !targetId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    followMutation.mutate(!isFollowing);
  };

  return (
    <TouchableOpacity style={styles.userRow} activeOpacity={0.7} onPress={onPress}>
      <Image source={{ uri: avatarUri }} style={styles.userAvatar} contentFit="cover" />

      <View style={styles.userInfo}>
        <Text style={styles.userFullName} numberOfLines={1}>
          {targetUser.fullName || targetUser.name || "User"}
        </Text>
        <Text style={styles.userUsername} numberOfLines={1}>
          @{targetUser.username}
        </Text>
      </View>

      {!isMe && isAuthenticated && (
        <TouchableOpacity
          style={[styles.followBtn, isFollowing && styles.followingBtn]}
          onPress={handleToggleFollow}
          activeOpacity={0.8}
        >
          {isFollowing ? (
            <Text style={styles.followingBtnText}>Following</Text>
          ) : (
            <Text style={styles.followBtnText}>Follow</Text>
          )}
        </TouchableOpacity>
      )}

      {isMe && (
        <View style={styles.youBadge}>
          <Text style={styles.youBadgeText}>You</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerSpacer: {
    width: 36,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  activeTab: {
    borderBottomColor: "#0F172A",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
  },
  activeTabText: {
    color: "#0F172A",
    fontWeight: "700",
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#0F172A",
    paddingVertical: 0,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#E2E8F0",
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
  },
  userFullName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
  },
  userUsername: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
  },
  followBtn: {
    backgroundColor: "#3B82F6",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 84,
    alignItems: "center",
  },
  followBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  followingBtn: {
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  followingBtnText: {
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "600",
  },
  youBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  youBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
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
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 18,
  },
});
