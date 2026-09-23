import { io, Socket } from "socket.io-client";
import { AppState } from "react-native";
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
      useCallStore.setState({ callState: "connected" });
      if (data?.answer) {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { webrtcService } = require("../services/webrtc.service");
        await webrtcService.handleAnswer(data.answer);
      }
      const timer = setInterval(() => {
        useCallStore.getState().tickDuration();
      }, 1000);
      (useCallStore as any)._timer = timer;
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
      useCallStore.setState({ callState: "ended" });
      setTimeout(() => {
        useCallStore.getState().resetCall();
      }, 1200);
    });

    socketInstance.on("call_ended", () => {
      useCallStore.setState({ callState: "ended" });
      setTimeout(() => {
        useCallStore.getState().resetCall();
      }, 1200);
    });

    socketInstance.on("call_busy", () => {
      useCallStore.setState({ callState: "ended" });
      setTimeout(() => {
        useCallStore.getState().resetCall();
      }, 1500);
    });

    // Message & Notification background/foreground handlers
    const handleIncomingMessage = (newMsg: any) => {
      // Don't alert if the sender is ourselves
      if (newMsg?.senderId && newMsg.senderId === user?.id) return;

      const isBackground = AppState.currentState !== "active";
      if (isBackground) {
        presentSystemNotification({
          title: newMsg?.senderName || "New Message",
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
            conversationId: newMsg?.conversationId || newMsg?.senderId,
            senderId: newMsg?.senderId,
          },
        });
      } else {
        useChatHeadStore.getState().incrementUnreadCount();
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

