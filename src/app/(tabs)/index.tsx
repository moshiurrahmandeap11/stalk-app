import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  StatusBar,
  ViewToken,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useFocusEffect } from "expo-router";
import { MessageSquare, Bell, LogIn, Search } from "lucide-react-native";
import { postService } from "../../services/post.service";
import { PostCard } from "../../components/post/PostCard";
import { useAuthStore } from "../../store/auth.store";
import { IPost } from "../../interfaces/post.interface";

export default function FeedScreen() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [page, setPage] = useState(1);
  const [visiblePostId, setVisiblePostId] = useState<string | null>(null);
  const [isScreenFocused, setIsScreenFocused] = useState(true);

  // Pause feed video playback when switching away from Feed tab
  useFocusEffect(
    useCallback(() => {
      setIsScreenFocused(true);
      return () => {
        setIsScreenFocused(false);
      };
    }, [])
  );

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 60,
  }).current;

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems && viewableItems.length > 0) {
        const firstVisible = viewableItems[0]?.item?.id;
        if (firstVisible) {
          setVisiblePostId(firstVisible);
        }
      }
    }
  ).current;

  const {
    data,
    isLoading,
    isRefetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["posts", page],
    queryFn: () => postService.getFeedPosts(page, 15),
  });

  const posts: IPost[] = data?.data || [];

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top Navbar */}
      <View style={styles.navbar}>
        <View style={styles.brandRow}>
          <Text style={styles.brandText}>Stalk</Text>
          <View style={styles.dot} />
        </View>

        <View style={styles.navIcons}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.push("/search" as any)}
          >
            <Search size={22} color="#0F172A" />
          </TouchableOpacity>

          {isAuthenticated ? (
            <>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => router.push("/messages" as any)}
              >
                <MessageSquare size={22} color="#0F172A" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => router.push("/notifications" as any)}
              >
                <Bell size={22} color="#0F172A" />
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={styles.loginBtn}
              onPress={() => router.push("/login" as any)}
            >
              <LogIn size={18} color="#FFFFFF" />
              <Text style={styles.loginText}>Sign In</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Posts Feed */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading feed...</Text>
        </View>
      ) : isError ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>Could not load feed</Text>
          <Text style={styles.emptySubtitle}>
            {error instanceof Error ? error.message : "Unable to reach server. Check Wi-Fi."}
          </Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <PostCard
              post={item}
              isVisible={isScreenFocused && visiblePostId === item.id}
              onPressUser={(username) => {
                if (username) router.push(`/s/${username}` as any);
              }}
              onPostDeleted={() => refetch()}
            />
          )}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#3B82F6"
              colors={["#3B82F6"]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No posts yet</Text>
              <Text style={styles.emptySubtitle}>
                Be the first to share something with the community!
              </Text>
            </View>
          }
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
  navbar: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  brandText: {
    fontSize: 24,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#3B82F6",
    marginLeft: 3,
  },
  navIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  loginBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#3B82F6",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  loginText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
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
  listContent: {
    paddingVertical: 12,
    paddingBottom: 24,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    marginTop: 6,
  },
  retryBtn: {
    marginTop: 16,
    backgroundColor: "#3B82F6",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
  },
});

