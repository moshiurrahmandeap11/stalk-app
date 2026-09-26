import React, { useState, useEffect, useRef } from "react";
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
  Alert,
  Dimensions,
  Keyboard,
  LayoutAnimation,
  UIManager,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import {
  X,
  Send,
  MessageCircle,
  ArrowBigUp,
  ArrowBigDown,
  CornerDownRight,
  ChevronDown,
  ChevronUp,
} from "lucide-react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { postService } from "../../services/post.service";
import { IPostComment } from "../../interfaces/post.interface";
import { useAuthStore } from "../../store/auth.store";
import { useRouter } from "expo-router";
import { getMediaUrl, DEFAULT_AVATAR } from "../../utils/media";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

interface CommentBottomSheetProps {
  visible: boolean;
  postId: string;
  onClose: () => void;
  onCommentAdded?: () => void;
}

interface IReplyingTo {
  commentId: string;
  authorName: string;
}

function formatRelativeTime(dateString?: string | Date | null): string {
  if (!dateString) return "";
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export const CommentBottomSheet: React.FC<CommentBottomSheetProps> = ({
  visible,
  postId,
  onClose,
  onCommentAdded,
}) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuthStore();

  const [commentText, setCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState<IReplyingTo | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});
  const [commentVotes, setCommentVotes] = useState<
    Record<string, { userVote: "up" | "down" | null; scoreOffset: number }>
  >({});
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (e) => {
      const h = e?.endCoordinates?.height || 0;
      if (h > 0) {
        try {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        } catch {}
        setKeyboardHeight(h);
      }
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      try {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      } catch {}
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const inputRef = useRef<TextInput>(null);
  const flatListRef = useRef<FlatList>(null);

  const { data: post, isLoading, refetch } = useQuery({
    queryKey: ["post", postId],
    queryFn: () => postService.getPostById(postId),
    enabled: visible && !!postId,
  });

  const comments: IPostComment[] = post?.comments || [];

  const commentMutation = useMutation({
    mutationFn: ({ text, parentId }: { text: string; parentId?: string }) =>
      postService.addComment(postId, text, parentId),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCommentText("");
      if (replyingTo) {
        setExpandedReplies((prev) => ({ ...prev, [replyingTo.commentId]: true }));
      }
      setReplyingTo(null);
      refetch();
      queryClient.invalidateQueries({ queryKey: ["post", postId] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      onCommentAdded?.();
    },
    onError: (err: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const msg = err?.response?.data?.message || err.message || "Could not post comment.";
      Alert.alert("Comment Failed", msg);
    },
  });

  const handleSendComment = () => {
    if (!commentText.trim()) return;

    if (!isAuthenticated) {
      Alert.alert(
        "Sign In Required",
        "Please sign in to write a comment.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Sign In",
            onPress: () => {
              onClose();
              router.push("/login" as any);
            },
          },
        ]
      );
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    commentMutation.mutate({
      text: commentText.trim(),
      parentId: replyingTo?.commentId,
    });
  };

  const handleStartReply = (commentId: string, authorName: string) => {
    Haptics.selectionAsync();
    setReplyingTo({ commentId, authorName });
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  const handleCancelReply = () => {
    Haptics.selectionAsync();
    setReplyingTo(null);
  };

  const toggleRepliesExpanded = (commentId: string) => {
    Haptics.selectionAsync();
    try {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    } catch {}
    setExpandedReplies((prev) => ({
      ...prev,
      [commentId]: !prev[commentId],
    }));
  };

  const handleNavigateProfile = (username?: string | null, userId?: string | null) => {
    Haptics.selectionAsync();
    onClose();
    const target = username || userId;
    if (target) {
      router.push(`/s/${target}` as any);
    }
  };

  const handleVote = (commentId: string, direction: "up" | "down") => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCommentVotes((prev) => {
      const current = prev[commentId] || { userVote: null, scoreOffset: 0 };
      if (current.userVote === direction) {
        const newOffset = current.scoreOffset + (direction === "up" ? -1 : 1);
        return {
          ...prev,
          [commentId]: { userVote: null, scoreOffset: newOffset },
        };
      } else {
        const delta =
          current.userVote === null
            ? direction === "up"
              ? 1
              : -1
            : direction === "up"
            ? 2
            : -2;
        return {
          ...prev,
          [commentId]: {
            userVote: direction,
            scoreOffset: current.scoreOffset + delta,
          },
        };
      }
    });
  };

  const userAvatar =
    getMediaUrl(
      user?.profilePicUrl ||
        user?.avatar ||
        (typeof (user as any)?.profilePicture === "object"
          ? (user as any)?.profilePicture?.url
          : (user as any)?.profilePicture)
    ) || DEFAULT_AVATAR;

  const renderComment = (item: IPostComment, isReply = false) => {
    const avatarUri = getMediaUrl(item.userProfilePicture) || DEFAULT_AVATAR;
    const commentId = item.id || (item as any)._id || "";
    const replies = item.replies || [];
    const hasReplies = replies.length > 0;
    const isExpanded = Boolean(expandedReplies[commentId]);

    const voteState = commentVotes[commentId] || { userVote: null, scoreOffset: 0 };
    const baseScore = item.score || 0;
    const finalScore = baseScore + voteState.scoreOffset;

    return (
      <View key={commentId} style={[styles.commentWrapper, isReply && styles.replyWrapper]}>
        <View style={styles.commentRow}>
          {/* Author Avatar with Profile Navigation */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => handleNavigateProfile(item.userUsername, item.userId)}
            style={styles.avatarTouch}
          >
            <Image
              source={{ uri: avatarUri }}
              style={isReply ? styles.replyAvatar : styles.commentAvatar}
              contentFit="cover"
            />
          </TouchableOpacity>

          {/* Comment Bubble & Actions */}
          <View style={styles.commentContent}>
            {/* Bubble */}
            <View style={styles.bubble}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => handleNavigateProfile(item.userUsername, item.userId)}
                style={styles.authorRow}
              >
                <Text style={styles.commentAuthor}>{item.userName || "User"}</Text>
                <Text style={styles.commentTime}>{formatRelativeTime(item.createdAt)}</Text>
              </TouchableOpacity>
              <Text style={styles.commentText}>{item.text}</Text>
            </View>

            {/* Comment Action Bar (Upvote, Downvote, Reply) */}
            <View style={styles.actionBar}>
              {/* Upvote */}
              <TouchableOpacity
                style={styles.actionVoteBtn}
                activeOpacity={0.7}
                onPress={() => handleVote(commentId, "up")}
              >
                <ArrowBigUp
                  size={16}
                  color={voteState.userVote === "up" ? "#0A7CFF" : "#64748B"}
                  fill={voteState.userVote === "up" ? "#0A7CFF" : "transparent"}
                />
              </TouchableOpacity>

              {/* Vote Score */}
              {finalScore !== 0 && (
                <Text
                  style={[
                    styles.voteScoreText,
                    voteState.userVote === "up" && styles.voteScoreUp,
                    voteState.userVote === "down" && styles.voteScoreDown,
                  ]}
                >
                  {finalScore > 0 ? `+${finalScore}` : finalScore}
                </Text>
              )}

              {/* Downvote */}
              <TouchableOpacity
                style={styles.actionVoteBtn}
                activeOpacity={0.7}
                onPress={() => handleVote(commentId, "down")}
              >
                <ArrowBigDown
                  size={16}
                  color={voteState.userVote === "down" ? "#EF4444" : "#64748B"}
                  fill={voteState.userVote === "down" ? "#EF4444" : "transparent"}
                />
              </TouchableOpacity>

              <View style={styles.actionDivider} />

              {/* Reply Button */}
              <TouchableOpacity
                style={styles.replyActionBtn}
                activeOpacity={0.7}
                onPress={() => handleStartReply(commentId, item.userName || "User")}
              >
                <CornerDownRight size={13} color="#64748B" />
                <Text style={styles.replyActionText}>Reply</Text>
              </TouchableOpacity>
            </View>

            {/* View Replies Toggle Button */}
            {!isReply && hasReplies && (
              <TouchableOpacity
                style={styles.toggleRepliesBtn}
                activeOpacity={0.7}
                onPress={() => toggleRepliesExpanded(commentId)}
              >
                <View style={styles.toggleRepliesLine} />
                {isExpanded ? (
                  <ChevronUp size={14} color="#0A7CFF" />
                ) : (
                  <ChevronDown size={14} color="#0A7CFF" />
                )}
                <Text style={styles.toggleRepliesText}>
                  {isExpanded
                    ? "Hide replies"
                    : `View ${replies.length} ${replies.length === 1 ? "reply" : "replies"}`}
                </Text>
              </TouchableOpacity>
            )}

            {/* Indented Tree-Type Nested Replies */}
            {!isReply && hasReplies && isExpanded && (
              <View style={styles.nestedRepliesContainer}>
                {replies.map((reply) => renderComment(reply, true))}
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  const bottomPadding =
    keyboardHeight > 0
      ? keyboardHeight + (Platform.OS === "android" ? Math.max(insets.bottom, 16) + 12 : insets.bottom)
      : Math.max(insets.bottom, 10);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      statusBarTranslucent={true}
      onRequestClose={() => {
        Keyboard.dismiss();
        onClose();
      }}
    >
      <View style={styles.backdrop}>
        {/* Dismiss overlay backdrop */}
        <TouchableOpacity
          style={styles.dismissOverlay}
          activeOpacity={1}
          onPress={() => {
            Keyboard.dismiss();
            onClose();
          }}
        />

        <View
          style={[
            styles.sheetContainer,
            {
              height:
                keyboardHeight > 0
                  ? Math.max(SCREEN_HEIGHT * 0.78, keyboardHeight + 250)
                  : SCREEN_HEIGHT * 0.72,
              paddingBottom: bottomPadding,
            },
          ]}
        >
          {/* Handle Pill & Header */}
          <View style={styles.header}>
            <View style={styles.dragHandle} />
            <View style={styles.headerRow}>
              <Text style={styles.headerTitle}>
                Comments {comments.length > 0 ? `(${comments.length})` : ""}
              </Text>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => {
                  Keyboard.dismiss();
                  onClose();
                }}
              >
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Comments List */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#0A7CFF" />
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={comments}
              keyExtractor={(item) => item.id || (item as any)._id || String(Math.random())}
              style={styles.flatList}
              contentContainerStyle={styles.commentsList}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => renderComment(item)}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <MessageCircle size={36} color="#94A3B8" />
                  <Text style={styles.emptyTitle}>No comments yet</Text>
                  <Text style={styles.emptySubtitle}>Be the first to share your thoughts!</Text>
                </View>
              }
            />
          )}

          {/* Replying-To Banner */}
          {replyingTo && (
            <View style={styles.replyingBar}>
              <View style={styles.replyingLeft}>
                <CornerDownRight size={14} color="#0A7CFF" />
                <Text style={styles.replyingText}>
                  Replying to <Text style={styles.replyingName}>@{replyingTo.authorName}</Text>
                </Text>
              </View>
              <TouchableOpacity style={styles.cancelReplyBtn} onPress={handleCancelReply}>
                <X size={14} color="#64748B" />
              </TouchableOpacity>
            </View>
          )}

          {/* Input Bar */}
          <View style={styles.inputContainer}>
            <Image source={{ uri: userAvatar }} style={styles.myAvatar} contentFit="cover" />
            <TextInput
              ref={inputRef}
              placeholder={
                replyingTo
                  ? `Reply to @${replyingTo.authorName}...`
                  : isAuthenticated
                  ? "Add a comment..."
                  : "Sign in to comment..."
              }
              placeholderTextColor="#94A3B8"
              style={styles.textInput}
              value={commentText}
              onChangeText={setCommentText}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[
                styles.sendBtn,
                (!commentText.trim() || commentMutation.isPending) && styles.sendBtnDisabled,
              ]}
              disabled={!commentText.trim() || commentMutation.isPending}
              onPress={handleSendComment}
            >
              {commentMutation.isPending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Send size={15} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    justifyContent: "flex-end",
  },
  dismissOverlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  sheetContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15,
    shadowRadius: 18,
    elevation: 24,
    overflow: "hidden",
  },
  header: {
    paddingTop: 8,
    paddingBottom: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    alignItems: "center",
  },
  dragHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#CBD5E1",
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  flatList: {
    flex: 1,
  },
  commentsList: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  commentWrapper: {
    marginBottom: 12,
  },
  replyWrapper: {
    marginTop: 8,
    marginBottom: 0,
  },
  commentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  avatarTouch: {
    marginRight: 8,
    marginTop: 2,
  },
  commentAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#E2E8F0",
  },
  replyAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#E2E8F0",
  },
  commentContent: {
    flex: 1,
  },
  bubble: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  commentAuthor: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#0F172A",
  },
  commentTime: {
    fontSize: 11,
    color: "#94A3B8",
  },
  commentText: {
    fontSize: 13,
    color: "#334155",
    lineHeight: 18,
  },
  actionBar: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    marginLeft: 6,
    gap: 4,
  },
  actionVoteBtn: {
    padding: 3,
    borderRadius: 6,
  },
  voteScoreText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#64748B",
    minWidth: 16,
    textAlign: "center",
  },
  voteScoreUp: {
    color: "#0A7CFF",
  },
  voteScoreDown: {
    color: "#EF4444",
  },
  actionDivider: {
    width: 1,
    height: 10,
    backgroundColor: "#E2E8F0",
    marginHorizontal: 4,
  },
  replyActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 3,
    gap: 4,
  },
  replyActionText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#64748B",
  },
  toggleRepliesBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    marginLeft: 6,
    gap: 6,
  },
  toggleRepliesLine: {
    width: 16,
    height: 1,
    backgroundColor: "#CBD5E1",
  },
  toggleRepliesText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0A7CFF",
  },
  nestedRepliesContainer: {
    marginTop: 6,
    marginLeft: 4,
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: "#E2E8F0",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#475569",
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 12.5,
    color: "#94A3B8",
    marginTop: 4,
  },
  replyingBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 7,
    backgroundColor: "#EFF6FF",
    borderTopWidth: 1,
    borderTopColor: "#DBEAFE",
  },
  replyingLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  replyingText: {
    fontSize: 12,
    color: "#1E40AF",
  },
  replyingName: {
    fontWeight: "700",
    color: "#0A7CFF",
  },
  cancelReplyBtn: {
    padding: 4,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    gap: 8,
  },
  myAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E2E8F0",
  },
  textInput: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    maxHeight: 80,
    fontSize: 13.5,
    color: "#0F172A",
  },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#0A7CFF",
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: {
    backgroundColor: "#94A3B8",
    opacity: 0.5,
  },
});
