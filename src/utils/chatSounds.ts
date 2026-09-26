import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
} from "./safeAudio";

// High-performance lightweight audio chimes for chat & calling
const SEND_SOUND_URI =
  "https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3";
const RECEIVE_SOUND_URI =
  "https://assets.mixkit.co/active_storage/sfx/2344/2344-preview.mp3";
const REACTION_SOUND_URI =
  "https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3";
const NOTIFICATION_SOUND_URI =
  "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";
const RINGTONE_SOUND_URI =
  "https://assets.mixkit.co/active_storage/sfx/1359/1359-preview.mp3";
const DIALING_SOUND_URI =
  "https://assets.mixkit.co/active_storage/sfx/1360/1360-preview.mp3";
const CALL_END_SOUND_URI =
  "https://assets.mixkit.co/active_storage/sfx/2573/2573-preview.mp3";

let sendPlayer: AudioPlayer | null = null;
let receivePlayer: AudioPlayer | null = null;
let reactionPlayer: AudioPlayer | null = null;
let notificationPlayer: AudioPlayer | null = null;
let ringtonePlayer: AudioPlayer | null = null;
let dialingPlayer: AudioPlayer | null = null;
let ringtoneHapticTimer: any = null;

let isAudioConfigured = false;
let isSoundEnabled = true;

export const setChatSoundsEnabled = (enabled: boolean) => {
  isSoundEnabled = enabled;
};

export const isChatSoundsEnabled = () => isSoundEnabled;

async function setupAudio() {
  if (isAudioConfigured) return;
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: "duckOthers",
    });
    isAudioConfigured = true;
  } catch {
    // Non-blocking
  }
}

/**
 * Preload sound players in memory so playback triggers with 0ms latency.
 */
export const preloadChatSounds = async () => {
  try {
    await setupAudio();

    if (!sendPlayer) {
      sendPlayer = createAudioPlayer(SEND_SOUND_URI);
      sendPlayer.volume = 0.6;
    }
    if (!receivePlayer) {
      receivePlayer = createAudioPlayer(RECEIVE_SOUND_URI);
      receivePlayer.volume = 0.8;
    }
    if (!reactionPlayer) {
      reactionPlayer = createAudioPlayer(REACTION_SOUND_URI);
      reactionPlayer.volume = 0.5;
    }
  } catch {
    // Graceful fallback
  }
};

export const playSendSound = async () => {
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!isSoundEnabled) return;

    if (Platform.OS === "web" && typeof window !== "undefined" && (window as any).Audio) {
      new (window as any).Audio(SEND_SOUND_URI).play().catch(() => {});
      return;
    }

    await setupAudio();
    if (!sendPlayer) {
      sendPlayer = createAudioPlayer(SEND_SOUND_URI);
      sendPlayer.volume = 0.6;
    }
    sendPlayer.seekTo(0).catch(() => {});
    sendPlayer.play();
  } catch {
    // Graceful fallback
  }
};

export const playReceiveSound = async () => {
  try {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (!isSoundEnabled) return;

    if (Platform.OS === "web" && typeof window !== "undefined" && (window as any).Audio) {
      new (window as any).Audio(RECEIVE_SOUND_URI).play().catch(() => {});
      return;
    }

    await setupAudio();
    if (!receivePlayer) {
      receivePlayer = createAudioPlayer(RECEIVE_SOUND_URI);
      receivePlayer.volume = 0.8;
    }
    receivePlayer.seekTo(0).catch(() => {});
    receivePlayer.play();
  } catch {
    // Graceful fallback
  }
};

export const playReactionSound = async () => {
  try {
    Haptics.selectionAsync();
    if (!isSoundEnabled) return;

    if (Platform.OS === "web" && typeof window !== "undefined" && (window as any).Audio) {
      new (window as any).Audio(REACTION_SOUND_URI).play().catch(() => {});
      return;
    }

    await setupAudio();
    if (!reactionPlayer) {
      reactionPlayer = createAudioPlayer(REACTION_SOUND_URI);
      reactionPlayer.volume = 0.5;
    }
    reactionPlayer.seekTo(0).catch(() => {});
    reactionPlayer.play();
  } catch {
    // Graceful fallback
  }
};

export const playNotificationSound = async () => {
  try {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (!isSoundEnabled) return;

    if (Platform.OS === "web" && typeof window !== "undefined" && (window as any).Audio) {
      new (window as any).Audio(NOTIFICATION_SOUND_URI).play().catch(() => {});
      return;
    }

    await setupAudio();
    if (!notificationPlayer) {
      notificationPlayer = createAudioPlayer(NOTIFICATION_SOUND_URI);
      notificationPlayer.volume = 0.85;
    }
    notificationPlayer.seekTo(0).catch(() => {});
    notificationPlayer.play();
  } catch {
    // Graceful fallback
  }
};

/**
 * Starts continuous looping incoming ringtone + rhythmic haptics
 */
export const playRingtone = async () => {
  try {
    if (ringtoneHapticTimer) clearInterval(ringtoneHapticTimer);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    ringtoneHapticTimer = setInterval(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }, 1600);

    if (!isSoundEnabled) return;
    await setupAudio();
    if (!ringtonePlayer) {
      ringtonePlayer = createAudioPlayer(RINGTONE_SOUND_URI);
      ringtonePlayer.loop = true;
      ringtonePlayer.volume = 1.0;
    }
    ringtonePlayer.loop = true;
    ringtonePlayer.play();
  } catch {
    // Non-blocking
  }
};

export const stopRingtone = async () => {
  try {
    if (ringtoneHapticTimer) {
      clearInterval(ringtoneHapticTimer);
      ringtoneHapticTimer = null;
    }
    if (ringtonePlayer) {
      ringtonePlayer.pause();
      ringtonePlayer.remove();
      ringtonePlayer = null;
    }
  } catch {
    ringtonePlayer = null;
  }
};

/**
 * Starts continuous looping outgoing dialing tone
 */
export const playDialingTone = async () => {
  try {
    if (!isSoundEnabled) return;
    await setupAudio();
    if (!dialingPlayer) {
      dialingPlayer = createAudioPlayer(DIALING_SOUND_URI);
      dialingPlayer.loop = true;
      dialingPlayer.volume = 0.7;
    }
    dialingPlayer.loop = true;
    dialingPlayer.play();
  } catch {
    // Non-blocking
  }
};

export const stopDialingTone = async () => {
  try {
    if (dialingPlayer) {
      dialingPlayer.pause();
      dialingPlayer.remove();
      dialingPlayer = null;
    }
  } catch {
    dialingPlayer = null;
  }
};

export const playCallEndedSound = async () => {
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    stopRingtone();
    stopDialingTone();

    if (!isSoundEnabled) return;
    await setupAudio();
    const endPlayer = createAudioPlayer(CALL_END_SOUND_URI);
    endPlayer.volume = 0.8;
    endPlayer.play();
    setTimeout(() => {
      try {
        endPlayer.remove();
      } catch {}
    }, 2500);
  } catch {
    // Non-blocking
  }
};
