import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { ArrowLeft, Send } from "lucide-react-native";
import { postService } from "../../services/post.service";
import { PostCard } from "../../components/post/PostCard";
import { IPostComment } from "../../interfaces/post.interface";

export default function PostDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = useState("");

  const { data: post, isLoading } = useQuery({
    queryKey: ["post", id],
    queryFn: () => postService.getPostById(id!),
    enabled: !!id,
  });

  const commentMutation = useMutation({
    mutationFn: (text: string) => postService.addComment(id!, text),
    onSuccess: () => {
      setCommentText("");
      queryClient.invalidateQueries({ queryKey: ["post", id] });
    },
  });

  const handleSendComment = () => {
    if (!commentText.trim()) return;
    commentMutation.mutate(commentText.trim());
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (!post) {
    return (
      <SafeAreaView style={styles.notFoundContainer}>
        <Text style={styles.notFoundText}>Post not found</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backIconBtn} onPress={() => router.back()}>
          <ArrowLeft size={22} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post</Text>
        <View style={{ width: 38 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <PostCard
            post={post}
            onPressUser={(username) => {
              if (username) router.push(`/s/${username}` as any);
            }}
          />

          {/* Comments Section */}
          <View style={styles.commentsSection}>
            <Text style={styles.commentsHeader}>
              Comments ({post.comments?.length || 0})
            </Text>

            {(post.comments || []).map((c: IPostComment) => {
              const avatar =
                c.userProfilePicture ||
                "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150";

              return (
                <View key={c.id} style={styles.commentItem}>
                  <Image source={{ uri: avatar }} style={styles.commentAvatar} contentFit="cover" />
                  <View style={styles.commentBody}>
                    <Text style={styles.commentAuthor}>{c.userName}</Text>
                    <Text style={styles.commentText}>{c.text}</Text>
                    <Text style={styles.commentTime}>
                      {new Date(c.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>

        {/* Comment Input */}
        <View style={styles.inputBar}>
          <TextInput
            placeholder="Write a comment..."
            placeholderTextColor="#94A3B8"
            style={styles.commentInput}
            value={commentText}
            onChangeText={setCommentText}
          />
          <TouchableOpacity
            style={[styles.sendBtn, !commentText.trim() && styles.sendBtnDisabled]}
            onPress={handleSendComment}
            disabled={!commentText.trim() || commentMutation.isPending}
          >
            {commentMutation.isPending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Send size={18} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
  backIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
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
  },
  notFoundText: {
    fontSize: 18,
    color: "#64748B",
  },
  backBtn: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#3B82F6",
    borderRadius: 16,
  },
  backText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  scrollContent: {
    paddingBottom: 24,
  },
  commentsSection: {
    paddingHorizontal: 16,
    marginTop: 8,
  },
  commentsHeader: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 12,
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
  commentBody: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 14,
    marginLeft: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  commentText: {
    fontSize: 14,
    color: "#334155",
    marginTop: 2,
    lineHeight: 18,
  },
  commentTime: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 6,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  commentInput: {
    flex: 1,
    height: 44,
    backgroundColor: "#F1F5F9",
    borderRadius: 22,
    paddingHorizontal: 16,
    fontSize: 14,
    color: "#0F172A",
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#3B82F6",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },
  sendBtnDisabled: {
    backgroundColor: "#94A3B8",
  },
});

