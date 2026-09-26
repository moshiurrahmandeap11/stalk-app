import React, { useState, useRef, useCallback, useEffect } from "react";
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
import { Image } from "expo-image";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useRouter, useFocusEffect } from "expo-router";
import { Search, Bell } from "lucide-react-native";
import { postService } from "../../services/post.service";
import { PostCard } from "../../components/post/PostCard";
import { useAuthStore } from "../../store/auth.store";
import { IPost } from "../../interfaces/post.interface";
import { getFeedCache, setFeedCache } from "../../utils/feedCache";
import { getMediaUrl } from "../../utils/media";

export default function FeedScreen() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuthStore();
  const [visiblePostId, setVisiblePostId] = useState<string | null>(null);
  const [isScreenFocused, setIsScreenFocused] = useState(true);
  const [cachedPosts, setCachedPosts] = useState<IPost[]>([]);

  // Mandatory authentication redirect
  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.replace("/login" as any);
    }
  }, [isAuthLoading, isAuthenticated]);

  // Facebook-style instant feed preload from local cache
  useEffect(() => {
    if (isAuthenticated) {
      getFeedCache().then((cached) => {
        if (cached && cached.length > 0) {
          setCachedPosts(cached);
        }
      });
    }
  }, [isAuthenticated]);

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
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ["posts"],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await postService.getFeedPosts(pageParam, 12);
      if (pageParam === 1 && res?.data && res.data.length > 0) {
        // Persist to local disk feed cache
        setFeedCache(res.data);
        // Prefetch top images for lag-free scrolling
        res.data.slice(0, 5).forEach((p) => {
          const rawUri = p.media?.url || p.mediaUrl;
          if (rawUri && !/\.(mp4|mov|webm|m4v)$/i.test(rawUri)) {
            Image.prefetch(getMediaUrl(rawUri)).catch(() => {});
          }
        });
      }
      return res;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const total = lastPage?.meta?.total ?? 0;
      const fetched = allPages.reduce((acc, p) => acc + (p?.data?.length || 0), 0);
      if (fetched < total && (lastPage?.data?.length || 0) > 0) {
        return allPages.length + 1;
      }
      return undefined;
    },
    enabled: isAuthenticated,
  });

  // If unauthenticated, redirecting to login, render nothing
  if (!isAuthenticated && !isAuthLoading) {
    return null;
  }

  // Use fresh query data when loaded, or cached posts instantly while fetching
  const posts: IPost[] = React.useMemo(() => {
    if (data?.pages && data.pages.length > 0) {
      const map = new Map<string, IPost>();
      data.pages.forEach((p) => {
        if (p?.data) {
          p.data.forEach((item) => {
            if (item?.id) map.set(item.id, item);
          });
        }
      });
      return Array.from(map.values());
    }
    return cachedPosts;
  }, [data, cachedPosts]);

  const showInitialLoading = isLoading && posts.length === 0;

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
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.push("/notifications" as any)}
          >
            <Bell size={22} color="#0F172A" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Posts Feed */}
      {showInitialLoading ? (
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
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) {
              fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color="#3B82F6" />
              </View>
            ) : null
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
  footerLoader: {
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});

