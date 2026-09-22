import { apiClient } from "./api.client";

export interface IFollowResponse {
  isFollowing: boolean;
}

export const followService = {
  async followUser(userId: string): Promise<IFollowResponse> {
    try {
      const res = await apiClient.post<{ success: boolean; data: IFollowResponse }>(
        `/follow/follow/${userId}`
      );
      return res.data?.data ?? { isFollowing: true };
    } catch {
      return { isFollowing: true };
    }
  },

  async unfollowUser(userId: string): Promise<IFollowResponse> {
    try {
      const res = await apiClient.post<{ success: boolean; data: IFollowResponse }>(
        `/follow/unfollow/${userId}`
      );
      return res.data?.data ?? { isFollowing: false };
    } catch {
      return { isFollowing: false };
    }
  },

  async getFollowStatus(userId: string): Promise<boolean> {
    try {
      const res = await apiClient.get<{ success: boolean; data: { isFollowing: boolean } }>(
        `/follow/status/${userId}`
      );
      return res.data?.data?.isFollowing ?? false;
    } catch {
      return false;
    }
  },

  async getFollowersCount(userId: string): Promise<number> {
    try {
      const res = await apiClient.get<any>(`/follow/followers/count/${userId}`);
      const data = res.data;
      if (typeof data?.count === "number") return data.count;
      if (typeof data?.data?.count === "number") return data.data.count;
      if (typeof data?.data === "number") return data.data;
      return 0;
    } catch {
      return 0;
    }
  },

  async getFollowingCount(userId: string): Promise<number> {
    try {
      const res = await apiClient.get<any>(`/follow/following/count/${userId}`);
      const data = res.data;
      if (typeof data?.count === "number") return data.count;
      if (typeof data?.data?.count === "number") return data.data.count;
      if (typeof data?.data === "number") return data.data;
      return 0;
    } catch {
      return 0;
    }
  },
};

