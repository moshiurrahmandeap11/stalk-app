import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Image } from "expo-image";
import { Heart, MessageCircle, Share2, Repeat2 } from "lucide-react-native";
import { IPost } from "../../interfaces/post.interface";
import { postService } from "../../services/post.service";
import { useAuthStore } from "../../store/auth.store";

interface PostCardProps {
  post: IPost;
  onPressComment?: () => void;
  onPressUser?: (username?: string | null) => void;
}

export const PostCard: React.FC<PostCardProps> = ({ post, onPressComment, onPressUser }) => {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [isLiked, setIsLiked] = useState(
    currentUserId ? post.likes.includes(currentUserId) : false
  );
  const [likesCount, setLikesCount] = useState(post.likesCount || post.likes.length || 0);

  const handleLike = async () => {
    // Optimistic update
    const nextState = !isLiked;
    setIsLiked(nextState);
    setLikesCount((prev) => (nextState ? prev + 1 : Math.max(0, prev - 1)));

    try {
      await postService.likePost(post.id);
    } catch {
      // Revert on error
      setIsLiked(!nextState);
      setLikesCount((prev) => (!nextState ? prev + 1 : Math.max(0, prev - 1)));
    }
  };

  const avatarUri =
    post.userProfilePicture ||
    post.user?.profilePicUrl ||
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150";

  const mediaUri = post.media?.url || post.mediaUrl;

  return (
    <View style={styles.card}>
      {/* Author Header */}
      <TouchableOpacity
        style={styles.header}
        activeOpacity={0.8}
        onPress={() => onPressUser?.(post.username || post.user?.username)}
      >
        <Image source={{ uri: avatarUri }} style={styles.avatar} contentFit="cover" />
        <View style={styles.headerInfo}>
          <Text style={styles.authorName}>{post.userName || post.user?.fullName || "User"}</Text>
          <Text style={styles.username}>
            @{post.username || post.user?.username || "user"} •{" "}
            {new Date(post.createdAt).toLocaleDateString()}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Description */}
      {post.description ? (
        <Text style={styles.description}>{post.description}</Text>
      ) : null}

      {/* Media */}
      {mediaUri ? (
        <Image
          source={{ uri: mediaUri }}
          style={styles.postMedia}
          contentFit="cover"
          transition={200}
        />
      ) : null}

      {/* Action Bar */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={handleLike}>
          <Heart
            size={20}
            color={isLiked ? "#EF4444" : "#64748B"}
            fill={isLiked ? "#EF4444" : "none"}
          />
          <Text style={[styles.actionText, isLiked && { color: "#EF4444" }]}>
            {likesCount}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={onPressComment}>
          <MessageCircle size={20} color="#64748B" />
          <Text style={styles.actionText}>{post.commentsCount || post.comments?.length || 0}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn}>
          <Repeat2 size={20} color="#64748B" />
          <Text style={styles.actionText}>{post.repostsCount || 0}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn}>
          <Share2 size={20} color="#64748B" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
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
  authorName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  username: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: "#1E293B",
    marginBottom: 12,
  },
  postMedia: {
    width: "100%",
    height: 260,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    marginBottom: 12,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 12,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  actionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
  },
});
