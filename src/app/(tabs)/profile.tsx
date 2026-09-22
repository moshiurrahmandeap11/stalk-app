import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  cancelAnimation,
} from "react-native-reanimated";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  LogOut,
  LogIn,
  UserPlus,
  RefreshCw,
  Edit3,
  Share2,
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
import { useAuthStore } from "../../store/auth.store";
import { postService } from "../../services/post.service";
import { followService } from "../../services/follow.service";
import { PostCard } from "../../components/post/PostCard";
import { EditProfileModal } from "../../components/profile/EditProfileModal";
import { FollowersModal } from "../../components/profile/FollowersModal";
import { getMediaUrl } from "../../utils/media";
import { IPost } from "../../interfaces/post.interface";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const GRID_ITEM_SIZE = (SCREEN_WIDTH - 36) / 3;

export default function ProfileTabScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isAuthenticated, logout, refreshUser } = useAuthStore();

  const [activeTab, setActiveTab] = useState<"posts" | "media" | "about">("posts");
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [followersModalTab, setFollowersModalTab] = useState<"followers" | "following">("followers");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const userId = user?.id || (user as any)?._id;

  // Spin animation for refresh button
  const spinValue = useSharedValue(0);
  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spinValue.value * 360}deg` }],
  }));

  // Fetch User Posts
  const {
    data: userPosts = [],
    isLoading: loadingPosts,
    refetch: refetchPosts,
  } = useQuery<IPost[]>({
    queryKey: ["userPosts", userId],
    queryFn: () => (userId ? postService.getUserPosts(userId) : Promise.resolve([])),
    enabled: Boolean(isAuthenticated && userId),
  });

  // Fetch Followers Count
  const { data: followersCount = user?.followersCount ?? 0, refetch: refetchFollowers } = useQuery<number>({
    queryKey: ["followersCount", userId],
    queryFn: () => (userId ? followService.getFollowersCount(userId) : Promise.resolve(0)),
    enabled: Boolean(isAuthenticated && userId),
  });

  // Fetch Following Count
  const { data: followingCount = user?.followingCount ?? 0, refetch: refetchFollowing } = useQuery<number>({
    queryKey: ["followingCount", userId],
    queryFn: () => (userId ? followService.getFollowingCount(userId) : Promise.resolve(0)),
    enabled: Boolean(isAuthenticated && userId),
  });

  // Media posts filter (posts with image or video)
  const mediaPosts = userPosts.filter(
    (p) => Boolean(p.media?.url || p.mediaUrl) && !p.isShare
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    spinValue.value = withRepeat(withTiming(1, { duration: 700 }), -1);
    try {
      await Promise.all([
        refreshUser(),
        refetchPosts(),
        refetchFollowers(),
        refetchFollowing(),
        queryClient.invalidateQueries({ queryKey: ["userPosts", userId] }),
      ]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // quiet fail
    } finally {
      setIsRefreshing(false);
      cancelAnimation(spinValue);
      spinValue.value = 0;
    }
  }, [refreshUser, refetchPosts, refetchFollowers, refetchFollowing, queryClient, userId, spinValue]);

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out of Stalk?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: () => logout(),
      },
    ]);
  };

  const openFollowers = (tab: "followers" | "following") => {
    Haptics.selectionAsync();
    setFollowersModalTab(tab);
    setShowFollowersModal(true);
  };

  if (!isAuthenticated || !user) {
    return (
      <SafeAreaView style={styles.guestContainer} edges={["top"]}>
        <View style={styles.guestCard}>
          <View style={styles.guestAvatarPlaceholder}>
            <UserPlus size={44} color="#3B82F6" />
          </View>
          <Text style={styles.guestTitle}>Join Stalk</Text>
          <Text style={styles.guestSubtitle}>
            Sign in to view your profile, share moments, upvote posts, and chat with friends!
          </Text>

          <TouchableOpacity
            style={styles.signInBtn}
            onPress={() => router.push("/login" as any)}
          >
            <LogIn size={18} color="#FFFFFF" />
            <Text style={styles.signInBtnText}>Sign In</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.signUpBtn}
            onPress={() => router.push("/register" as any)}
          >
            <Text style={styles.signUpBtnText}>Create Account</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const avatarUri = getMediaUrl(
    user.profilePicUrl ||
    user.avatar ||
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"
  );

  const coverUri = getMediaUrl(
    user.coverPhotoUrl ||
    user.coverImage ||
    "https://images.unsplash.com/photo-1707343843437-caacff5cfa74?w=800"
  );

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
            <View style={styles.coverTopBar}>
              <Text style={styles.coverBrandTitle}>My Profile</Text>
              <View style={styles.coverActions}>
                {/* Refresh Button */}
                <TouchableOpacity
                  style={styles.coverIconBtn}
                  onPress={handleRefresh}
                  disabled={isRefreshing}
                  activeOpacity={0.8}
                >
                  <Animated.View style={spinStyle}>
                    <RefreshCw size={18} color="#FFFFFF" />
                  </Animated.View>
                </TouchableOpacity>

                {/* Logout Button */}
                <TouchableOpacity
                  style={[styles.coverIconBtn, styles.logoutBtn]}
                  onPress={handleLogout}
                  activeOpacity={0.8}
                >
                  <LogOut size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </View>

        {/* Profile Info Card */}
        <View style={styles.profileCard}>
          {/* Avatar and Action Buttons Row */}
          <View style={styles.avatarActionRow}>
            <View style={styles.avatarWrapper}>
              <Image source={{ uri: avatarUri }} style={styles.avatar} contentFit="cover" />
              {user.isVerified && (
                <View style={styles.verifiedBadge}>
                  <Check size={12} color="#FFFFFF" strokeWidth={3} />
                </View>
              )}
            </View>

            <View style={styles.profileBtnRow}>
              {/* Edit Profile Button */}
              <TouchableOpacity
                style={styles.editProfileBtn}
                onPress={() => {
                  Haptics.selectionAsync();
                  setShowEditModal(true);
                }}
                activeOpacity={0.8}
              >
                <Edit3 size={15} color="#0F172A" />
                <Text style={styles.editProfileText}>Edit Profile</Text>
              </TouchableOpacity>

              {/* Public View Button */}
              <TouchableOpacity
                style={styles.publicViewBtn}
                onPress={() => router.push(`/s/${user.username}` as any)}
                activeOpacity={0.8}
              >
                <Share2 size={15} color="#64748B" />
              </TouchableOpacity>
            </View>
          </View>

          {/* User Names */}
          <View style={styles.nameSection}>
            <Text style={styles.fullName}>{user.fullName || user.name || "User"}</Text>
            <Text style={styles.username}>@{user.username || "user"}</Text>
          </View>

          {/* Bio */}
          {user.bio ? (
            <Text style={styles.bio}>{user.bio}</Text>
          ) : (
            <TouchableOpacity
              onPress={() => setShowEditModal(true)}
              style={styles.addBioBtn}
            >
              <Text style={styles.addBioText}>+ Add bio to introduce yourself</Text>
            </TouchableOpacity>
          )}

          {/* Metadata Chips */}
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

          {/* Instagram-style Interactive Stats Bar */}
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

        {/* Web Parity Tabs: Posts / Media / About */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === "posts" && styles.tabBtnActive]}
            onPress={() => {
              Haptics.selectionAsync();
              setActiveTab("posts");
            }}
          >
            <FileText size={18} color={activeTab === "posts" ? "#3B82F6" : "#64748B"} />
            <Text style={[styles.tabBtnText, activeTab === "posts" && styles.tabBtnTextActive]}>
              Posts ({userPosts.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === "media" && styles.tabBtnActive]}
            onPress={() => {
              Haptics.selectionAsync();
              setActiveTab("media");
            }}
          >
            <Grid size={18} color={activeTab === "media" ? "#3B82F6" : "#64748B"} />
            <Text style={[styles.tabBtnText, activeTab === "media" && styles.tabBtnTextActive]}>
              Media ({mediaPosts.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === "about" && styles.tabBtnActive]}
            onPress={() => {
              Haptics.selectionAsync();
              setActiveTab("about");
            }}
          >
            <Info size={18} color={activeTab === "about" ? "#3B82F6" : "#64748B"} />
            <Text style={[styles.tabBtnText, activeTab === "about" && styles.tabBtnTextActive]}>
              About
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab 1: Posts */}
        {activeTab === "posts" && (
          <View style={styles.tabContent}>
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
                  Share your first photo, video, or thought with your network!
                </Text>
                <TouchableOpacity
                  style={styles.createPostBtn}
                  onPress={() => router.push("/(tabs)/create" as any)}
                >
                  <Text style={styles.createPostBtnText}>Create Post</Text>
                </TouchableOpacity>
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
          </View>
        )}

        {/* Tab 2: Media Grid */}
        {activeTab === "media" && (
          <View style={styles.mediaGrid}>
            {loadingPosts ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color="#3B82F6" />
              </View>
            ) : mediaPosts.length === 0 ? (
              <View style={styles.emptyTabBox}>
                <Grid size={40} color="#CBD5E1" />
                <Text style={styles.emptyTabTitle}>No photos or videos yet</Text>
                <Text style={styles.emptyTabSubtitle}>
                  Media you upload in your posts will appear here.
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
                        // Open post details
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
          </View>
        )}

        {/* Tab 3: About (Web Feature Parity) */}
        {activeTab === "about" && (
          <View style={styles.aboutCard}>
            <Text style={styles.aboutCardHeader}>About & Details</Text>

            <View style={styles.aboutList}>
              <View style={styles.aboutRow}>
                <UserIcon size={18} color="#64748B" style={styles.aboutIcon} />
                <View style={styles.aboutTextCol}>
                  <Text style={styles.aboutLabel}>Full Name</Text>
                  <Text style={styles.aboutValue}>{user.fullName || user.name || "Not set"}</Text>
                </View>
              </View>

              <View style={styles.aboutRow}>
                <Mail size={18} color="#64748B" style={styles.aboutIcon} />
                <View style={styles.aboutTextCol}>
                  <Text style={styles.aboutLabel}>Email</Text>
                  <Text style={styles.aboutValue}>{user.email || "Private"}</Text>
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

            <TouchableOpacity
              style={styles.aboutEditBtn}
              onPress={() => setShowEditModal(true)}
            >
              <Edit3 size={16} color="#3B82F6" />
              <Text style={styles.aboutEditBtnText}>Edit Information</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <EditProfileModal
          visible={showEditModal}
          user={user}
          onClose={() => setShowEditModal(false)}
          onProfileUpdated={(updated) => {
            queryClient.invalidateQueries({ queryKey: ["userPosts", userId] });
          }}
        />
      )}

      {/* Instagram-style Followers / Following Modal */}
      {showFollowersModal && (
        <FollowersModal
          visible={showFollowersModal}
          userId={userId}
          username={user.username || "user"}
          initialTab={followersModalTab}
          onClose={() => setShowFollowersModal(false)}
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
  coverTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  coverBrandTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  coverActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  coverIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    alignItems: "center",
    justifyContent: "center",
  },
  logoutBtn: {
    backgroundColor: "rgba(239, 68, 68, 0.75)",
  },
  profileCard: {
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
  profileBtnRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  editProfileBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  editProfileText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A",
  },
  publicViewBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
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
  addBioBtn: {
    paddingVertical: 6,
    marginBottom: 6,
  },
  addBioText: {
    fontSize: 13,
    color: "#3B82F6",
    fontWeight: "500",
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
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabBtnActive: {
    borderBottomColor: "#3B82F6",
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },
  tabBtnTextActive: {
    color: "#3B82F6",
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
  createPostBtn: {
    marginTop: 12,
    backgroundColor: "#3B82F6",
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
  },
  createPostBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
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
  aboutEditBtn: {
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
  },
  aboutEditBtnText: {
    fontSize: 13,
    color: "#3B82F6",
    fontWeight: "600",
  },
  guestContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  guestCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    width: "100%",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  guestAvatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  guestTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 8,
  },
  guestSubtitle: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  signInBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#3B82F6",
    width: "100%",
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 12,
  },
  signInBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  signUpBtn: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
  },
  signUpBtnText: {
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "600",
  },
});
