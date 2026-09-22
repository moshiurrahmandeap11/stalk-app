import { io, Socket } from "socket.io-client";
import { create } from "zustand";
import { ENV } from "../config/env";
import { Storage } from "../utils/storage";

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

