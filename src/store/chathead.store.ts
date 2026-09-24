import { create } from "zustand";
import { Platform, Alert, Linking } from "react-native";
import { Storage } from "../utils/storage";

export interface IChatBubble {
  conversationId: string;
  partnerId?: string;
  title: string;
  avatar?: string | null;
  unreadCount: number;
}

interface ChatHeadState {
  isChatHeadEnabled: boolean;
  isChatHeadOpen: boolean;
  unreadMessagesCount: number;
  activeConversationId: string | null;
  activeConversationTitle: string | null;
  activeConversationAvatar: string | null;
  activePartnerId: string | null;
  activeBubbles: IChatBubble[];

  toggleChatHeadEnabled: () => Promise<void>;
  setChatHeadEnabled: (enabled: boolean) => Promise<void>;
  setChatHeadOpen: (open: boolean) => void;
  openChatHead: (conversationId?: string, title?: string, avatar?: string, partnerId?: string) => void;
  showBubbleForConversation: (conversationId: string, title?: string, avatar?: string, partnerId?: string) => void;
  selectBubble: (conversationId: string) => void;
  dismissBubble: (conversationId: string) => void;
  closeChatHead: () => void;
  dismissChatHead: () => void;
  incrementUnreadCount: (conversationId?: string, count?: number) => void;
  resetUnreadCount: (conversationId?: string) => void;
  loadPreferences: () => Promise<void>;
}

export const useChatHeadStore = create<ChatHeadState>((set, get) => ({
  isChatHeadEnabled: true,
  isChatHeadOpen: false,
  unreadMessagesCount: 0,
  activeConversationId: null,
  activeConversationTitle: null,
  activeConversationAvatar: null,
  activePartnerId: null,
  activeBubbles: [],

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

  openChatHead(conversationId, title, avatar, partnerId) {
    const currentBubbles = get().activeBubbles;
    let newBubbles = [...currentBubbles];

    if (conversationId) {
      const existingIdx = newBubbles.findIndex((b) => b.conversationId === conversationId);
      if (existingIdx >= 0) {
        newBubbles[existingIdx] = {
          ...newBubbles[existingIdx],
          title: title || newBubbles[existingIdx].title,
          avatar: avatar !== undefined ? avatar : newBubbles[existingIdx].avatar,
          partnerId: partnerId || newBubbles[existingIdx].partnerId,
          unreadCount: 0,
        };
      } else {
        newBubbles.unshift({
          conversationId,
          partnerId,
          title: title || "Chat",
          avatar: avatar || null,
          unreadCount: 0,
        });
      }
    }

    set({
      isChatHeadOpen: true,
      activeConversationId: conversationId || null,
      activeConversationTitle: title || null,
      activeConversationAvatar: avatar || null,
      activePartnerId: partnerId || null,
      activeBubbles: newBubbles,
      unreadMessagesCount: 0,
    });
  },

  showBubbleForConversation(conversationId, title, avatar, partnerId) {
    const currentBubbles = get().activeBubbles;
    const existingIdx = currentBubbles.findIndex((b) => b.conversationId === conversationId);
    let newBubbles = [...currentBubbles];

    const currentActiveId = get().activeConversationId;
    const isOpen = get().isChatHeadOpen;

    if (existingIdx >= 0) {
      const isCurrentlyActive = isOpen && currentActiveId === conversationId;
      newBubbles[existingIdx] = {
        ...newBubbles[existingIdx],
        title: title || newBubbles[existingIdx].title,
        avatar: avatar !== undefined ? avatar : newBubbles[existingIdx].avatar,
        partnerId: partnerId || newBubbles[existingIdx].partnerId,
        unreadCount: isCurrentlyActive ? 0 : newBubbles[existingIdx].unreadCount + 1,
      };
    } else {
      newBubbles.unshift({
        conversationId,
        partnerId,
        title: title || "Chat",
        avatar: avatar || null,
        unreadCount: 1,
      });
    }

    // Keep max 5 bubbles
    if (newBubbles.length > 5) {
      newBubbles = newBubbles.slice(0, 5);
    }

    set({
      activeBubbles: newBubbles,
      activeConversationId: currentActiveId || conversationId,
      activeConversationTitle: get().activeConversationTitle || title || null,
      activeConversationAvatar: get().activeConversationAvatar !== null ? get().activeConversationAvatar : (avatar || null),
      activePartnerId: get().activePartnerId || partnerId || null,
      unreadMessagesCount: get().unreadMessagesCount + 1,
    });
  },

  selectBubble(conversationId: string) {
    const bubble = get().activeBubbles.find((b) => b.conversationId === conversationId);
    if (!bubble) return;

    const updatedBubbles = get().activeBubbles.map((b) =>
      b.conversationId === conversationId ? { ...b, unreadCount: 0 } : b
    );

    set({
      isChatHeadOpen: true,
      activeConversationId: bubble.conversationId,
      activeConversationTitle: bubble.title,
      activeConversationAvatar: bubble.avatar,
      activePartnerId: bubble.partnerId || null,
      activeBubbles: updatedBubbles,
      unreadMessagesCount: 0,
    });
  },

  dismissBubble(conversationId: string) {
    const remaining = get().activeBubbles.filter((b) => b.conversationId !== conversationId);
    if (remaining.length === 0) {
      if (Platform.OS === "android") {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { NativeModules } = require("react-native");
        NativeModules.ChatHeadModule?.hideBubble();
      }
      set({
        isChatHeadOpen: false,
        activeConversationId: null,
        activeConversationTitle: null,
        activeConversationAvatar: null,
        activePartnerId: null,
        activeBubbles: [],
        unreadMessagesCount: 0,
      });
    } else {
      const nextActive = remaining[0];
      set({
        activeBubbles: remaining,
        activeConversationId: nextActive.conversationId,
        activeConversationTitle: nextActive.title,
        activeConversationAvatar: nextActive.avatar,
        activePartnerId: nextActive.partnerId || null,
      });
    }
  },

  closeChatHead() {
    set({ isChatHeadOpen: false });
  },

  dismissChatHead() {
    if (Platform.OS === "android") {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { NativeModules } = require("react-native");
      NativeModules.ChatHeadModule?.hideBubble();
    }
    set({
      isChatHeadOpen: false,
      activeConversationId: null,
      activeConversationTitle: null,
      activeConversationAvatar: null,
      activePartnerId: null,
      activeBubbles: [],
      unreadMessagesCount: 0,
    });
  },

  incrementUnreadCount(conversationId?: string, count = 1) {
    if (conversationId) {
      set((state) => ({
        activeBubbles: state.activeBubbles.map((b) =>
          b.conversationId === conversationId ? { ...b, unreadCount: b.unreadCount + count } : b
        ),
        unreadMessagesCount: Math.max(0, state.unreadMessagesCount + count),
      }));
    } else {
      set((state) => ({
        unreadMessagesCount: Math.max(0, state.unreadMessagesCount + count),
      }));
    }
  },

  resetUnreadCount(conversationId?: string) {
    if (conversationId) {
      set((state) => ({
        activeBubbles: state.activeBubbles.map((b) =>
          b.conversationId === conversationId ? { ...b, unreadCount: 0 } : b
        ),
        unreadMessagesCount: 0,
      }));
    } else {
      set({ unreadMessagesCount: 0 });
    }
  },
}));
