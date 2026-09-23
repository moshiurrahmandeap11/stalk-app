import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StatusBar,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  Search as SearchIcon,
  X,
  TrendingUp,
  Hash,
  Users,
  FileText,
  ArrowLeft,
} from "lucide-react-native";
import { searchService } from "../services/search.service";
import { IUser } from "../interfaces/user.interface";
import { IPost } from "../interfaces/post.interface";
import { UserSearchCard } from "../components/search/UserSearchCard";
import { PostCard } from "../components/post/PostCard";

const POPULAR_HASHTAGS = [
  "#stalk",
  "#bangladesh",
  "#tech",
  "#trending",
  "#reels",
  "#photography",
  "#dhaka",
  "#vibes",
  "#dev",
  "#music",
];

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "users" | "posts">("all");

  const [users, setUsers] = useState<IUser[]>([]);
  const [posts, setPosts] = useState<IPost[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Debounced search
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setUsers([]);
      setPosts([]);
      setIsLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsLoading(true);
        const [usersData, postsData] = await Promise.all([
          searchService.searchUsers(trimmed, 20),
          searchService.searchPosts(trimmed, 20),
        ]);
        setUsers(usersData);
        setPosts(postsData);
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setIsLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [query]);

  const handleClear = () => {
    Haptics.selectionAsync();
    setQuery("");
    setUsers([]);
    setPosts([]);
    Keyboard.dismiss();
  };

  const handleSelectHashtag = (tag: string) => {
    Haptics.selectionAsync();
    setQuery(tag);
  };

  const totalResults = users.length + posts.length;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top Search Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/(tabs)" as any);
            }
          }}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color="#0F172A" />
        </TouchableOpacity>

        <View style={styles.searchBar}>
          <SearchIcon size={18} color="#94A3B8" />
          <TextInput
            style={styles.input}
            placeholder="Search users, posts, or tags..."
            placeholderTextColor="#94A3B8"
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            autoFocus
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={handleClear} style={styles.clearBtn} activeOpacity={0.7}>
              <X size={16} color="#64748B" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Tabs (shown when searching or results exist) */}
      {query.trim().length > 0 && (
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "all" && styles.activeTab]}
            onPress={() => {
              Haptics.selectionAsync();
              setActiveTab("all");
            }}
          >
            <Text style={[styles.tabText, activeTab === "all" && styles.activeTabText]}>
              All ({totalResults})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === "users" && styles.activeTab]}
            onPress={() => {
              Haptics.selectionAsync();
              setActiveTab("users");
            }}
          >
            <Text style={[styles.tabText, activeTab === "users" && styles.activeTabText]}>
              People ({users.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === "posts" && styles.activeTab]}
            onPress={() => {
              Haptics.selectionAsync();
              setActiveTab("posts");
            }}
          >
            <Text style={[styles.tabText, activeTab === "posts" && styles.activeTabText]}>
              Posts ({posts.length})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Loading state */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#3B82F6" />
          <Text style={styles.loadingText}>Searching Stalk...</Text>
        </View>
      )}

      {/* Main Content */}
      <ScrollView
        style={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Default Discovery Screen (when query is empty) */}
        {!query.trim() && (
          <View style={styles.discoveryContainer}>
            {/* Trending Hashtags */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <TrendingUp size={18} color="#3B82F6" />
                <Text style={styles.sectionTitle}>Trending Tags</Text>
              </View>
              <View style={styles.tagsGrid}>
                {POPULAR_HASHTAGS.map((tag) => (
                  <TouchableOpacity
                    key={tag}
                    style={styles.tagChip}
                    onPress={() => handleSelectHashtag(tag)}
                    activeOpacity={0.7}
                  >
                    <Hash size={12} color="#3B82F6" />
                    <Text style={styles.tagText}>{tag.replace("#", "")}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Quick Tips */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Users size={18} color="#64748B" />
                <Text style={styles.sectionTitle}>Find Friends</Text>
              </View>
              <Text style={styles.tipText}>
                Type a name or username (e.g., &quot;ahsanul&quot;) to discover friends, creators, and colleagues on Stalk.
              </Text>
            </View>
          </View>
        )}

        {/* Search Results */}
        {query.trim().length > 0 && !isLoading && (
          <View style={styles.resultsContainer}>
            {/* Empty Results */}
            {totalResults === 0 && (
              <View style={styles.emptyResults}>
                <SearchIcon size={40} color="#CBD5E1" />
                <Text style={styles.emptyTitle}>No results found</Text>
                <Text style={styles.emptySubtitle}>
                  We couldn&apos;t find anything matching &quot;{query}&quot;. Try different keywords or hashtags.
                </Text>
              </View>
            )}

            {/* Users Section */}
            {(activeTab === "all" || activeTab === "users") && users.length > 0 && (
              <View style={styles.resultGroup}>
                {activeTab === "all" && (
                  <View style={styles.groupHeader}>
                    <Users size={16} color="#475569" />
                    <Text style={styles.groupTitle}>People ({users.length})</Text>
                  </View>
                )}
                {users.map((user) => (
                  <UserSearchCard
                    key={user.id}
                    user={user}
                  />
                ))}
              </View>
            )}

            {/* Posts Section */}
            {(activeTab === "all" || activeTab === "posts") && posts.length > 0 && (
              <View style={styles.resultGroup}>
                {activeTab === "all" && (
                  <View style={styles.groupHeader}>
                    <FileText size={16} color="#475569" />
                    <Text style={styles.groupTitle}>Posts ({posts.length})</Text>
                  </View>
                )}
                {posts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    gap: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 20,
    paddingHorizontal: 14,
    height: 42,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#0F172A",
    paddingVertical: 0,
  },
  clearBtn: {
    padding: 4,
  },
  tabsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    gap: 8,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
  },
  activeTab: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#3B82F6",
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },
  activeTabText: {
    color: "#2563EB",
    fontWeight: "700",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 8,
    backgroundColor: "#F8FAFC",
  },
  loadingText: {
    fontSize: 13,
    color: "#64748B",
  },
  content: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  discoveryContainer: {
    padding: 16,
    gap: 24,
  },
  section: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  tagsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tagChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  tagText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2563EB",
  },
  tipText: {
    fontSize: 13,
    color: "#64748B",
    lineHeight: 20,
  },
  resultsContainer: {
    padding: 16,
    gap: 20,
  },
  resultGroup: {
    gap: 10,
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  groupTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  emptyResults: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
});
