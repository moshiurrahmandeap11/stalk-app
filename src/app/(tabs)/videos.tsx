import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Dimensions,
  Platform,
  ViewToken,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Film, Camera, RefreshCw } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { postService } from "../../services/post.service";
import { IPost } from "../../interfaces/post.interface";
import { ReelItem } from "../../components/video/ReelItem";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function VideosTabScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeIndex, setActiveIndex] = useState(0);

  // Height of each reel item equals screen height minus the bottom tab bar
  const bottomBarHeight = 60 + Math.max(insets.bottom, 8);
  const reelHeight = SCREEN_HEIGHT - bottomBarHeight;

  const {
    data,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ["videoPosts"],
    queryFn: async () => {
      const res = await postService.getFeedPosts(1, 40);
      const allPosts = res.data || [];

      // Prioritize video posts, but if few or none, also include media posts so feed is active
      const videos = allPosts.filter(
        (p) =>
          p.mediaType === "video" ||
          p.media?.resourceType === "video" ||
          /\.(mp4|mov|webm|m4v)$/i.test(p.media?.url || p.mediaUrl || "")
      );

      if (videos.length > 0) return videos;
      return allPosts.filter((p) => p.media?.url || p.mediaUrl);
    },
  });

  const reels: IPost[] = data || [];

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems && viewableItems.length > 0 && viewableItems[0].index !== null) {
        setActiveIndex(viewableItems[0].index);
      }
    }
  ).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 60,
  }).current;

  const renderItem = useCallback(
    ({ item, index }: { item: IPost; index: number }) => (
      <ReelItem
        post={item}
        isActive={index === activeIndex}
        itemHeight={reelHeight}
      />
    ),
    [activeIndex, reelHeight]
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Floating Header */}
      <View style={[styles.header, { top: insets.top + (Platform.OS === "android" ? 8 : 4) }]}>
        <View style={styles.headerTitleRow}>
          <Film size={22} color="#FFFFFF" />
          <Text style={styles.headerTitle}>Reels</Text>
        </View>

        <TouchableOpacity
          style={styles.headerIconBtn}
          activeOpacity={0.8}
          onPress={() => {
            Haptics.selectionAsync();
            router.push("/(tabs)/create" as any);
          }}
        >
          <Camera size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading Reels...</Text>
        </View>
      ) : reels.length === 0 ? (
        <View style={styles.centerContainer}>
          <Film size={54} color="#64748B" />
          <Text style={styles.emptyTitle}>No Reels Yet</Text>
          <Text style={styles.emptySubtitle}>
            Be the first to share a video reel on Stalk!
          </Text>
          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => router.push("/(tabs)/create" as any)}
          >
            <Camera size={18} color="#FFFFFF" />
            <Text style={styles.createBtnText}>Create Reel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={() => refetch()}
          >
            <RefreshCw size={16} color="#64748B" />
            <Text style={styles.refreshBtnText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={reels}
          keyExtractor={(item) => item.id || (item as any)._id}
          renderItem={renderItem}
          pagingEnabled
          snapToInterval={reelHeight}
          snapToAlignment="start"
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          refreshing={isRefetching}
          onRefresh={refetch}
          getItemLayout={(_data, index) => ({
            length: reelHeight,
            offset: reelHeight * index,
            index,
          })}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  header: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 0.5,
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    backgroundColor: "#000000",
  },
  loadingText: {
    marginTop: 14,
    color: "#94A3B8",
    fontSize: 15,
    fontWeight: "500",
  },
  emptyTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
    marginTop: 16,
  },
  emptySubtitle: {
    color: "#94A3B8",
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#2563EB",
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 24,
  },
  createBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  refreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 16,
    padding: 8,
  },
  refreshBtnText: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "600",
  },
});

