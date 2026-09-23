import { create } from "zustand";
import { Platform, Alert, Linking } from "react-native";
import { Storage } from "../utils/storage";

interface ChatHeadState {
  isChatHeadEnabled: boolean;
  isChatHeadOpen: boolean;
  unreadMessagesCount: number;
  activeConversationId: string | null;
  activeConversationTitle: string | null;
  activeConversationAvatar: string | null;

  toggleChatHeadEnabled: () => Promise<void>;
  setChatHeadEnabled: (enabled: boolean) => Promise<void>;
  setChatHeadOpen: (open: boolean) => void;
  openChatHead: (conversationId?: string, title?: string, avatar?: string) => void;
  showBubbleForConversation: (conversationId: string, title?: string, avatar?: string) => void;
  closeChatHead: () => void;
  dismissChatHead: () => void;
  incrementUnreadCount: (count?: number) => void;
  resetUnreadCount: () => void;
  loadPreferences: () => Promise<void>;
}

export const useChatHeadStore = create<ChatHeadState>((set, get) => ({
  isChatHeadEnabled: true,
  isChatHeadOpen: false,
  unreadMessagesCount: 0,
  activeConversationId: null,
  activeConversationTitle: null,
  activeConversationAvatar: null,

  async loadPreferences() {
    try {
      const stored = await Storage.getItem("chatHeadEnabled");
      if (stored !== null) {
        set({ isChatHeadEnabled: stored === "true" });
      }
    } catch {
      // Default to true
    }
  },

  async toggleChatHeadEnabled() {
    const next = !get().isChatHeadEnabled;
    await Storage.setItem("chatHeadEnabled", String(next));
    set({ isChatHeadEnabled: next });
    if (next && Platform.OS === "android") {
      Alert.alert(
        "Display Over Other Apps",
        "To allow Chat Heads to float over other apps like Messenger, please grant 'Display over other apps' in Android settings.",
        [
          { text: "Later", style: "cancel" },
          {
            text: "Open Settings",
            onPress: () => {
              Linking.sendIntent("android.settings.action.MANAGE_OVERLAY_PERMISSION", [
                { key: "data", value: "package:com.stalk.app" },
              ]).catch(() => {
                Linking.openSettings().catch(() => {});
              });
            },
          },
        ]
      );
    }
  },

  async setChatHeadEnabled(enabled: boolean) {
    await Storage.setItem("chatHeadEnabled", String(enabled));
    set({ isChatHeadEnabled: enabled });
    if (enabled && Platform.OS === "android") {
      Alert.alert(
        "Display Over Other Apps",
        "To allow Chat Heads to float over other apps like Messenger, please grant 'Display over other apps' in Android settings.",
        [
          { text: "Later", style: "cancel" },
          {
            text: "Open Settings",
            onPress: () => {
              Linking.sendIntent("android.settings.action.MANAGE_OVERLAY_PERMISSION", [
                { key: "data", value: "package:com.stalk.app" },
              ]).catch(() => {
                Linking.openSettings().catch(() => {});
              });
            },
          },
        ]
      );
    }
  },

  setChatHeadOpen(open: boolean) {
    set({ isChatHeadOpen: open });
  },

  openChatHead(conversationId, title, avatar) {
    set({
      isChatHeadOpen: true,
      activeConversationId: conversationId || null,
      activeConversationTitle: title || null,
      activeConversationAvatar: avatar || null,
    });
  },

  showBubbleForConversation(conversationId, title, avatar) {
    set({
      activeConversationId: conversationId || null,
      activeConversationTitle: title || null,
      activeConversationAvatar: avatar || null,
    });
  },

  closeChatHead() {
    set({ isChatHeadOpen: false });
  },

  dismissChatHead() {
    set({
      isChatHeadOpen: false,
      activeConversationId: null,
      activeConversationTitle: null,
      activeConversationAvatar: null,
      unreadMessagesCount: 0,
    });
  },

  incrementUnreadCount(count = 1) {
    set((state) => ({
      unreadMessagesCount: Math.max(0, state.unreadMessagesCount + count),
    }));
  },

  resetUnreadCount() {
    set({ unreadMessagesCount: 0 });
  },
}));
