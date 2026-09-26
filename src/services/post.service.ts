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

  async getUserPosts(userId: string): Promise<IPost[]> {
    const res = await apiClient.get<{ success: boolean; data: IPost[] }>(`/posts/user/${userId}`);
    return res.data.data;
  },

  async likePost(postId: string): Promise<{ liked: boolean; likesCount: number; isLiked?: boolean }> {
    const res = await apiClient.post<{ success: boolean; data: { liked: boolean; likesCount: number; isLiked?: boolean } }>(`/posts/${postId}/like`);
    return res.data.data;
  },

  async addComment(postId: string, text: string, parentId?: string): Promise<any> {
    const res = await apiClient.post(`/posts/${postId}/comment`, { text, parentCommentId: parentId });
    return res.data.data;
  },

  async sharePost(postId: string, description?: string): Promise<IPost> {
    const res = await apiClient.post<{ success: boolean; data: IPost }>(`/posts/${postId}/share`, {
      description,
    });
    return res.data.data;
  },

  async savePost(postId: string): Promise<{ isSaved: boolean }> {
    const res = await apiClient.post<{ success: boolean; data: { isSaved: boolean } }>(`/posts/${postId}/save`);
    return res.data.data;
  },

  async getSavedPosts(page = 1, limit = 10): Promise<{ data: IPost[]; meta: { total: number; page: number } }> {
    const res = await apiClient.get<{ success: boolean; data: IPost[]; meta: { total: number; page: number } }>(
      `/posts/saved?page=${page}&limit=${limit}`
    );
    return { data: res.data.data, meta: res.data.meta };
  },

  async deletePost(postId: string): Promise<any> {
    const res = await apiClient.delete(`/posts/${postId}`);
    return res.data.data;
  },

  async createPost(formData: FormData): Promise<IPost> {
    const res = await apiClient.post<{ success: boolean; data: IPost }>("/posts/create", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data.data;
  },
};

