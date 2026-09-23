/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { useSocketStore } from "../store/socket.store";

// Lazy-loaded WebRTC module to protect initial app launch lifecycle
let cachedWebRTCModule: any = null;
let hasCheckedWebRTCModule = false;

export function getWebRTCModule(): any {
  if (hasCheckedWebRTCModule) {
    return cachedWebRTCModule;
  }
  hasCheckedWebRTCModule = true;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cachedWebRTCModule = require("react-native-webrtc");
  } catch (e) {
    console.warn(
      "[WebRTC] Native react-native-webrtc module not available in current environment:",
      e
    );
    cachedWebRTCModule = null;
  }

  return cachedWebRTCModule;
}

/**
 * Checks if WebRTC native engine is supported in current runtime
 */
export const isWebRTCSupported = (): boolean => {
  const mod = getWebRTCModule();
  return Boolean(mod && mod.RTCPeerConnection && mod.mediaDevices);
};

/**
 * Safe, lazy RTCView wrapper component
 */
export const RTCView = (props: any) => {
  const mod = getWebRTCModule();
  const NativeRTCView = mod?.RTCView;
  if (!NativeRTCView) return null;
  return React.createElement(NativeRTCView, props);
};

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],
};

class WebRTCService {
  private pc: any = null;
  private localStream: any = null;
  private remoteStream: any = null;
  private targetUserId: string | null = null;
  private pendingCandidates: any[] = [];

  public getLocalStream(): any {
    return this.localStream;
  }

  public getRemoteStream(): any {
    return this.remoteStream;
  }

  /**
   * Initializes local media stream (camera & microphone)
   */
  public async startLocalStream(type: "audio" | "video"): Promise<any> {
    const mod = getWebRTCModule();
    if (!mod || !mod.mediaDevices) {
      console.log("[WebRTC] Native module not loaded, using fallback stream mode.");
      return null;
    }

    try {
      const isVideo = type === "video";
      const stream = await mod.mediaDevices.getUserMedia({
        audio: true,
        video: isVideo
          ? {
              facingMode: "user",
              width: { min: 480, ideal: 720 },
              height: { min: 640, ideal: 1280 },
              frameRate: { ideal: 30 },
            }
          : false,
      });

      this.localStream = stream;
      return stream;
    } catch (err) {
      console.warn("[WebRTC] Error acquiring local media stream:", err);
      return null;
    }
  }

