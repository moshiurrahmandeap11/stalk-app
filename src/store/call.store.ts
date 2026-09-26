/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from "zustand";
import * as Haptics from "expo-haptics";
import { useSocketStore } from "./socket.store";
import { useAuthStore } from "./auth.store";
import { Audio, isAudioSupported } from "../utils/safeAudio";
import {
  playDialingTone,
  stopDialingTone,
  playRingtone,
  stopRingtone,
  playCallEndedSound,
} from "../utils/chatSounds";

function getWebRTCService(): any {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { webrtcService } = require("../services/webrtc.service");
  return webrtcService;
}

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
  toggleSpeaker: () => Promise<void>;
  switchCamera: () => void;
  setRemoteStream: (stream: any) => void;
  startDurationTimer: () => void;
  stopDurationTimer: () => void;
  tickDuration: () => void;
  resetCall: () => void;
}

let timerInterval: any = null;
let timeoutTimer: any = null;

const applyHardwareAudioRouting = async (isSpeaker: boolean) => {
  if (Audio && isAudioSupported) {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        playThroughEarpieceAndroid: !isSpeaker,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
      });
    } catch {
      // Non-blocking
    }
  }
};

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

    // Wipe any previous stale state
    get().resetCall();

    const isVideo = type === "video";
    const initialSpeaker = isVideo; // Default video call to loudspeaker
    await applyHardwareAudioRouting(initialSpeaker);

    // 1. Initialize local camera/mic stream
    const localStream = await getWebRTCService().startLocalStream(type);

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
      isSpeakerOn: initialSpeaker,
      isFrontCamera: true,
    });

    // Start outgoing dialing ring tone
    playDialingTone();

    // 2. Set 45-second auto timeout if call is unanswered
    if (timeoutTimer) clearTimeout(timeoutTimer);
    timeoutTimer = setTimeout(() => {
      if (get().callState === "calling") {
        get().endCall();
      }
    }, 45000);

    // 3. Create WebRTC offer
    const offer = await getWebRTCService().createOffer(partner.id, (remoteStream: any) => {
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
    // If actively in a connected or calling call, notify caller busy
    const currentState = get().callState;
    if (currentState === "connected" || currentState === "calling") {
      const socket = useSocketStore.getState().socket;
      socket?.emit("call_busy", { to: data.from });
      return;
    }

    if (currentState === "ended") {
      get().resetCall();
    }

    const isVideo = data.type === "video";

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
      isSpeakerOn: isVideo,
      isFrontCamera: true,
    });

    // Start looping incoming ringtone + haptics
    playRingtone();

    // 45s auto timeout if callee doesn't answer
    if (timeoutTimer) clearTimeout(timeoutTimer);
    timeoutTimer = setTimeout(() => {
      if (get().callState === "incoming") {
        get().rejectCall();
      }
    }, 45000);
  },

  acceptCall: async () => {
    const socket = useSocketStore.getState().socket;
    const partner = get().partner;
    const incomingOffer = get().incomingOffer;
    const callType = get().callType;
    if (!socket || !partner) return;

    if (timeoutTimer) {
      clearTimeout(timeoutTimer);
      timeoutTimer = null;
    }

    stopRingtone();
    stopDialingTone();

    const isVideo = callType === "video";
    const initialSpeaker = isVideo;
    await applyHardwareAudioRouting(initialSpeaker);

    // 1. Start local camera/mic stream
    const localStream = await getWebRTCService().startLocalStream(callType);
    set({ localStream, isSpeakerOn: initialSpeaker });

    // 2. Generate WebRTC answer from incoming offer
    const answer = await getWebRTCService().handleOfferAndCreateAnswer(
      partner.id,
      incomingOffer,
      (remoteStream: any) => {
        set({ remoteStream });
      }
    );

    socket.emit("answer_call", {
      to: partner.id,
      answer,
    });

    // Start call timer
    get().startDurationTimer();
    set({ callState: "connected" });
  },

  rejectCall: () => {
    if (timeoutTimer) {
      clearTimeout(timeoutTimer);
      timeoutTimer = null;
    }

    stopRingtone();
    stopDialingTone();
    playCallEndedSound();

    const socket = useSocketStore.getState().socket;
    const partner = get().partner;
    if (socket && partner) {
      socket.emit("reject_call", { to: partner.id });
    }

    getWebRTCService().cleanup();
    get().resetCall();
  },

  endCall: () => {
    if (timeoutTimer) {
      clearTimeout(timeoutTimer);
      timeoutTimer = null;
    }

    stopRingtone();
    stopDialingTone();
    playCallEndedSound();

    const socket = useSocketStore.getState().socket;
    const partner = get().partner;
    if (socket && partner) {
      socket.emit("end_call", { to: partner.id });
    }

    get().stopDurationTimer();
    getWebRTCService().cleanup();
    set({ callState: "ended" });

    setTimeout(() => {
      get().resetCall();
    }, 700);
  },

  toggleMute: () => {
    Haptics.selectionAsync();
    const next = !get().isMuted;
    getWebRTCService().toggleMute(next);
    set({ isMuted: next });
  },

  toggleVideo: () => {
    Haptics.selectionAsync();
    const next = !get().isVideoOff;
    getWebRTCService().toggleVideo(next);
    set({ isVideoOff: next });
  },

  toggleSpeaker: async () => {
    Haptics.selectionAsync();
    const next = !get().isSpeakerOn;
    set({ isSpeakerOn: next });
    await applyHardwareAudioRouting(next);
  },

  switchCamera: () => {
    Haptics.selectionAsync();
    getWebRTCService().switchCamera();
    set((s) => ({ isFrontCamera: !s.isFrontCamera }));
  },

  setRemoteStream: (remoteStream) => {
    set({ remoteStream });
  },

  startDurationTimer: () => {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      get().tickDuration();
    }, 1000);
  },

  stopDurationTimer: () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  },

  tickDuration: () => {
    set((s) => ({ callDuration: s.callDuration + 1 }));
  },

  resetCall: () => {
    if (timeoutTimer) {
      clearTimeout(timeoutTimer);
      timeoutTimer = null;
    }
    get().stopDurationTimer();
    stopRingtone();
    stopDialingTone();
    getWebRTCService().cleanup();
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
