import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { X, Send, MessageCircle } from "lucide-react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { postService } from "../../services/post.service";
import { IPostComment } from "../../interfaces/post.interface";
import { useAuthStore } from "../../store/auth.store";
import { useRouter } from "expo-router";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

interface CommentBottomSheetProps {
  visible: boolean;
  postId: string;
  onClose: () => void;
  onCommentAdded?: () => void;
}

export const CommentBottomSheet: React.FC<CommentBottomSheetProps> = ({
  visible,
  postId,
  onClose,
  onCommentAdded,
}) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuthStore();
  const [commentText, setCommentText] = useState("");

  const { data: post, isLoading, refetch } = useQuery({
    queryKey: ["post", postId],
    queryFn: () => postService.getPostById(postId),
    enabled: visible && !!postId,
  });

  const comments: IPostComment[] = post?.comments || [];

  const commentMutation = useMutation({
    mutationFn: (text: string) => postService.addComment(postId, text),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCommentText("");
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
    commentMutation.mutate(commentText.trim());
  };

  const userAvatar =
    user?.profilePicUrl ||
    user?.avatar ||
    (typeof (user as any)?.profilePicture === "object"
      ? (user as any)?.profilePicture?.url
      : (user as any)?.profilePicture) ||
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100";

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.dismissOverlay} activeOpacity={1} onPress={onClose} />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.sheetContainer}
        >
          {/* Handle Pill & Header */}
          <View style={styles.header}>
            <View style={styles.dragHandle} />
            <View style={styles.headerRow}>
              <Text style={styles.headerTitle}>
                Comments {comments.length > 0 ? `(${comments.length})` : ""}
              </Text>
              <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Comments List */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#3B82F6" />
            </View>
          ) : (
            <FlatList
              data={comments}
              keyExtractor={(item) => item.id || (item as any)._id || String(Math.random())}
              contentContainerStyle={styles.commentsList}
              renderItem={({ item }) => {
                const avatarUri =
                  item.userProfilePicture ||
                  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100";

                return (
                  <View style={styles.commentItem}>
                    <Image source={{ uri: avatarUri }} style={styles.commentAvatar} contentFit="cover" />
                    <View style={styles.commentContent}>
                      <View style={styles.authorRow}>
                        <Text style={styles.commentAuthor}>{item.userName || "User"}</Text>
                        <Text style={styles.commentTime}>
                          {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ""}
                        </Text>
                      </View>
                      <Text style={styles.commentText}>{item.text}</Text>
                    </View>
                  </View>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <MessageCircle size={36} color="#94A3B8" />
                  <Text style={styles.emptyTitle}>No comments yet</Text>
                  <Text style={styles.emptySubtitle}>Be the first to share your thoughts!</Text>
                </View>
              }
            />
          )}

          {/* Input Bar */}
          <SafeAreaView edges={["bottom"]} style={styles.inputContainer}>
            <Image source={{ uri: userAvatar }} style={styles.myAvatar} contentFit="cover" />
            <TextInput
              placeholder={isAuthenticated ? "Add a comment..." : "Sign in to comment..."}
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
                <Send size={16} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "transparent",
    justifyContent: "flex-end",
  },
  dismissOverlay: {
    flex: 1,
  },
  sheetContainer: {
    height: SCREEN_HEIGHT * 0.7,
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
    paddingTop: 10,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    alignItems: "center",
  },
  dragHandle: {
    width: 40,
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
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  commentsList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  commentItem: {
    flexDirection: "row",
    marginBottom: 14,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E2E8F0",
  },
  commentContent: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 10,
    marginLeft: 10,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  commentAuthor: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  commentTime: {
    fontSize: 11,
    color: "#94A3B8",
  },
  commentText: {
    fontSize: 13.5,
    color: "#334155",
    lineHeight: 18,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#475569",
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#94A3B8",
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    gap: 10,
  },
  myAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#E2E8F0",
  },
  textInput: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 90,
    fontSize: 14,
    color: "#0F172A",
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#3B82F6",
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: {
    backgroundColor: "#94A3B8",
    opacity: 0.5,
  },
});
