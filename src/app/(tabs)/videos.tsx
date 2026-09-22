import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { Play, Heart, MessageCircle, Share2, Film } from "lucide-react-native";
import { postService } from "../../services/post.service";
import { IPost } from "../../interfaces/post.interface";

export default function VideosTabScreen() {
  const router = useRouter();

  const {
    data,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ["videoPosts"],
    queryFn: async () => {
      const res = await postService.getFeedPosts(1, 30);
      // Filter for posts containing video
      return res.data.filter(
        (p) =>
          p.mediaType === "video" ||
          p.media?.resourceType === "video" ||
          (p.mediaUrl && /\.(mp4|mov|webm|avi|mkv)$/i.test(p.mediaUrl))
      );
    },
  });

  const videoPosts: IPost[] = data || [];

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Film size={22} color="#3B82F6" />
          <Text style={styles.headerTitle}>Videos & Reels</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading videos...</Text>
        </View>
      ) : (
        <FlatList
          data={videoPosts}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          renderItem={({ item }) => {
            const author = item.user?.fullName || item.userName || "User";
            const avatar =
              item.userProfilePicture ||
              item.user?.profilePicUrl ||
              "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150";

            return (
              <TouchableOpacity
                style={styles.videoCard}
                activeOpacity={0.9}
                onPress={() => router.push(`/post/${item.id}` as any)}
              >
                {/* Video Thumbnail Box */}
                <View style={styles.thumbnailBox}>
                  <Image
                    source={{
                      uri:
                        item.media?.url ||
                        item.mediaUrl ||
                        "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800",
                    }}
                    style={styles.thumbnail}
                    contentFit="cover"
                  />
                  <View style={styles.playOverlay}>
                    <View style={styles.playCircle}>
                      <Play size={24} color="#FFFFFF" fill="#FFFFFF" />
                    </View>
                  </View>
                </View>

                {/* Video Info */}
                <View style={styles.videoInfo}>
                  <View style={styles.authorRow}>
                    <Image source={{ uri: avatar }} style={styles.authorAvatar} contentFit="cover" />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.authorName}>{author}</Text>
                      <Text style={styles.description} numberOfLines={2}>
                        {item.description || "Video Reel"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.videoStats}>
                    <View style={styles.stat}>
                      <Heart size={16} color="#64748B" />
                      <Text style={styles.statText}>{item.likesCount || item.likes.length || 0}</Text>
                    </View>
                    <View style={styles.stat}>
                      <MessageCircle size={16} color="#64748B" />
                      <Text style={styles.statText}>{item.commentsCount || 0}</Text>
                    </View>
                    <View style={styles.stat}>
                      <Share2 size={16} color="#64748B" />
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Film size={48} color="#94A3B8" />
              <Text style={styles.emptyTitle}>No videos yet</Text>
              <Text style={styles.emptySubtitle}>Upload the first video reel to the platform!</Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
        />
      )}
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
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 10,
    color: "#64748B",
  },
  listContent: {
    paddingVertical: 12,
  },
  videoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  thumbnailBox: {
    width: "100%",
    height: 220,
    backgroundColor: "#0F172A",
    position: "relative",
  },
  thumbnail: {
    width: "100%",
    height: "100%",
    opacity: 0.85,
  },
  playOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  playCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(59, 130, 246, 0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  videoInfo: {
    padding: 14,
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  authorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E2E8F0",
  },
  authorName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  description: {
    fontSize: 13,
    color: "#475569",
    marginTop: 2,
    lineHeight: 18,
  },
  videoStats: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 16,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 10,
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statText: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 4,
  },
});
