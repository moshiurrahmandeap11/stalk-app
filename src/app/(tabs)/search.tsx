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
} from "lucide-react-native";
import { searchService } from "../../services/search.service";
import { IUser } from "../../interfaces/user.interface";
import { IPost } from "../../interfaces/post.interface";
import { UserSearchCard } from "../../components/search/UserSearchCard";
import { PostCard } from "../../components/post/PostCard";

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

export default function SearchTabScreen() {
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
        <View style={styles.searchBar}>
          <SearchIcon size={18} color="#94A3B8" />
          <TextInput
            style={styles.input}
            placeholder="Search users, posts, or tags..."
            placeholderTextColor="#94A3B8"
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
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

      {/* Body Content */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Searching Stalk...</Text>
        </View>
      ) : query.trim().length === 0 ? (
        /* Empty Query: Trending Suggestions */
        <ScrollView contentContainerStyle={styles.suggestionsContainer}>
          <View style={styles.suggestionSection}>
            <View style={styles.sectionHeader}>
              <TrendingUp size={18} color="#2563EB" />
              <Text style={styles.sectionTitle}>Trending on Stalk</Text>
            </View>

            <View style={styles.tagsGrid}>
              {POPULAR_HASHTAGS.map((tag) => (
                <TouchableOpacity
                  key={tag}
                  style={styles.tagChip}
                  onPress={() => handleSelectHashtag(tag)}
                  activeOpacity={0.7}
                >
                  <Hash size={13} color="#2563EB" />
                  <Text style={styles.tagText}>{tag.replace("#", "")}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={[styles.suggestionSection, { marginTop: 24 }]}>
            <View style={styles.sectionHeader}>
              <Users size={18} color="#64748B" />
              <Text style={styles.sectionTitle}>Search Tips</Text>
            </View>
            <Text style={styles.tipText}>
              • Type @username to search for a specific person.{"\n"}
              • Type #hashtag to search for trending topics.{"\n"}
              • Search any word to find posts and discussions across Stalk.
            </Text>
          </View>
        </ScrollView>
      ) : totalResults === 0 ? (
        /* No Results Found */
        <View style={styles.centerContainer}>
          <SearchIcon size={48} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>No Results Found</Text>
          <Text style={styles.emptySubtitle}>
            We couldn't find any matches for "{query}". Try checking for spelling or search with a different keyword.
          </Text>
        </View>
      ) : (
        /* Results View */
        <ScrollView contentContainerStyle={styles.resultsContainer}>
          {/* People Section */}
          {(activeTab === "all" || activeTab === "users") && users.length > 0 && (
            <View style={styles.resultGroup}>
              {activeTab === "all" && (
                <View style={styles.groupHeader}>
                  <Users size={16} color="#475569" />
                  <Text style={styles.groupTitle}>People</Text>
                </View>
              )}
              {users.map((u) => (
                <UserSearchCard key={u.id || u._id} user={u} />
              ))}
            </View>
          )}

          {/* Posts Section */}
          {(activeTab === "all" || activeTab === "posts") && posts.length > 0 && (
            <View style={styles.resultGroup}>
              {activeTab === "all" && (
                <View style={styles.groupHeader}>
                  <FileText size={16} color="#475569" />
                  <Text style={styles.groupTitle}>Posts</Text>
                </View>
              )}
              {posts.map((p) => (
                <PostCard
                  key={p.id || (p as any)._id}
                  post={p}
                  onPressUser={(username) => {
                    if (username) router.push(`/s/${username}` as any);
                  }}
                  onPressComment={() => router.push(`/post/${p.id || (p as any)._id}` as any)}
                />
              ))}
            </View>
          )}
        </ScrollView>
      )}
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
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    paddingHorizontal: 12,
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
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    gap: 8,
    backgroundColor: "#FFFFFF",
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
  },
  activeTab: {
    backgroundColor: "#2563EB",
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },
  activeTabText: {
    color: "#FFFFFF",
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
    marginTop: 14,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 20,
  },
  suggestionsContainer: {
    padding: 16,
  },
  suggestionSection: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
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
});

