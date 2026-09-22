import AsyncStorage from "@react-native-async-storage/async-storage";
import { IPost } from "../interfaces/post.interface";

const FEED_CACHE_KEY = "@feed_cache_v1";

/**
 * Retrieve cached feed posts instantly (0ms) from local storage
 */
export async function getFeedCache(): Promise<IPost[]> {
  try {
    const raw = await AsyncStorage.getItem(FEED_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Persist the top posts into local cache for instant next load
 */
export async function setFeedCache(posts: IPost[]): Promise<void> {
  try {
    if (!Array.isArray(posts) || posts.length === 0) return;
    // Cache the top 30 most recent posts
    const slice = posts.slice(0, 30);
    await AsyncStorage.setItem(FEED_CACHE_KEY, JSON.stringify(slice));
  } catch (err) {
    console.warn("Failed to set feed cache:", err);
  }
}

/**
 * Prepend a newly created post directly into the local feed cache
 */
export async function prependToFeedCache(newPost: IPost): Promise<void> {
  try {
    const existing = await getFeedCache();
    const updated = [newPost, ...existing.filter((p) => (p.id || (p as any)._id) !== (newPost.id || (newPost as any)._id))].slice(0, 30);
    await AsyncStorage.setItem(FEED_CACHE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn("Failed to prepend to feed cache:", err);
  }
}

/**
 * Update an existing post in the local feed cache (e.g. upvote, comment count, share count)
 */
export async function updateFeedCacheItem(
  postId: string,
  updater: (post: IPost) => IPost
): Promise<void> {
  try {
    const existing = await getFeedCache();
    let changed = false;
    const updated = existing.map((p) => {
      const id = p.id || (p as any)._id;
      if (id === postId) {
        changed = true;
        return updater(p);
      }
      return p;
    });

    if (changed) {
      await AsyncStorage.setItem(FEED_CACHE_KEY, JSON.stringify(updated));
    }
  } catch (err) {
    console.warn("Failed to update item in feed cache:", err);
  }
}
