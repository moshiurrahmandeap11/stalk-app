import { apiClient } from "./api.client";
import { IConversation, IMessage } from "../interfaces/message.interface";

export const messageService = {
  async getConversations(): Promise<IConversation[]> {
    const res = await apiClient.get<{ success: boolean; data: IConversation[] }>("/messages/conversations");
    return res.data.data;
  },

  async getMessages(targetUserIdOrConvId: string): Promise<IMessage[]> {
    const res = await apiClient.get<{ success: boolean; data: IMessage[] }>(
      `/messages/${targetUserIdOrConvId}`
    );
    return res.data.data;
  },

  async sendMessage(targetUserIdOrConvId: string, payload: { message: string; tempId?: string }): Promise<IMessage> {
    const res = await apiClient.post<{ success: boolean; data: IMessage }>(
      `/messages/${targetUserIdOrConvId}`,
      payload
    );
    return res.data.data;
  },
};

