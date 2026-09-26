import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  RefreshControl,
  Dimensions,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeIn,
} from "react-native-reanimated";
import {
  ArrowLeft,
  UserPlus,
  UserCheck,
  MessageSquare,
  MapPin,
  Globe,
  Calendar,
  Cake,
  Mail,
  User as UserIcon,
  Grid,
  FileText,
  Info,
  Play,
  Check,
} from "lucide-react-native";
import { userService } from "../../services/user.service";
import { followService } from "../../services/follow.service";
import { postService } from "../../services/post.service";
import { useAuthStore } from "../../store/auth.store";
import { PostCard } from "../../components/post/PostCard";
import { FeedReelModal } from "../../components/post/FeedReelModal";
import { ImageViewerModal } from "../../components/post/ImageViewerModal";
import { FollowersModal } from "../../components/profile/FollowersModal";
import { getMediaUrl, DEFAULT_AVATAR, DEFAULT_COVER } from "../../utils/media";
import { IPost } from "../../interfaces/post.interface";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const GRID_ITEM_SIZE = (SCREEN_WIDTH - 36) / 3;

const PUBLIC_TABS = [
  { key: "posts" as const, icon: FileText, label: "Posts" },
  { key: "media" as const, icon: Grid, label: "Media" },
  { key: "about" as const, icon: Info, label: "About" },
];

