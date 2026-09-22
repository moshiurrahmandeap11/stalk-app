import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
} from "react-native-reanimated";
import {
  ArrowUp,
  ArrowDown,
  MessageCircle,
  Share2,
  MoreHorizontal,
} from "lucide-react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { IPost } from "../../interfaces/post.interface";
import { postService } from "../../services/post.service";
import { followService } from "../../services/follow.service";
import { useAuthStore } from "../../store/auth.store";
import { SharedPostPreview } from "./SharedPostPreview";
import { ShareModal } from "./ShareModal";
import { CommentBottomSheet } from "./CommentBottomSheet";
import { FeedVideoPlayer } from "./FeedVideoPlayer";
import { getMediaUrl } from "../../utils/media";
import { updateFeedCacheItem } from "../../utils/feedCache";

interface PostCardProps {
  post: IPost;
  isVisible?: boolean;
  onPressComment?: () => void;
  onPressUser?: (username?: string | null) => void;
  onPostDeleted?: (postId: string) => void;
}

const getTimeAgo = (dateStr?: string | Date) => {
  if (!dateStr) return "just now";
  const seconds = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const intervals: Record<string, number> = {
    y: 31536000,
    mo: 2592000,
    w: 604800,
    d: 86400,
    h: 3600,
    m: 60,
  };
  for (const [unit, s] of Object.entries(intervals)) {
    const n = Math.floor(seconds / s);
    if (n >= 1) return `${n}${unit} ago`;
  }
  return "just now";
};

