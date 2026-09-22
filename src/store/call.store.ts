import { create } from "zustand";
import * as Haptics from "expo-haptics";
import { useSocketStore } from "./socket.store";
import { useAuthStore } from "./auth.store";

export type CallState = "idle" | "calling" | "incoming" | "connected" | "ended";
export type CallType = "audio" | "video";

export interface ICallPartner {
  id: string;
  name: string;
  avatar?: string | null;
}

interface CallStoreState {
  callState: CallState;
  callType: CallType;
  partner: ICallPartner | null;
  callDuration: number;
  isMuted: boolean;
  isVideoOff: boolean;
  isSpeakerOn: boolean;

  // Actions
  startCall: (partner: ICallPartner, type: CallType) => void;
  setIncomingCall: (data: {
    from: string;
    fromName: string;
    fromAvatar?: string | null;
    type: CallType;
    offer?: any;
  }) => void;
  acceptCall: () => void;
  rejectCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  toggleSpeaker: () => void;
  tickDuration: () => void;
  resetCall: () => void;
}

let timerInterval: any = null;

export const useCallStore = create<CallStoreState>((set, get) => ({
  callState: "idle",
  callType: "audio",
  partner: null,
  callDuration: 0,
  isMuted: false,
  isVideoOff: false,
  isSpeakerOn: false,

  startCall: (partner, type) => {
    const socket = useSocketStore.getState().socket;
    const user = useAuthStore.getState().user;
    if (!socket || !user) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    set({
      callState: "calling",
      callType: type,
      partner,
      callDuration: 0,
      isMuted: false,
      isVideoOff: false,
      isSpeakerOn: type === "video",
    });

    socket.emit("call_user", {
      from: user.id,
      fromName: user.fullName || "User",
      fromAvatar: user.profilePicUrl || null,
      type,
      to: partner.id,
      offer: { type: "offer", sdp: "mobile-signaling" },
    });
  },

  setIncomingCall: (data) => {
    // If already in a call, notify caller busy
    if (get().callState !== "idle") {
      const socket = useSocketStore.getState().socket;
      socket?.emit("call_busy", { to: data.from });
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    set({
      callState: "incoming",
      callType: data.type || "audio",
      partner: {
        id: data.from,
        name: data.fromName || "Unknown Caller",
        avatar: data.fromAvatar || null,
      },
      callDuration: 0,
      isMuted: false,
      isVideoOff: false,
      isSpeakerOn: data.type === "video",
    });
  },

  acceptCall: () => {
    const socket = useSocketStore.getState().socket;
    const partner = get().partner;
    if (socket && partner) {
      socket.emit("answer_call", {
        to: partner.id,
        answer: { type: "answer", sdp: "mobile-signaling" },
      });
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Start timer
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      get().tickDuration();
    }, 1000);

    set({ callState: "connected" });
  },

  rejectCall: () => {
    const socket = useSocketStore.getState().socket;
    const partner = get().partner;
    if (socket && partner) {
      socket.emit("reject_call", { to: partner.id });
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    get().resetCall();
  },

  endCall: () => {
    const socket = useSocketStore.getState().socket;
    const partner = get().partner;
    if (socket && partner) {
      socket.emit("end_call", { to: partner.id });
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    set({ callState: "ended" });

    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }

    setTimeout(() => {
      get().resetCall();
    }, 1200);
  },

  toggleMute: () => {
    Haptics.selectionAsync();
    set((s) => ({ isMuted: !s.isMuted }));
  },

  toggleVideo: () => {
    Haptics.selectionAsync();
    set((s) => ({ isVideoOff: !s.isVideoOff }));
  },

  toggleSpeaker: () => {
    Haptics.selectionAsync();
    set((s) => ({ isSpeakerOn: !s.isSpeakerOn }));
  },

  tickDuration: () => {
    set((s) => ({ callDuration: s.callDuration + 1 }));
  },

  resetCall: () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    set({
      callState: "idle",
      partner: null,
      callDuration: 0,
      isMuted: false,
      isVideoOff: false,
      isSpeakerOn: false,
    });
  },
}));