  /**
   * Creates RTCPeerConnection and attaches local tracks
   */
  public createPeerConnection(
    targetUserId: string,
    onRemoteStreamUpdate: (stream: any) => void
  ): any {
    const mod = getWebRTCModule();
    if (!mod || !mod.RTCPeerConnection) return null;

    this.targetUserId = targetUserId;
    this.pendingCandidates = [];

    const pc = new mod.RTCPeerConnection(ICE_SERVERS);
    this.pc = pc;

    // Attach local media tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((track: any) => {
        try {
          pc.addTrack(track, this.localStream);
        } catch (e) {
          console.warn("[WebRTC] Error adding track to peer connection:", e);
        }
      });
    }

    // ICE Candidate handler
    pc.onicecandidate = (event: any) => {
      if (event?.candidate && this.targetUserId) {
        const socket = useSocketStore.getState().socket;
        socket?.emit("ice_candidate", {
          to: this.targetUserId,
          candidate: event.candidate,
        });
      }
    };

    // Remote Track handler
    pc.ontrack = (event: any) => {
      if (event?.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
        onRemoteStreamUpdate(event.streams[0]);
      }
    };

    pc.onconnectionstatechange = () => {
      console.log("[WebRTC] Connection state changed:", pc.connectionState);
    };

    pc.oniceconnectionstatechange = () => {
      console.log("[WebRTC] ICE connection state:", pc.iceConnectionState);
    };

    return pc;
  }

  /**
   * Caller generates SDP Offer
   */
  public async createOffer(
    targetUserId: string,
    onRemoteStreamUpdate: (stream: any) => void
  ): Promise<any> {
    const mod = getWebRTCModule();
    if (!mod || !mod.RTCPeerConnection) {
      return { type: "offer", sdp: "dummy-offer" };
    }

    this.createPeerConnection(targetUserId, onRemoteStreamUpdate);

    const offer = await this.pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });

    await this.pc.setLocalDescription(offer);
    return offer;
  }

  /**
   * Callee generates SDP Answer
   */
  public async handleOfferAndCreateAnswer(
    targetUserId: string,
    offer: any,
    onRemoteStreamUpdate: (stream: any) => void
  ): Promise<any> {
    const mod = getWebRTCModule();
    if (!mod || !mod.RTCPeerConnection) {
      return { type: "answer", sdp: "dummy-answer" };
    }

    this.createPeerConnection(targetUserId, onRemoteStreamUpdate);

    const desc = new mod.RTCSessionDescription(offer);
    await this.pc.setRemoteDescription(desc);

    // Drain queued candidates if any
    while (this.pendingCandidates.length > 0) {
      const c = this.pendingCandidates.shift();
      try {
        await this.pc.addIceCandidate(new mod.RTCIceCandidate(c));
      } catch (err) {
        console.warn("[WebRTC] Error adding queued ICE candidate:", err);
      }
    }

    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    return answer;
  }

  /**
   * Caller sets remote SDP Answer
   */
  public async handleAnswer(answer: any): Promise<void> {
    const mod = getWebRTCModule();
    if (!mod || !this.pc) return;

    try {
      const desc = new mod.RTCSessionDescription(answer);
      await this.pc.setRemoteDescription(desc);

      // Drain queued candidates if any
      while (this.pendingCandidates.length > 0) {
        const c = this.pendingCandidates.shift();
        try {
          await this.pc.addIceCandidate(new mod.RTCIceCandidate(c));
        } catch (err) {
          console.warn("[WebRTC] Error adding queued ICE candidate:", err);
        }
      }
    } catch (err) {
      console.warn("[WebRTC] Error setting remote description (answer):", err);
    }
  }

  /**
   * Handles incoming ICE Candidate
   */
  public async handleIceCandidate(candidate: any): Promise<void> {
    const mod = getWebRTCModule();
    if (!mod || !candidate) return;

    if (!this.pc || !this.pc.remoteDescription) {
      this.pendingCandidates.push(candidate);
      return;
    }

    try {
      await this.pc.addIceCandidate(new mod.RTCIceCandidate(candidate));
    } catch (err) {
      console.warn("[WebRTC] Error adding ICE candidate:", err);
    }
  }

  /**
   * Mute / Unmute microphone
   */
  public toggleMute(isMuted: boolean): void {
    if (!this.localStream) return;
    this.localStream.getAudioTracks().forEach((track: any) => {
      track.enabled = !isMuted;
    });
  }

  /**
   * Camera On / Off
   */
  public toggleVideo(isVideoOff: boolean): void {
    if (!this.localStream) return;
    this.localStream.getVideoTracks().forEach((track: any) => {
      track.enabled = !isVideoOff;
    });
  }

  /**
   * Switch between front and back camera
   */
  public switchCamera(): void {
    if (!this.localStream) return;
    const videoTrack = this.localStream.getVideoTracks()[0];
    if (videoTrack && typeof videoTrack._switchCamera === "function") {
      videoTrack._switchCamera();
    }
  }

  /**
   * Clean up and release all resources
   */
  public cleanup(): void {
    if (this.localStream) {
      try {
        this.localStream.getTracks().forEach((track: any) => {
          track.stop();
        });
      } catch (err) {
        console.warn("[WebRTC] Error stopping local tracks:", err);
      }
      this.localStream = null;
    }

    if (this.pc) {
      try {
        this.pc.close();
      } catch (err) {
        console.warn("[WebRTC] Error closing peer connection:", err);
      }
      this.pc = null;
    }

    this.remoteStream = null;
    this.targetUserId = null;
    this.pendingCandidates = [];
  }
}

export const webrtcService = new WebRTCService();
