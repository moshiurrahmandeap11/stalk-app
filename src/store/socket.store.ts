import { io, Socket } from "socket.io-client";
import { AppState, Platform } from "react-native";
import { create } from "zustand";
import { ENV } from "../config/env";
import { Storage } from "../utils/storage";
import { presentSystemNotification } from "../utils/notifications";
import { playReceiveSound } from "../utils/chatSounds";
import { useChatHeadStore } from "./chathead.store";

interface SocketState {
  socket: Socket | null;
  isConnected: boolean;
  onlineUsers: string[];
  connectSocket: () => Promise<void>;
  disconnectSocket: () => void;
}

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  isConnected: false,
  onlineUsers: [],

  async connectSocket() {
    const existingSocket = get().socket;
    if (existingSocket?.connected) return;

    const token = await Storage.getItem("accessToken");
    const userStr = await Storage.getItem("user");
    const user = userStr ? JSON.parse(userStr) : null;

    const socketInstance = io(ENV.SOCKET_URL, {
      auth: { token },
      query: { userId: user?.id },
      transports: ["websocket", "polling"],
    });

    socketInstance.on("connect", () => {
      set({ socket: socketInstance, isConnected: true });
    });

    socketInstance.on("disconnect", () => {
      set({ isConnected: false });
    });

    socketInstance.on("user_online", (users: string[]) => {
      set({ onlineUsers: users });
    });

    socketInstance.on("getOnlineUsers", (users: string[]) => {
      set({ onlineUsers: users });
    });

    socketInstance.on("user_offline", (userId: string) => {
      set((state) => ({
        onlineUsers: state.onlineUsers.filter((id) => id !== userId),
      }));
    });

    // WebRTC Call Signaling Listeners
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useCallStore } = require("./call.store");

    socketInstance.on("incoming_call", (data: any) => {
      useCallStore.getState().setIncomingCall(data);
    });

    socketInstance.on("call_accepted", async (data: any) => {
      const { stopDialingTone, stopRingtone } = require("../utils/chatSounds");
      stopDialingTone();
      stopRingtone();

      useCallStore.setState({ callState: "connected" });
      useCallStore.getState().startDurationTimer();

      if (data?.answer) {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { webrtcService } = require("../services/webrtc.service");
        await webrtcService.handleAnswer(data.answer);
      }
    });

    socketInstance.on("answer", async (data: any) => {
      if (data?.answer) {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { webrtcService } = require("../services/webrtc.service");
        await webrtcService.handleAnswer(data.answer);
      }
    });

    socketInstance.on("ice_candidate", async (data: any) => {
      if (data?.candidate) {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { webrtcService } = require("../services/webrtc.service");
        await webrtcService.handleIceCandidate(data.candidate);
      }
    });

    socketInstance.on("call_rejected", () => {
      const { stopDialingTone, stopRingtone, playCallEndedSound } = require("../utils/chatSounds");
      stopDialingTone();
      stopRingtone();
      playCallEndedSound();

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { webrtcService } = require("../services/webrtc.service");
      try {
        webrtcService.cleanup();
      } catch {
        // ignore
      }
      useCallStore.getState().stopDurationTimer();
      useCallStore.setState({ callState: "ended" });
      setTimeout(() => {
        useCallStore.getState().resetCall();
      }, 1000);
    });

    socketInstance.on("call_ended", () => {
      const { stopDialingTone, stopRingtone, playCallEndedSound } = require("../utils/chatSounds");
      stopDialingTone();
      stopRingtone();
      playCallEndedSound();

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { webrtcService } = require("../services/webrtc.service");
      try {
        webrtcService.cleanup();
      } catch {
        // ignore
      }
      useCallStore.getState().stopDurationTimer();
      useCallStore.setState({ callState: "ended" });
      setTimeout(() => {
        useCallStore.getState().resetCall();
      }, 1000);
    });

    socketInstance.on("call_busy", () => {
      const { stopDialingTone, stopRingtone, playCallEndedSound } = require("../utils/chatSounds");
      stopDialingTone();
      stopRingtone();
      playCallEndedSound();

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { webrtcService } = require("../services/webrtc.service");
      try {
        webrtcService.cleanup();
      } catch {
        // ignore
      }
      useCallStore.getState().stopDurationTimer();
      useCallStore.setState({ callState: "ended" });
      setTimeout(() => {
        useCallStore.getState().resetCall();
      }, 1200);
    });

    // Message & Notification background/foreground handlers
    const handleIncomingMessage = (newMsg: any) => {
      // Don't alert if the sender is ourselves
      if (newMsg?.senderId && newMsg.senderId === user?.id) return;

      const isBackground = AppState.currentState !== "active";
      const targetConvId = newMsg?.conversationId || newMsg?.senderId;
      const targetSenderName = newMsg?.senderName || "Friend";

      if (isBackground) {
        presentSystemNotification({
          title: targetSenderName,
          body:
            newMsg?.messageType === "image"
              ? "📷 Sent a photo"
              : newMsg?.messageType === "video"
              ? "🎥 Sent a video"
              : newMsg?.messageType === "file"
              ? `📎 Sent a file: ${newMsg?.fileName || ""}`
              : newMsg?.message || "Sent you a message",
          channelId: "messages",
          data: {
            type: "message",
            conversationId: targetConvId,
            senderId: newMsg?.senderId,
          },
        });

        // Float bubble over other apps if enabled
        const chatStore = useChatHeadStore.getState();
        if (chatStore.isChatHeadEnabled && Platform.OS === "android") {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const { NativeModules } = require("react-native");
          NativeModules.ChatHeadModule?.showBubble(
            targetConvId,
            targetSenderName,
            chatStore.unreadMessagesCount + 1
          );
        }
      }

      useChatHeadStore.getState().showBubbleForConversation(
        targetConvId,
        targetSenderName,
        newMsg?.senderAvatar || newMsg?.senderProfilePicture || newMsg?.sender?.profilePicUrl,
        newMsg?.senderId
      );

      if (!isBackground) {
        playReceiveSound();
      }
    };

    socketInstance.on("receive_message", handleIncomingMessage);
    socketInstance.on("new_message", handleIncomingMessage);
    socketInstance.on("new_group_message", handleIncomingMessage);

    socketInstance.on("new_notification", (notif: any) => {
      const isBackground = AppState.currentState !== "active";
      if (isBackground) {
        presentSystemNotification({
          title: notif?.actor?.fullName || "Notification",
          body: notif?.message || "You have a new notification",
          channelId: "default",
          data: {
            type: "notification",
            postId: notif?.postId,
          },
        });
      }
    });

    // Auto-reconnect socket when app returns to foreground
    // Auto-reconnect socket and toggle native overlay on AppState change
    AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        // App is foregrounded: hide native system overlay so in-app chat head takes over
        if (Platform.OS === "android") {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const { NativeModules } = require("react-native");
          NativeModules.ChatHeadModule?.hideBubble();
        }

        const currentSocket = get().socket;
        if (currentSocket && !currentSocket.connected) {
          currentSocket.connect();
        }
      } else if (nextState === "background" || nextState === "inactive") {
        // App minimized: show native bubble over other apps if chat head is active
        const chatStore = useChatHeadStore.getState();
        if (
          chatStore.isChatHeadEnabled &&
          chatStore.activeConversationId &&
          Platform.OS === "android"
        ) {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const { NativeModules } = require("react-native");
          NativeModules.ChatHeadModule?.showBubble(
            chatStore.activeConversationId,
            chatStore.activeConversationTitle || "Chat",
            chatStore.unreadMessagesCount
          );
        }
      }
    });

    set({ socket: socketInstance });
  },

  disconnectSocket() {
    const s = get().socket;
    if (s) {
      s.disconnect();
      set({ socket: null, isConnected: false, onlineUsers: [] });
    }
  },
}));

