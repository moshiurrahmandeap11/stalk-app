import { apiClient } from "./api.client";
import { IUser } from "../interfaces/user.interface";
import { IPost } from "../interfaces/post.interface";

export const searchService = {
  async searchUsers(query: string, limit = 20): Promise<IUser[]> {
    if (!query || query.trim().length === 0) return [];
    try {
      const res = await apiClient.get<{ success: boolean; data: IUser[] }>(
        `/users/search/${encodeURIComponent(query.trim())}?limit=${limit}`
      );
      return res.data?.data || [];
    } catch {
      return [];
    }
  },

  async searchPosts(query: string, limit = 20): Promise<IPost[]> {
    if (!query || query.trim().length === 0) return [];
    try {
      const res = await apiClient.get<{
        success: boolean;
        data: IPost[];
        meta: { total: number; page: number };
      }>(`/posts?search=${encodeURIComponent(query.trim())}&limit=${limit}`);
      return res.data?.data || [];
    } catch {
      return [];
    }
  },
};

