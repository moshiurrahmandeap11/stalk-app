import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Dimensions,
  Platform,
  Alert,
} from "react-native";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import {
  Heart,
  ArrowUp,
  MessageCircle,
  Share2,
  Bookmark,
  Volume2,
  VolumeX,
  Play,
  Music,
  Plus,
} from "lucide-react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { IPost } from "../../interfaces/post.interface";
import { postService } from "../../services/post.service";
import { followService } from "../../services/follow.service";
import { useAuthStore } from "../../store/auth.store";
import { ShareModal } from "../post/ShareModal";
import { CommentBottomSheet } from "../post/CommentBottomSheet";
import { getMediaUrl } from "../../utils/media";
import { updateFeedCacheItem } from "../../utils/feedCache";

const { width: WINDOW_WIDTH } = Dimensions.get("window");

interface ReelItemProps {
  post: IPost;
  isActive: boolean;
  isScreenFocused?: boolean;
  shouldLoad?: boolean;
  itemHeight: number;
}

export const ReelItem: React.FC<ReelItemProps> = ({
  post,
  isActive,
  isScreenFocused = true,
  shouldLoad = true,
  itemHeight,
}) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const postId = post.id || (post as any)._id;
  const authorId = post.userId || post.user?.id || (post.user as any)?._id;
  const isOwner = Boolean(currentUserId && authorId && currentUserId === authorId);

  const rawMediaUri = post.media?.url || post.mediaUrl || "";
  const mediaUri = getMediaUrl(rawMediaUri);
  const isVideo =
    post.mediaType === "video" ||
    post.media?.resourceType === "video" ||
    /\.(mp4|mov|webm|m4v)$/i.test(mediaUri);

  // Playback & UI States
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showCommentSheet, setShowCommentSheet] = useState(false);
  const [sharesCount, setSharesCount] = useState(post.sharesCount ?? 0);
  const [isSaved, setIsSaved] = useState(false);
  const [showHeartAnim, setShowHeartAnim] = useState(false);

  // Upvote / Likes state
  const initialLiked = Boolean(
    (currentUserId && post.likes && post.likes.includes(currentUserId)) ||
      post.isLikedByCurrentUser
  );
  const [isLiked, setIsLiked] = useState(initialLiked);
  const [likesCount, setLikesCount] = useState(
    post.likesCount ?? (post.likes ? post.likes.length : 0)
  );
  const [commentCount, setCommentCount] = useState(
    post.commentsCount ?? (post.comments ? post.comments.length : 0)
  );

  // Double-tap tracker
  const lastTapRef = useRef<number>(0);

  // Sync state when props change
  useEffect(() => {
    const liked = Boolean(
      (currentUserId && post.likes && post.likes.includes(currentUserId)) ||
        post.isLikedByCurrentUser
    );
    setIsLiked(liked);
    setLikesCount(post.likesCount ?? (post.likes ? post.likes.length : 0));
    setCommentCount(post.commentsCount ?? (post.comments ? post.comments.length : 0));
  }, [post.likes, post.likesCount, post.isLikedByCurrentUser, post.commentsCount, currentUserId]);

  // Animations
  const likeScale = useSharedValue(1);
  const heartAnimScale = useSharedValue(0);
  const heartAnimOpacity = useSharedValue(0);
  const playIconOpacity = useSharedValue(0);

  // Only instantiate native video player if item is active or adjacent (shouldLoad)
  const player = useVideoPlayer(
    isVideo && shouldLoad ? mediaUri : null,
    (p) => {
      p.loop = true;
      p.muted = isMuted;
    }
  );

  // Active playback control: play only when active, screen focused, not manually paused, and comment sheet closed
  useEffect(() => {
    if (!player) return;
    if (isActive && isScreenFocused && isPlaying && !showCommentSheet) {
      player.play();
    } else {
      player.pause();
    }
  }, [isActive, isScreenFocused, isPlaying, showCommentSheet, player]);

  // Sync mute
  useEffect(() => {
    if (player) {
      player.muted = isMuted;
    }
  }, [isMuted, player]);

  // Follow Status Query
  const { data: isFollowing = false } = useQuery({
    queryKey: ["follow-status", authorId],
    queryFn: () => followService.getFollowStatus(authorId),
    enabled: Boolean(isAuthenticated && authorId && !isOwner),
    staleTime: 60 * 1000,
  });

  // Follow Mutation
  const followMutation = useMutation({
    mutationFn: async (nextStatus: boolean) => {
      if (nextStatus) {
        return followService.followUser(authorId);
      } else {
        return followService.unfollowUser(authorId);
      }
    },
    onMutate: async (nextStatus: boolean) => {
      await queryClient.cancelQueries({ queryKey: ["follow-status", authorId] });
      const prev = queryClient.getQueryData(["follow-status", authorId]);
      queryClient.setQueryData(["follow-status", authorId], nextStatus);
      return { prev };
    },
    onError: (_err, _vars, context: any) => {
      if (context?.prev !== undefined) {
        queryClient.setQueryData(["follow-status", authorId], context.prev);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["follow-status", authorId] });
    },
  });

  const handleFollowToggle = () => {
    if (!isAuthenticated) {
      Alert.alert("Sign In Required", "Please sign in to follow users.", [
        { text: "Cancel", style: "cancel" },
        { text: "Sign In", onPress: () => router.push("/login" as any) },
      ]);
      return;
    }
    if (!authorId || isOwner) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    followMutation.mutate(!isFollowing);
  };

  // Upvote / Like Action
  const handleLike = async () => {
    if (!isAuthenticated) {
      Alert.alert("Sign In Required", "Please sign in to upvote.", [
        { text: "Cancel", style: "cancel" },
        { text: "Sign In", onPress: () => router.push("/login" as any) },
      ]);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    likeScale.value = withSequence(
      withSpring(1.4, { damping: 4, stiffness: 300 }),
      withSpring(1, { damping: 10, stiffness: 200 })
    );

    const prevLiked = isLiked;
    const prevCount = likesCount;

    setIsLiked(!prevLiked);
    setLikesCount(prevLiked ? Math.max(0, prevCount - 1) : prevCount + 1);

    try {
      const res = await postService.likePost(postId);
      if (res && typeof res.likesCount === "number") {
        setLikesCount(res.likesCount);
      }
      if (res && typeof res.liked === "boolean") {
        setIsLiked(res.liked);
      }
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["videoPosts"] });
    } catch (err: any) {
      setIsLiked(prevLiked);
      setLikesCount(prevCount);
      const msg = err?.response?.data?.message || err.message || "Could not vote on reel";
      Alert.alert("Vote Error", msg);
    }
  };

  // Double tap to like with animated heart explosion / Single tap to play/pause
  const handleScreenPress = () => {
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300;

    if (now - lastTapRef.current < DOUBLE_PRESS_DELAY) {
      if (!isAuthenticated) {
        Alert.alert("Sign In Required", "Please sign in to upvote.", [
          { text: "Cancel", style: "cancel" },
          { text: "Sign In", onPress: () => router.push("/login" as any) },
        ]);
        return;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (!isLiked) {
        handleLike();
      }

      setShowHeartAnim(true);
      heartAnimScale.value = 0;
      heartAnimOpacity.value = 1;

      heartAnimScale.value = withSequence(
        withSpring(1.3, { damping: 6, stiffness: 200 }),
        withTiming(1, { duration: 150 })
      );

      heartAnimOpacity.value = withSequence(
        withTiming(1, { duration: 300 }),
        withTiming(0, { duration: 300 }, (finished) => {
          if (finished) {
            runOnJS(setShowHeartAnim)(false);
          }
        })
      );
    } else {
      setIsPlaying((prev) => !prev);
      playIconOpacity.value = withSequence(
        withTiming(1, { duration: 150 }),
        withTiming(0, { duration: 400 })
      );
    }

    lastTapRef.current = now;
  };

  // Save Post
  const handleSave = async () => {
    if (!isAuthenticated) {
      Alert.alert("Sign In Required", "Please sign in to save reels.", [
        { text: "Cancel", style: "cancel" },
        { text: "Sign In", onPress: () => router.push("/login" as any) },
      ]);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsSaved(!isSaved);
    try {
      await postService.savePost(postId);
    } catch {
      setIsSaved(isSaved);
    }
  };

  // Animated styles
  const likeAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: likeScale.value }],
  }));

  const heartPopupStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartAnimScale.value }],
    opacity: heartAnimOpacity.value,
  }));

  const playOverlayStyle = useAnimatedStyle(() => ({
    opacity: playIconOpacity.value,
  }));

  const authorName = post.userName || post.user?.fullName || "User";
  const authorHandle = post.username || post.user?.username || (post.user as any)?.name || "user";
  const avatarUri = getMediaUrl(
    post.userProfilePicture ||
    post.user?.profilePicUrl ||
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"
  );

  return (
    <View style={[styles.container, { height: itemHeight }]}>
      {/* Background Media */}
      <TouchableWithoutFeedback onPress={handleScreenPress}>
        <View style={StyleSheet.absoluteFill}>
          {isVideo && player ? (
            <VideoView
              player={player}
              style={styles.videoPlayer}
              contentFit="cover"
              nativeControls={false}
            />
          ) : (
            <Image
              source={{ uri: mediaUri || avatarUri }}
              style={styles.videoPlayer}
              contentFit="cover"
              transition={200}
            />
          )}

          {/* Centered Play / Pause Flash Indicator */}
          <Animated.View style={[styles.centeredPlayIndicator, playOverlayStyle]} pointerEvents="none">
            <View style={styles.playIconCircle}>
              <Play size={36} color="#FFFFFF" fill="#FFFFFF" />
            </View>
          </Animated.View>

          {/* Double Tap Heart Pop */}
          {showHeartAnim && (
            <Animated.View style={[styles.centeredHeartIndicator, heartPopupStyle]} pointerEvents="none">
              <Heart size={90} color="#EF4444" fill="#EF4444" />
            </Animated.View>
          )}
        </View>
      </TouchableWithoutFeedback>

      {/* Top Controls: Mute Toggle */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.soundBtn}
          onPress={() => {
            Haptics.selectionAsync();
            setIsMuted(!isMuted);
          }}
        >
          {isMuted ? (
            <VolumeX size={18} color="#FFFFFF" />
          ) : (
            <Volume2 size={18} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>

      {/* Right Action Column */}
      <View style={styles.rightActions}>
        {/* Author Avatar + Follow Plus Badge */}
        <View style={styles.avatarContainer}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push(`/s/${authorHandle}` as any)}
          >
            <Image source={{ uri: avatarUri }} style={styles.authorAvatar} contentFit="cover" />
          </TouchableOpacity>

          {!isOwner && !isFollowing && authorId ? (
            <TouchableOpacity
              style={styles.avatarFollowPlus}
              activeOpacity={0.7}
              onPress={handleFollowToggle}
            >
              <Plus size={12} color="#FFFFFF" strokeWidth={3} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Upvote / Like Action */}
        <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7} onPress={handleLike}>
          <Animated.View style={likeAnimStyle}>
            <View style={[styles.iconCircle, isLiked && styles.likedCircle]}>
              <ArrowUp
                size={22}
                color={isLiked ? "#2563EB" : "#FFFFFF"}
                strokeWidth={isLiked ? 3 : 2}
              />
            </View>
          </Animated.View>
          <Text style={[styles.actionCount, isLiked && styles.likedCount]}>{likesCount}</Text>
        </TouchableOpacity>

        {/* Comment Action: In-place Bottom Sheet */}
        <TouchableOpacity
          style={styles.actionBtn}
          activeOpacity={0.7}
          onPress={() => setShowCommentSheet(true)}
        >
          <View style={styles.iconCircle}>
            <MessageCircle size={22} color="#FFFFFF" strokeWidth={2} />
          </View>
          <Text style={styles.actionCount}>{commentCount}</Text>
        </TouchableOpacity>

        {/* Share Action */}
        <TouchableOpacity
          style={styles.actionBtn}
          activeOpacity={0.7}
          onPress={() => setShowShareModal(true)}
        >
          <View style={styles.iconCircle}>
            <Share2 size={22} color="#FFFFFF" strokeWidth={2} />
          </View>
          <Text style={styles.actionCount}>{sharesCount > 0 ? sharesCount : "Share"}</Text>
        </TouchableOpacity>

        {/* Bookmark Action */}
        <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7} onPress={handleSave}>
          <View style={styles.iconCircle}>
            <Bookmark
              size={22}
              color={isSaved ? "#F59E0B" : "#FFFFFF"}
              fill={isSaved ? "#F59E0B" : "none"}
              strokeWidth={2}
            />
          </View>
          <Text style={styles.actionCount}>Save</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Description & Author Info */}
      <View style={styles.bottomInfo}>
        {/* Author Handle */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push(`/s/${authorHandle}` as any)}
          style={styles.authorRow}
        >
          <Text style={styles.authorHandle}>@{authorHandle}</Text>
          <View style={styles.verifiedDot} />
          <Text style={styles.authorFullName}>{authorName}</Text>
        </TouchableOpacity>

        {/* Caption */}
        {post.description ? (
          <Text style={styles.caption} numberOfLines={2}>
            {post.description}
          </Text>
        ) : null}

        {/* Sound / Music Marquee Pill */}
        <View style={styles.musicPill}>
          <Music size={13} color="#FFFFFF" />
          <Text style={styles.musicText} numberOfLines={1}>
            Original Audio — @{authorHandle}
          </Text>
        </View>
      </View>

      {/* In-place Comment Drawer Sheet */}
      <CommentBottomSheet
        visible={showCommentSheet}
        postId={postId}
        onClose={() => setShowCommentSheet(false)}
        onCommentAdded={() => setCommentCount((prev) => prev + 1)}
      />

      {/* Share Modal */}
      <ShareModal
        visible={showShareModal}
        post={post}
        onClose={() => setShowShareModal(false)}
        onShared={() => setSharesCount((prev) => prev + 1)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: WINDOW_WIDTH,
    backgroundColor: "#000000",
    position: "relative",
    overflow: "hidden",
  },
  videoPlayer: {
    ...StyleSheet.absoluteFill,
  },
  topBar: {
    position: "absolute",
    top: Platform.OS === "ios" ? 54 : 44,
    right: 16,
    zIndex: 10,
  },
  soundBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  centeredPlayIndicator: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  playIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    alignItems: "center",
    justifyContent: "center",
    paddingLeft: 4,
  },
  centeredHeartIndicator: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  rightActions: {
    position: "absolute",
    right: 12,
    bottom: 30,
    alignItems: "center",
    gap: 16,
    zIndex: 10,
  },
  avatarContainer: {
    alignItems: "center",
    position: "relative",
    marginBottom: 4,
  },
  authorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    backgroundColor: "#334155",
  },
  avatarFollowPlus: {
    position: "absolute",
    bottom: -6,
    backgroundColor: "#2563EB",
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  actionBtn: {
    alignItems: "center",
    gap: 4,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  likedCircle: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
  },
  actionCount: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  likedCount: {
    color: "#60A5FA",
  },
  bottomInfo: {
    position: "absolute",
    left: 16,
    right: 80,
    bottom: 24,
    zIndex: 10,
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  authorHandle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  verifiedDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.6)",
  },
  authorFullName: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 13,
    fontWeight: "500",
  },
  caption: {
    color: "#FFFFFF",
    fontSize: 13.5,
    lineHeight: 19,
    marginBottom: 10,
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  musicPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  musicText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "500",
    maxWidth: 200,
  },
});

export default ReelItem;
