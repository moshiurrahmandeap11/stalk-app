import { apiClient } from "./api.client";
import { IConversation, IMessage, IMessageReaction } from "../interfaces/message.interface";

export interface ICreateGroupPayload {
  name: string;
  avatar?: string;
  memberIds: string[];
}

export const messageService = {
  async getConversations(): Promise<IConversation[]> {
    const res = await apiClient.get<{ success: boolean; data: IConversation[] }>("/messages/conversations");
    return res.data.data;
  },

  async getMessages(targetUserIdOrConvId: string): Promise<IMessage[]> {
    try {
      const res = await apiClient.get<{ success: boolean; data: IMessage[] }>(
        `/messages/messages/${targetUserIdOrConvId}`
      );
      return res.data.data;
    } catch {
      const res = await apiClient.get<{ success: boolean; data: IMessage[] }>(
        `/messages/${targetUserIdOrConvId}`
      );
      return res.data.data;
    }
  },

  async sendMessage(
    targetUserIdOrConvId: string,
    payload: {
      message: string;
      messageType?: "text" | "image" | "video" | "file";
      mediaUrl?: string;
      tempId?: string;
    }
  ): Promise<IMessage> {
    try {
      const res = await apiClient.post<{ success: boolean; data: IMessage }>(
        `/messages/send-message/${targetUserIdOrConvId}`,
        payload
      );
      return res.data.data;
    } catch {
      const res = await apiClient.post<{ success: boolean; data: IMessage }>(
        `/messages/${targetUserIdOrConvId}`,
        payload
      );
      return res.data.data;
    }
  },

  async createGroup(payload: ICreateGroupPayload): Promise<IConversation> {
    const res = await apiClient.post<{ success: boolean; data: any }>("/messages/group", payload);
    const g = res.data.data;
    return {
      id: g.id || g.friendId,
      isGroup: true,
      name: g.friendName || g.name || payload.name,
      avatar: g.friendProfilePicture || g.avatar || payload.avatar,
      lastMessage: g.lastMessage || "Group created",
      unreadCount: 0,
      participants: (g.participants || []).map((p: any) => ({
        userId: p.userId || p.id,
        userName: p.name || p.userName || "Member",
        userProfilePicture: p.avatar || p.userProfilePicture,
      })),
    };
  },

  async toggleReaction(
    messageId: string,
    reaction: string
  ): Promise<{ messageId: string; reactions: IMessageReaction[] }> {
    const res = await apiClient.post<{
      success: boolean;
      data: { messageId: string; reactions: IMessageReaction[] };
    }>(`/messages/messages/react/${messageId}`, { reaction });
    return res.data.data;
  },

  async markAsRead(senderOrConvId: string): Promise<void> {
    try {
      await apiClient.patch(`/messages/messages/read/${senderOrConvId}`);
    } catch {
      // Non-blocking
    }
  },
};
