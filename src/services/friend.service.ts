import { apiClient } from "./api.client";

export interface IFriendUser {
  id: string;
  _id?: string;
  fullName: string;
  email?: string;
  profilePicture?: {
    url?: string;
  } | string;
  profilePicUrl?: string;
}

export const friendService = {
  async getFriends(): Promise<IFriendUser[]> {
    try {
      const res = await apiClient.get<{ success: boolean; data: any[] }>("/friends/friends");
      const list = res.data?.data || [];
      return list.map((item) => {
        const id = item.id || item._id || "";
        const avatarUrl =
          item.profilePicture?.url ||
          (typeof item.profilePicture === "string" ? item.profilePicture : "") ||
          item.profilePicUrl ||
          "";

        return {
          id,
          _id: id,
          fullName: item.fullName || "User",
          email: item.email || "",
          profilePicture: { url: avatarUrl },
          profilePicUrl: avatarUrl,
        };
      });
    } catch {
      return [];
    }
  },
};

