/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from "zustand";
import * as Haptics from "expo-haptics";
import { useSocketStore } from "./socket.store";
import { useAuthStore } from "./auth.store";
import { webrtcService } from "../services/webrtc.service";

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
  isFrontCamera: boolean;
  localStream: any | null;
  remoteStream: any | null;
  incomingOffer: any | null;

  // Actions
  startCall: (partner: ICallPartner, type: CallType) => Promise<void>;
  setIncomingCall: (data: {
    from: string;
    fromName: string;
    fromAvatar?: string | null;
    type: CallType;
    offer?: any;
  }) => void;
  acceptCall: () => Promise<void>;
  rejectCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  toggleSpeaker: () => void;
  switchCamera: () => void;
  setRemoteStream: (stream: any) => void;
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
  isFrontCamera: true,
  localStream: null,
  remoteStream: null,
  incomingOffer: null,

  startCall: async (partner, type) => {
    const socket = useSocketStore.getState().socket;
    const user = useAuthStore.getState().user;
    if (!socket || !user) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // 1. Initialize local media (camera/mic)
    const localStream = await webrtcService.startLocalStream(type);

    set({
      callState: "calling",
      callType: type,
      partner,
      localStream,
      remoteStream: null,
      incomingOffer: null,
      callDuration: 0,
      isMuted: false,
      isVideoOff: false,
      isSpeakerOn: type === "video",
      isFrontCamera: true,
    });

    // 2. Create WebRTC offer
    const offer = await webrtcService.createOffer(partner.id, (remoteStream) => {
      set({ remoteStream });
    });

    socket.emit("call_user", {
      from: user.id,
      fromName: user.fullName || "User",
      fromAvatar: user.profilePicUrl || null,
      type,
      to: partner.id,
      offer,
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
      incomingOffer: data.offer || null,
      localStream: null,
      remoteStream: null,
      callDuration: 0,
      isMuted: false,
      isVideoOff: false,
      isSpeakerOn: data.type === "video",
      isFrontCamera: true,
    });
  },

  acceptCall: async () => {
    const socket = useSocketStore.getState().socket;
    const partner = get().partner;
    const incomingOffer = get().incomingOffer;
    const callType = get().callType;
    if (!socket || !partner) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // 1. Start local camera/mic stream
    const localStream = await webrtcService.startLocalStream(callType);
    set({ localStream });

    // 2. Generate WebRTC answer from incoming offer
    const answer = await webrtcService.handleOfferAndCreateAnswer(
      partner.id,
      incomingOffer,
      (remoteStream) => {
        set({ remoteStream });
      }
    );

    socket.emit("answer_call", {
      to: partner.id,
      answer,
    });

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
    webrtcService.cleanup();
    get().resetCall();
  },

  endCall: () => {
    const socket = useSocketStore.getState().socket;
    const partner = get().partner;
    if (socket && partner) {
      socket.emit("end_call", { to: partner.id });
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    webrtcService.cleanup();
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
    const next = !get().isMuted;
    webrtcService.toggleMute(next);
    set({ isMuted: next });
  },

  toggleVideo: () => {
    Haptics.selectionAsync();
    const next = !get().isVideoOff;
    webrtcService.toggleVideo(next);
    set({ isVideoOff: next });
  },

  toggleSpeaker: () => {
    Haptics.selectionAsync();
    set((s) => ({ isSpeakerOn: !s.isSpeakerOn }));
  },

  switchCamera: () => {
    Haptics.selectionAsync();
    webrtcService.switchCamera();
    set((s) => ({ isFrontCamera: !s.isFrontCamera }));
  },

  setRemoteStream: (remoteStream) => {
    set({ remoteStream });
  },

  tickDuration: () => {
    set((s) => ({ callDuration: s.callDuration + 1 }));
  },

  resetCall: () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    webrtcService.cleanup();
    set({
      callState: "idle",
      partner: null,
      incomingOffer: null,
      localStream: null,
      remoteStream: null,
      callDuration: 0,
      isMuted: false,
      isVideoOff: false,
      isSpeakerOn: false,
      isFrontCamera: true,
    });
  },
}));
