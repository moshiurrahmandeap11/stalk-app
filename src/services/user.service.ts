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

  async updateUser(userId: string, data: Partial<IUser>): Promise<IUser> {
    const res = await apiClient.patch<{ success: boolean; data: IUser }>(`/users/${userId}`, data);
    return res.data.data;
  },

  async uploadProfilePic(formData: FormData): Promise<{ profilePicUrl: string }> {
    const res = await apiClient.post<{ success: boolean; data: { profilePicUrl: string } }>(
      "/users/upload-profile-pic",
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    );
    return res.data.data;
  },

  async uploadCoverPhoto(formData: FormData): Promise<{ coverPhotoUrl: string }> {
    const res = await apiClient.post<{ success: boolean; data: { coverPhotoUrl: string } }>(
      "/users/upload-cover-photo",
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    );
    return res.data.data;
  },

  async toggleFollow(targetUserId: string): Promise<{ isFollowing: boolean }> {
    const res = await apiClient.post<{ success: boolean; data: { isFollowing: boolean } }>(
      `/follow/follow/${targetUserId}`
    );
    return res.data.data;
  },
};

