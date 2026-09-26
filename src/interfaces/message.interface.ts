export interface IMessageReaction {
  id: string;
  messageId: string;
  userId: string;
  userName: string;
  userAvatar?: string | null;
  reaction: string;
  createdAt: string;
}

export interface IMessage {
  id: string;
  _id?: string;
  conversationId?: string | null;
  senderId: string;
  senderName: string;
  senderProfilePicture?: string | null;
  receiverId?: string | null;
  message: string;
  messageType: "text" | "image" | "video" | "file" | "audio" | "share" | "audio_call" | "video_call" | "missed_call";
  mediaUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  callDuration?: number | null;
  isRead: boolean;
  isDelivered: boolean;
  createdAt: string;
  updatedAt?: string;
  reactions?: IMessageReaction[];
  tempId?: string | null;
}

export interface IConversation {
  id: string;
  _id?: string;
  isGroup: boolean;
  name?: string | null;
  avatar?: string | null;
  lastMessage?: string | null;
  lastMessageTime?: string | null;
  unreadCount?: number;
  participants: {
    userId: string;
    userName: string;
    userProfilePicture?: string | null;
    unreadCount?: number;
  }[];
}

