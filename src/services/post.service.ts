import { apiClient } from "./api.client";
import { IPost } from "../interfaces/post.interface";

export const postService = {
  async getFeedPosts(page = 1, limit = 10): Promise<{ data: IPost[]; meta: { total: number; page: number } }> {
    const res = await apiClient.get<{ success: boolean; data: IPost[]; meta: { total: number; page: number } }>(
      `/posts?page=${page}&limit=${limit}`
    );
    return { data: res.data.data, meta: res.data.meta };
  },

  async getPostById(id: string): Promise<IPost> {
    const res = await apiClient.get<{ success: boolean; data: IPost }>(`/posts/${id}`);
    return res.data.data;
  },

  async likePost(postId: string): Promise<{ isLiked: boolean }> {
    const res = await apiClient.post<{ success: boolean; data: { isLiked: boolean } }>(`/posts/${postId}/like`);
    return res.data.data;
  },

  async addComment(postId: string, text: string, parentId?: string): Promise<any> {
    const res = await apiClient.post(`/posts/${postId}/comments`, { text, parentId });
    return res.data.data;
  },

  async createPost(formData: FormData): Promise<IPost> {
    const res = await apiClient.post<{ success: boolean; data: IPost }>("/posts", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data.data;
  },
};

