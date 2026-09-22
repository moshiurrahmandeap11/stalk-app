import { apiClient } from "./api.client";
import { IUser } from "../interfaces/user.interface";

export const userService = {
  async getUserByUsername(username: string): Promise<IUser> {
    const res = await apiClient.get<{ success: boolean; data: IUser }>(`/users/username/${username}`);
    return res.data.data;
  },

  async getUserById(id: string): Promise<IUser> {
    const res = await apiClient.get<{ success: boolean; data: IUser }>(`/users/${id}`);
    return res.data.data;
  },

  async searchUsers(query: string): Promise<IUser[]> {
    const res = await apiClient.get<{ success: boolean; data: IUser[] }>(`/users/search?q=${encodeURIComponent(query)}`);
    return res.data.data;
  },

  async toggleFollow(targetUserId: string): Promise<{ isFollowing: boolean }> {
    const res = await apiClient.post<{ success: boolean; data: { isFollowing: boolean } }>(
      `/follow/${targetUserId}`
    );
    return res.data.data;
  },
};