export const PostCard: React.FC<PostCardProps> = ({
  post,
  isVisible = false,
  onPressComment,
  onPressUser,
  onPostDeleted,
}) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const postId = post.id || (post as any)._id;
  const authorId = post.userId || post.user?.id || (post.user as any)?._id;
  const isOwner = Boolean(currentUserId && authorId && currentUserId === authorId);

  // Likes / Upvotes state
  const initialLiked = Boolean(
    (currentUserId && post.likes && post.likes.includes(currentUserId)) ||
      post.isLikedByCurrentUser
  );
  const [isUpvoted, setIsUpvoted] = useState(initialLiked);
  const [isDownvoted, setIsDownvoted] = useState(false);
  const [likesCount, setLikesCount] = useState(
    post.likesCount ?? (post.likes ? post.likes.length : 0)
  );

  // Comments state
  const [showCommentSheet, setShowCommentSheet] = useState(false);
  const [commentCount, setCommentCount] = useState(
    post.commentsCount ?? (post.comments ? post.comments.length : 0)
  );

  // Share state
  const [showShareModal, setShowShareModal] = useState(false);
  const [sharesCount, setSharesCount] = useState(post.sharesCount ?? 0);

  // Sync props when post updates
  useEffect(() => {
    const liked = Boolean(
      (currentUserId && post.likes && post.likes.includes(currentUserId)) ||
        post.isLikedByCurrentUser
    );
    setIsUpvoted(liked);
    setLikesCount(post.likesCount ?? (post.likes ? post.likes.length : 0));
    setCommentCount(post.commentsCount ?? (post.comments ? post.comments.length : 0));
  }, [post.likes, post.likesCount, post.isLikedByCurrentUser, post.commentsCount, currentUserId]);

  // Animations
  const upvoteScale = useSharedValue(1);
  const downvoteScale = useSharedValue(1);

  const upvoteAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: upvoteScale.value }],
  }));

  const downvoteAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: downvoteScale.value }],
  }));

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

  const handleToggleFollow = () => {
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

  // Upvote Handler
  const handleUpvote = async () => {
    if (!isAuthenticated || !currentUserId) {
      Alert.alert("Sign In Required", "Please sign in to vote on posts.", [
        { text: "Cancel", style: "cancel" },
        { text: "Sign In", onPress: () => router.push("/login" as any) },
      ]);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    upvoteScale.value = withSequence(
      withSpring(1.35, { damping: 4, stiffness: 300 }),
      withSpring(1, { damping: 12, stiffness: 200 })
    );

    const prevUpvoted = isUpvoted;
    const prevDownvoted = isDownvoted;
    const prevCount = likesCount;

    const nextUpvoted = !prevUpvoted;
    const nextDownvoted = false;
    const nextCount = prevUpvoted
      ? Math.max(0, prevCount - 1)
      : prevDownvoted
      ? prevCount + 2
      : prevCount + 1;

    setIsUpvoted(nextUpvoted);
    setIsDownvoted(nextDownvoted);
    setLikesCount(nextCount);

    // Instant optimistic update across all active feed queries
    queryClient.setQueriesData({ queryKey: ["posts"] }, (old: any) => {
      if (!old || !old.data || !Array.isArray(old.data)) return old;
      return {
        ...old,
        data: old.data.map((p: any) => {
          const pId = p.id || p._id;
          if (pId === postId) {
            return {
              ...p,
              isLikedByCurrentUser: nextUpvoted,
              likesCount: nextCount,
              likes: nextUpvoted
                ? [...(p.likes || []).filter((id: string) => id !== currentUserId), currentUserId]
                : (p.likes || []).filter((id: string) => id !== currentUserId),
            };
          }
          return p;
        }),
      };
    });

    // Persist to local disk feed cache
    updateFeedCacheItem(postId, (p) => ({
      ...p,
      isLikedByCurrentUser: nextUpvoted,
      likesCount: nextCount,
      likes: nextUpvoted
        ? [...(p.likes || []).filter((id: string) => id !== currentUserId), currentUserId]
        : (p.likes || []).filter((id: string) => id !== currentUserId),
    }));

    try {
      const res = await postService.likePost(postId);
      if (res && typeof (res as any).likesCount === "number") {
        setLikesCount((res as any).likesCount);
      }
    } catch (err: any) {
      setIsUpvoted(prevUpvoted);
      setIsDownvoted(prevDownvoted);
      setLikesCount(prevCount);
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      const msg = err?.response?.data?.message || err.message || "Could not vote on post";
      Alert.alert("Vote Error", msg);
    }
  };

  // Downvote Handler
  const handleDownvote = async () => {
    if (!isAuthenticated || !currentUserId) {
      Alert.alert("Sign In Required", "Please sign in to vote on posts.", [
        { text: "Cancel", style: "cancel" },
        { text: "Sign In", onPress: () => router.push("/login" as any) },
      ]);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    downvoteScale.value = withSequence(
      withSpring(1.35, { damping: 4, stiffness: 300 }),
      withSpring(1, { damping: 12, stiffness: 200 })
    );

    const prevUpvoted = isUpvoted;
    const prevDownvoted = isDownvoted;
    const prevCount = likesCount;

    if (prevDownvoted) {
      setIsDownvoted(false);
    } else {
      setIsDownvoted(true);
      if (prevUpvoted) {
        const nextCount = Math.max(0, prevCount - 1);
        setIsUpvoted(false);
        setLikesCount(nextCount);

        queryClient.setQueriesData({ queryKey: ["posts"] }, (old: any) => {
          if (!old || !old.data || !Array.isArray(old.data)) return old;
          return {
            ...old,
            data: old.data.map((p: any) => {
              const pId = p.id || p._id;
              if (pId === postId) {
                return {
                  ...p,
                  isLikedByCurrentUser: false,
                  likesCount: nextCount,
                  likes: (p.likes || []).filter((id: string) => id !== currentUserId),
                };
              }
              return p;
            }),
          };
        });

        updateFeedCacheItem(postId, (p) => ({
          ...p,
          isLikedByCurrentUser: false,
          likesCount: nextCount,
          likes: (p.likes || []).filter((id: string) => id !== currentUserId),
        }));

        try {
          const res = await postService.likePost(postId);
          if (res && typeof (res as any).likesCount === "number") {
            setLikesCount((res as any).likesCount);
          }
        } catch {
          setIsUpvoted(prevUpvoted);
          setLikesCount(prevCount);
          queryClient.invalidateQueries({ queryKey: ["posts"] });
        }
      }
    }
  };

  const handleOptions = () => {
    Haptics.selectionAsync();
    const options: { text: string; onPress?: () => void; style?: "default" | "cancel" | "destructive" }[] = [
      {
        text: "Copy Post Link",
        onPress: async () => {
          await Clipboard.setStringAsync(`https://stalk.com/post/details/${postId}`);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert("Link Copied", "Post link copied to clipboard!");
        },
      },
    ];

    if (isOwner) {
      options.push({
        text: "Delete Post",
        style: "destructive",
        onPress: () => {
          Alert.alert("Delete Post", "Are you sure you want to permanently delete this post?", [
            { text: "Cancel", style: "cancel" },
            {
              text: "Delete",
              style: "destructive",
              onPress: async () => {
                try {
                  await postService.deletePost(postId);
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  onPostDeleted?.(postId);
                  queryClient.invalidateQueries({ queryKey: ["posts"] });
                } catch {
                  Alert.alert("Error", "Could not delete post.");
                }
              },
            },
          ]);
        },
      });
    }

    options.push({ text: "Cancel", style: "cancel" });
    Alert.alert("Post Options", undefined, options);
  };

  const rawMediaUri = post.media?.url || post.mediaUrl || "";
  const mediaUri = getMediaUrl(rawMediaUri);
  const isVideo =
    post.mediaType === "video" ||
    post.media?.resourceType === "video" ||
    /\.(mp4|mov|webm|m4v)$/i.test(mediaUri);

  const authorName = post.userName || post.user?.fullName || "User";
  const authorHandle = post.username || post.user?.username || authorName.toLowerCase().replace(/\s+/g, "");
  const avatarUri = getMediaUrl(
    post.userProfilePicture ||
    post.user?.profilePicUrl ||
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"
  );

  return (
    <View style={styles.card}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.authorSection}
          activeOpacity={0.8}
          onPress={() => onPressUser?.(authorHandle)}
        >
          <Image source={{ uri: avatarUri }} style={styles.avatar} contentFit="cover" />
          <View style={styles.headerInfo}>
            <View style={styles.authorRow}>
              <Text style={styles.authorName} numberOfLines={1}>
                {authorName}
              </Text>
              {post.isShare && (
                <Text style={styles.sharedBadge}>shared a post</Text>
              )}
            </View>
            <Text style={styles.username}>
              @{authorHandle} • {getTimeAgo(post.createdAt)}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Right side: Follow Button & More Options */}
        <View style={styles.headerRight}>
          {!isOwner && authorId ? (
            <TouchableOpacity
              style={[
                styles.followBtn,
                isFollowing ? styles.followingBtn : styles.notFollowingBtn,
              ]}
              activeOpacity={0.7}
              onPress={handleToggleFollow}
            >
              <Text
                style={[
                  styles.followBtnText,
                  isFollowing ? styles.followingBtnText : styles.notFollowingBtnText,
                ]}
              >
                {isFollowing ? "Following" : "Follow +"}
              </Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={styles.optionsBtn}
            activeOpacity={0.7}
            onPress={handleOptions}
          >
            <MoreHorizontal size={20} color="#64748B" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Post Text Description */}
      {post.description ? (
        <Text style={styles.description}>{post.description}</Text>
      ) : null}

      {/* Shared Post Preview (if this post is a shared post) */}
      {(post.isShare || post.originalPost) && (
        <SharedPostPreview
          originalPost={post.originalPost}
          onPress={() => setShowCommentSheet(true)}
        />
      )}

      {/* Media Rendering: Facebook-style auto-play video or Image */}
      {mediaUri && !post.isShare ? (
        isVideo ? (
          <FeedVideoPlayer uri={mediaUri} isVisible={isVisible} />
        ) : (
          <TouchableOpacity
            style={styles.mediaContainer}
            activeOpacity={0.9}
            onPress={() => setShowCommentSheet(true)}
          >
            <Image
              source={{ uri: mediaUri }}
              style={styles.postMedia}
              contentFit="cover"
              transition={200}
            />
          </TouchableOpacity>
        )
      ) : null}

      {/* Action Bar (Reddit/Facebook Hybrid) */}
      <View style={styles.actions}>
        {/* Upvote & Downvote Pill Container */}
        <View style={styles.votePill}>
          <TouchableOpacity
            style={styles.voteBtn}
            activeOpacity={0.7}
            onPress={handleUpvote}
          >
            <Animated.View style={upvoteAnimStyle}>
              <ArrowUp
                size={18}
                color={isUpvoted ? "#2563EB" : "#64748B"}
                strokeWidth={isUpvoted ? 2.8 : 2}
              />
            </Animated.View>
            <Text
              style={[
                styles.voteCount,
                isUpvoted && styles.upvotedText,
                isDownvoted && styles.downvotedText,
              ]}
            >
              {likesCount}
            </Text>
          </TouchableOpacity>

          <View style={styles.voteDivider} />

          <TouchableOpacity
            style={styles.voteBtn}
            activeOpacity={0.7}
            onPress={handleDownvote}
          >
            <Animated.View style={downvoteAnimStyle}>
              <ArrowDown
                size={18}
                color={isDownvoted ? "#F43F5E" : "#64748B"}
                strokeWidth={isDownvoted ? 2.8 : 2}
              />
            </Animated.View>
          </TouchableOpacity>
        </View>

        {/* Comment Button (Opens In-Place Comments Drawer) */}
        <TouchableOpacity
          style={styles.actionBtn}
          activeOpacity={0.7}
          onPress={() => setShowCommentSheet(true)}
        >
          <MessageCircle size={18} color="#64748B" strokeWidth={2} />
          <Text style={styles.actionText}>
            {commentCount > 0 ? `${commentCount} Comments` : "Comment"}
          </Text>
        </TouchableOpacity>

        {/* Share Button */}
        <TouchableOpacity
          style={styles.actionBtn}
          activeOpacity={0.7}
          onPress={() => setShowShareModal(true)}
        >
          <Share2 size={18} color="#64748B" strokeWidth={2} />
          <Text style={styles.actionText}>
            {sharesCount > 0 ? `${sharesCount} Shares` : "Share"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Telegram-style Share Modal Sheet */}
      <ShareModal
        visible={showShareModal}
        post={post}
        onClose={() => setShowShareModal(false)}
        onShared={() => {
          const nextCount = sharesCount + 1;
          setSharesCount(nextCount);
          queryClient.setQueriesData({ queryKey: ["posts"] }, (old: any) => {
            if (!old || !old.data || !Array.isArray(old.data)) return old;
            return {
              ...old,
              data: old.data.map((p: any) =>
                (p.id || p._id) === postId ? { ...p, sharesCount: nextCount } : p
              ),
            };
          });
          updateFeedCacheItem(postId, (p) => ({ ...p, sharesCount: nextCount }));
        }}
      />

      {/* In-Place Comments Bottom Sheet */}
      <CommentBottomSheet
        visible={showCommentSheet}
        postId={postId}
        onClose={() => setShowCommentSheet(false)}
        onCommentAdded={() => {
          const nextCount = commentCount + 1;
          setCommentCount(nextCount);
          queryClient.setQueriesData({ queryKey: ["posts"] }, (old: any) => {
            if (!old || !old.data || !Array.isArray(old.data)) return old;
            return {
              ...old,
              data: old.data.map((p: any) =>
                (p.id || p._id) === postId ? { ...p, commentsCount: nextCount } : p
              ),
            };
          });
          updateFeedCacheItem(postId, (p) => ({ ...p, commentsCount: nextCount }));
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  authorSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E2E8F0",
  },
  headerInfo: {
    marginLeft: 12,
    flex: 1,
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  authorName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    maxWidth: "75%",
  },
  sharedBadge: {
    fontSize: 12,
    color: "#64748B",
    fontStyle: "italic",
  },
  username: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  followBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
  },
  notFollowingBtn: {
    backgroundColor: "#EFF6FF",
    borderColor: "#3B82F6",
  },
  followingBtn: {
    backgroundColor: "#F1F5F9",
    borderColor: "#CBD5E1",
  },
  followBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
  notFollowingBtnText: {
    color: "#2563EB",
  },
  followingBtnText: {
    color: "#64748B",
  },
  optionsBtn: {
    padding: 4,
  },
  description: {
    fontSize: 15,
    color: "#1E293B",
    lineHeight: 22,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  mediaContainer: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: "#0F172A",
  },
  postMedia: {
    width: "100%",
    height: "100%",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#F8FAFC",
  },
  votePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 20,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  voteBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 5,
    gap: 5,
  },
  voteDivider: {
    width: 1,
    height: 14,
    backgroundColor: "#CBD5E1",
  },
  voteCount: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
  },
  upvotedText: {
    color: "#2563EB",
  },
  downvotedText: {
    color: "#F43F5E",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  actionText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },
});