export default function UserProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { username } = useLocalSearchParams<{ username: string }>();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [activeTab, setActiveTab] = useState<"posts" | "media" | "about">("posts");
  const [tabsWidth, setTabsWidth] = useState(SCREEN_WIDTH);
  const tabTranslateX = useSharedValue(0);

  const switchTab = (tab: "posts" | "media" | "about", index: number) => {
    Haptics.selectionAsync();
    setActiveTab(tab);
    const singleTabWidth = tabsWidth / PUBLIC_TABS.length;
    tabTranslateX.value = withSpring(index * singleTabWidth, {
      damping: 20,
      stiffness: 240,
      mass: 0.6,
    });
  };

  const singleTabWidth = tabsWidth / PUBLIC_TABS.length;
  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tabTranslateX.value }],
    width: singleTabWidth,
  }));
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [followersModalTab, setFollowersModalTab] = useState<"followers" | "following">("followers");
  const [selectedPostForReel, setSelectedPostForReel] = useState<IPost | null>(null);
  const [selectedPostForImage, setSelectedPostForImage] = useState<IPost | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 1. Fetch User Profile
  const {
    data: user,
    isLoading: loadingUser,
    refetch: refetchUser,
  } = useQuery({
    queryKey: ["userProfile", username],
    queryFn: () => userService.getUserByUsername(username!),
    enabled: Boolean(username),
  });

  const targetUserId = user?.id || (user as any)?._id;
  const isMe = Boolean(currentUserId && targetUserId && currentUserId === targetUserId);

  // 2. Fetch Follow Status
  const { data: isFollowing = false } = useQuery<boolean>({
    queryKey: ["follow-status", targetUserId],
    queryFn: () => (targetUserId ? followService.getFollowStatus(targetUserId) : Promise.resolve(false)),
    enabled: Boolean(isAuthenticated && targetUserId && !isMe),
    staleTime: 60 * 1000,
  });

  // 3. Fetch Follower & Following Counts
  const { data: followersCount = user?.followersCount ?? 0, refetch: refetchFollowers } = useQuery<number>({
    queryKey: ["followersCount", targetUserId],
    queryFn: () => (targetUserId ? followService.getFollowersCount(targetUserId) : Promise.resolve(0)),
    enabled: Boolean(targetUserId),
  });

  const { data: followingCount = user?.followingCount ?? 0, refetch: refetchFollowing } = useQuery<number>({
    queryKey: ["followingCount", targetUserId],
    queryFn: () => (targetUserId ? followService.getFollowingCount(targetUserId) : Promise.resolve(0)),
    enabled: Boolean(targetUserId),
  });

  // 4. Fetch User Posts
  const {
    data: userPosts = [],
    isLoading: loadingPosts,
    refetch: refetchPosts,
  } = useQuery<IPost[]>({
    queryKey: ["userPosts", targetUserId],
    queryFn: () => (targetUserId ? postService.getUserPosts(targetUserId) : Promise.resolve([])),
    enabled: Boolean(targetUserId),
  });

  // Filter media posts
  const mediaPosts = userPosts.filter(
    (p) => Boolean(p.media?.url || p.mediaUrl) && !p.isShare
  );

  // Optimistic Follow Mutation
  const followMutation = useMutation({
    mutationFn: async (nextStatus: boolean) => {
      if (nextStatus) {
        return followService.followUser(targetUserId);
      } else {
        return followService.unfollowUser(targetUserId);
      }
    },
    onMutate: async (nextStatus: boolean) => {
      await queryClient.cancelQueries({ queryKey: ["follow-status", targetUserId] });
      await queryClient.cancelQueries({ queryKey: ["followersCount", targetUserId] });

      const prevStatus = queryClient.getQueryData<boolean>(["follow-status", targetUserId]);
      const prevCount = queryClient.getQueryData<number>(["followersCount", targetUserId]) ?? followersCount;

      // Instant optimistic state change
      queryClient.setQueryData(["follow-status", targetUserId], nextStatus);
      queryClient.setQueryData<number>(
        ["followersCount", targetUserId],
        Math.max(0, nextStatus ? prevCount + 1 : prevCount - 1)
      );

      return { prevStatus, prevCount };
    },
    onError: (_err, _vars, context: any) => {
      if (context?.prevStatus !== undefined) {
        queryClient.setQueryData(["follow-status", targetUserId], context.prevStatus);
      }
      if (context?.prevCount !== undefined) {
        queryClient.setQueryData(["followersCount", targetUserId], context.prevCount);
      }
      Alert.alert("Error", "Could not update follow status.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["follow-status", targetUserId] });
      queryClient.invalidateQueries({ queryKey: ["followersCount", targetUserId] });
    },
  });

  const handleToggleFollow = () => {
    if (!isAuthenticated) {
      Alert.alert("Sign In Required", "Please sign in to follow users.", [
        { text: "Cancel", style: "cancel" },
        { text: "Sign In", onPress: () => router.push("/login" as any) },
      ]);
      return;
    }
    if (!targetUserId || isMe) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    followMutation.mutate(!isFollowing);
  };

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refetchUser(),
        refetchFollowers(),
        refetchFollowing(),
        refetchPosts(),
      ]);
    } catch {}
    setIsRefreshing(false);
  }, [refetchUser, refetchFollowers, refetchFollowing, refetchPosts]);

  const openFollowers = (tab: "followers" | "following") => {
    Haptics.selectionAsync();
    setFollowersModalTab(tab);
    setShowFollowersModal(true);
  };

  if (loadingUser) {
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
    getMediaUrl(user.avatar || user.profilePicUrl) || DEFAULT_AVATAR;

  const coverUri =
    getMediaUrl(user.coverImage || user.coverPhotoUrl) || DEFAULT_COVER;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#3B82F6"
            colors={["#3B82F6"]}
          />
        }
      >
        {/* Cover Photo */}
        <View style={styles.coverWrapper}>
          <Image source={{ uri: coverUri }} style={styles.coverPhoto} contentFit="cover" />
          <SafeAreaView style={styles.coverOverlay} edges={["top"]}>
            <TouchableOpacity style={styles.navBackBtn} onPress={() => router.back()}>
              <ArrowLeft size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </SafeAreaView>
        </View>

        {/* Profile Header Info */}
        <View style={styles.profileHeader}>
          {/* Avatar and Action Buttons */}
          <View style={styles.avatarActionRow}>
            <View style={styles.avatarWrapper}>
              <Image source={{ uri: avatarUri }} style={styles.avatar} contentFit="cover" />
              {user.isVerified && (
                <View style={styles.verifiedBadge}>
                  <Check size={12} color="#FFFFFF" strokeWidth={3} />
                </View>
              )}
            </View>

            {/* Actions: Follow / Message / Your Profile badge */}
            {!isMe ? (
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.followBtn, isFollowing && styles.followingBtn]}
                  onPress={handleToggleFollow}
                  activeOpacity={0.8}
                >
                  {isFollowing ? (
                    <>
                      <UserCheck size={16} color="#0F172A" />
                      <Text style={styles.followingBtnText}>Following</Text>
                    </>
                  ) : (
                    <>
                      <UserPlus size={16} color="#FFFFFF" />
                      <Text style={styles.followBtnText}>Follow</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.msgBtn}
                  onPress={() => router.push(`/chat/${targetUserId}` as any)}
                  activeOpacity={0.8}
                >
                  <MessageSquare size={17} color="#0F172A" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.myBadge}>
                <Text style={styles.myBadgeText}>Your Profile</Text>
              </View>
            )}
          </View>

          {/* Name & Username */}
          <View style={styles.nameSection}>
            <Text style={styles.fullName}>{user.fullName || user.name || "User"}</Text>
            <Text style={styles.username}>@{user.username}</Text>
          </View>

          {/* Bio */}
          {user.bio ? <Text style={styles.bio}>{user.bio}</Text> : null}

          {/* Location & Website */}
          <View style={styles.metaRow}>
            {user.location ? (
              <View style={styles.metaItem}>
                <MapPin size={13} color="#64748B" />
                <Text style={styles.metaText}>{user.location}</Text>
              </View>
            ) : null}

            {user.website ? (
              <View style={styles.metaItem}>
                <Globe size={13} color="#3B82F6" />
                <Text style={[styles.metaText, { color: "#3B82F6" }]}>
                  {user.website.replace(/^https?:\/\//, "")}
                </Text>
              </View>
            ) : null}

            {user.createdAt ? (
              <View style={styles.metaItem}>
                <Calendar size={13} color="#64748B" />
                <Text style={styles.metaText}>
                  Joined{" "}
                  {new Date(user.createdAt).toLocaleDateString(undefined, {
                    month: "short",
                    year: "numeric",
                  })}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Interactive Instagram-style Stats Bar */}
          <View style={styles.statsBar}>
            <TouchableOpacity
              style={styles.statItem}
              onPress={() => openFollowers("followers")}
              activeOpacity={0.7}
            >
              <Text style={styles.statNumber}>{followersCount}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </TouchableOpacity>

            <View style={styles.statDivider} />

            <TouchableOpacity
              style={styles.statItem}
              onPress={() => openFollowers("following")}
              activeOpacity={0.7}
            >
              <Text style={styles.statNumber}>{followingCount}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </TouchableOpacity>

            <View style={styles.statDivider} />

            <TouchableOpacity
              style={styles.statItem}
              onPress={() => setActiveTab("posts")}
              activeOpacity={0.7}
            >
              <Text style={styles.statNumber}>{userPosts.length}</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Public Profile Tabs: Posts / Media / About (Icon only with fluid indicator) */}
        <View
          style={styles.tabsContainer}
          onLayout={(e) => {
            const w = e.nativeEvent.layout.width;
            if (w > 0) {
              setTabsWidth(w);
              const idx = PUBLIC_TABS.findIndex((t) => t.key === activeTab);
              tabTranslateX.value = (idx >= 0 ? idx : 0) * (w / PUBLIC_TABS.length);
            }
          }}
        >
          {PUBLIC_TABS.map((tab, idx) => {
            const IconComp = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={styles.tabBtn}
                onPress={() => switchTab(tab.key, idx)}
                accessibilityLabel={tab.label}
                activeOpacity={0.7}
              >
                <IconComp
                  size={22}
                  color={isActive ? "#3B82F6" : "#64748B"}
                  strokeWidth={isActive ? 2.4 : 1.8}
                />
              </TouchableOpacity>
            );
          })}

          {/* Fluid Sliding Active Indicator */}
          <Animated.View style={[styles.tabIndicatorContainer, indicatorStyle]}>
            <View style={styles.tabIndicatorPill} />
          </Animated.View>
        </View>

        {/* Tab 1: Posts */}
        {activeTab === "posts" && (
          <Animated.View entering={FadeIn.duration(200)} style={styles.tabContent}>
            {loadingPosts ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color="#3B82F6" />
                <Text style={styles.loadingBoxText}>Loading posts...</Text>
              </View>
            ) : userPosts.length === 0 ? (
              <View style={styles.emptyTabBox}>
                <FileText size={40} color="#CBD5E1" />
                <Text style={styles.emptyTabTitle}>No posts published yet</Text>
                <Text style={styles.emptyTabSubtitle}>
                  @{username} has not posted anything yet.
                </Text>
              </View>
            ) : (
              userPosts.map((post) => (
                <PostCard
                  key={post.id || (post as any)._id}
                  post={post}
                  onPostDeleted={() => refetchPosts()}
                />
              ))
            )}
          </Animated.View>
        )}

        {/* Tab 2: Media Grid */}
        {activeTab === "media" && (
          <Animated.View entering={FadeIn.duration(200)} style={styles.mediaGrid}>
            {loadingPosts ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color="#3B82F6" />
              </View>
            ) : mediaPosts.length === 0 ? (
              <View style={styles.emptyTabBox}>
                <Grid size={40} color="#CBD5E1" />
                <Text style={styles.emptyTabTitle}>No photos or videos</Text>
                <Text style={styles.emptyTabSubtitle}>
                  Media shared by @{username} will appear here.
                </Text>
              </View>
            ) : (
              <View style={styles.gridRow}>
                {mediaPosts.map((post) => {
                  const rawUri = post.media?.url || post.mediaUrl || "";
                  const mediaUri = getMediaUrl(rawUri);
                  const isVid =
                    post.mediaType === "video" ||
                    post.media?.resourceType === "video" ||
                    /\.(mp4|mov|webm|m4v)$/i.test(mediaUri);

                  return (
                    <TouchableOpacity
                      key={post.id || (post as any)._id}
                      style={styles.gridItem}
                      activeOpacity={0.8}
                      onPress={() => {
                        Haptics.selectionAsync();
                        if (isVid) {
                          setSelectedPostForReel(post);
                        } else {
                          setSelectedPostForImage(post);
                        }
                      }}
                    >
                      <Image source={{ uri: mediaUri }} style={styles.gridImage} contentFit="cover" />
                      {isVid && (
                        <View style={styles.videoBadge}>
                          <Play size={14} color="#FFFFFF" fill="#FFFFFF" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </Animated.View>
        )}

        {/* Tab 3: About */}
        {activeTab === "about" && (
          <Animated.View entering={FadeIn.duration(200)} style={styles.aboutCard}>
            <Text style={styles.aboutCardHeader}>About @{username}</Text>

            <View style={styles.aboutList}>
              <View style={styles.aboutRow}>
                <UserIcon size={18} color="#64748B" style={styles.aboutIcon} />
                <View style={styles.aboutTextCol}>
                  <Text style={styles.aboutLabel}>Full Name</Text>
                  <Text style={styles.aboutValue}>{user.fullName || user.name || "User"}</Text>
                </View>
              </View>

              {user.bio ? (
                <View style={styles.aboutRow}>
                  <FileText size={18} color="#64748B" style={styles.aboutIcon} />
                  <View style={styles.aboutTextCol}>
                    <Text style={styles.aboutLabel}>Bio</Text>
                    <Text style={styles.aboutValue}>{user.bio}</Text>
                  </View>
                </View>
              ) : null}

              {user.location ? (
                <View style={styles.aboutRow}>
                  <MapPin size={18} color="#64748B" style={styles.aboutIcon} />
                  <View style={styles.aboutTextCol}>
                    <Text style={styles.aboutLabel}>Location</Text>
                    <Text style={styles.aboutValue}>{user.location}</Text>
                  </View>
                </View>
              ) : null}

              {user.website ? (
                <View style={styles.aboutRow}>
                  <Globe size={18} color="#3B82F6" style={styles.aboutIcon} />
                  <View style={styles.aboutTextCol}>
                    <Text style={styles.aboutLabel}>Website</Text>
                    <Text style={[styles.aboutValue, { color: "#3B82F6" }]}>{user.website}</Text>
                  </View>
                </View>
              ) : null}

              {user.gender ? (
                <View style={styles.aboutRow}>
                  <UserIcon size={18} color="#64748B" style={styles.aboutIcon} />
                  <View style={styles.aboutTextCol}>
                    <Text style={styles.aboutLabel}>Gender</Text>
                    <Text style={[styles.aboutValue, { textTransform: "capitalize" }]}>
                      {user.gender}
                    </Text>
                  </View>
                </View>
              ) : null}

              {user.dob ? (
                <View style={styles.aboutRow}>
                  <Cake size={18} color="#64748B" style={styles.aboutIcon} />
                  <View style={styles.aboutTextCol}>
                    <Text style={styles.aboutLabel}>Birthday</Text>
                    <Text style={styles.aboutValue}>
                      {new Date(user.dob).toLocaleDateString(undefined, {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </Text>
                  </View>
                </View>
              ) : null}

              {user.createdAt ? (
                <View style={styles.aboutRow}>
                  <Calendar size={18} color="#64748B" style={styles.aboutIcon} />
                  <View style={styles.aboutTextCol}>
                    <Text style={styles.aboutLabel}>Joined Stalk</Text>
                    <Text style={styles.aboutValue}>
                      {new Date(user.createdAt).toLocaleDateString(undefined, {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </Text>
                  </View>
                </View>
              ) : null}
            </View>
          </Animated.View>
        )}
      </ScrollView>

      {/* Instagram-style Followers / Following Modal */}
      {showFollowersModal && targetUserId && (
        <FollowersModal
          visible={showFollowersModal}
          userId={targetUserId}
          username={user.username || "user"}
          initialTab={followersModalTab}
          onClose={() => setShowFollowersModal(false)}
        />
      )}

      {/* Fullscreen Video / Reel Player Modal */}
      {selectedPostForReel && (
        <FeedReelModal
          visible={Boolean(selectedPostForReel)}
          post={selectedPostForReel}
          onClose={() => setSelectedPostForReel(null)}
        />
      )}

      {/* Fullscreen Image Lightbox Modal */}
      {selectedPostForImage && (
        <ImageViewerModal
          visible={Boolean(selectedPostForImage)}
          post={selectedPostForImage}
          onClose={() => setSelectedPostForImage(null)}
        />
      )}
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
    position: "relative",
  },
  coverPhoto: {
    width: "100%",
    height: "100%",
  },
  coverOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "flex-start",
  },
  navBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 16,
    marginTop: 8,
  },
  profileHeader: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  avatarActionRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: -45,
    marginBottom: 12,
  },
  avatarWrapper: {
    position: "relative",
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 4,
    borderColor: "#FFFFFF",
    backgroundColor: "#E2E8F0",
  },
  verifiedBadge: {
    position: "absolute",
    right: 2,
    bottom: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#3B82F6",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  followBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#3B82F6",
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 12,
  },
  followBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  followingBtn: {
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  followingBtnText: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "600",
  },
  msgBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },
  myBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  myBadgeText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },
  nameSection: {
    marginBottom: 8,
  },
  fullName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
  },
  username: {
    fontSize: 14,
    color: "#3B82F6",
    fontWeight: "500",
    marginTop: 2,
  },
  bio: {
    fontSize: 14,
    color: "#334155",
    lineHeight: 20,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: "#64748B",
  },
  statsBar: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
  },
  statLabel: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
    fontWeight: "500",
  },
  statDivider: {
    width: 1,
    height: "60%",
    backgroundColor: "#E2E8F0",
    alignSelf: "center",
  },
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    marginTop: 8,
    position: "relative",
  },
  tabBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
  },
  tabIndicatorContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    height: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  tabIndicatorPill: {
    width: 44,
    height: 3,
    backgroundColor: "#3B82F6",
    borderRadius: 2,
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.35,
    shadowRadius: 2,
    elevation: 2,
  },
  tabContent: {
    paddingVertical: 8,
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: "center",
    gap: 8,
  },
  loadingBoxText: {
    fontSize: 13,
    color: "#64748B",
  },
  emptyTabBox: {
    paddingVertical: 48,
    paddingHorizontal: 24,
    alignItems: "center",
    gap: 8,
  },
  emptyTabTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  emptyTabSubtitle: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
  },
  mediaGrid: {
    padding: 12,
  },
  gridRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  gridItem: {
    width: GRID_ITEM_SIZE,
    height: GRID_ITEM_SIZE,
    borderRadius: 8,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#E2E8F0",
  },
  gridImage: {
    width: "100%",
    height: "100%",
  },
  videoBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  aboutCard: {
    backgroundColor: "#FFFFFF",
    margin: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  aboutCardHeader: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 16,
  },
  aboutList: {
    gap: 16,
  },
  aboutRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  aboutIcon: {
    marginTop: 2,
    marginRight: 12,
  },
  aboutTextCol: {
    flex: 1,
  },
  aboutLabel: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "500",
  },
  aboutValue: {
    fontSize: 14,
    color: "#0F172A",
    fontWeight: "500",
    marginTop: 2,
  },
});
