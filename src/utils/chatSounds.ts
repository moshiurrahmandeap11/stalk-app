import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import { Audio, isAudioSupported } from "./safeAudio";

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

let sendSoundObject: any = null;
let receiveSoundObject: any = null;
let reactionSoundObject: any = null;
let notificationSoundObject: any = null;
let ringtoneSoundObject: any = null;
let dialingSoundObject: any = null;
let ringtoneHapticTimer: any = null;

let isAudioConfigured = false;
let isSoundEnabled = true;

export const setChatSoundsEnabled = (enabled: boolean) => {
  isSoundEnabled = enabled;
};

export const isChatSoundsEnabled = () => isSoundEnabled;

async function setupAudio() {
  if (isAudioConfigured) return;
  if (!Audio || !isAudioSupported) return;

  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
    });
    isAudioConfigured = true;
  } catch {
    // Non-blocking
  }
}

/**
 * Preload sound objects in memory so playback triggers with 0ms latency.
 */
export const preloadChatSounds = async () => {
  if (!Audio || !isAudioSupported) return;

  try {
    await setupAudio();

    if (!sendSoundObject) {
      const { sound } = await Audio.Sound.createAsync(
        { uri: SEND_SOUND_URI },
        { volume: 0.6, shouldPlay: false }
      );
      sendSoundObject = sound;
    }

    if (!receiveSoundObject) {
      const { sound } = await Audio.Sound.createAsync(
        { uri: RECEIVE_SOUND_URI },
        { volume: 0.8, shouldPlay: false }
      );
      receiveSoundObject = sound;
    }

    if (!reactionSoundObject) {
      const { sound } = await Audio.Sound.createAsync(
        { uri: REACTION_SOUND_URI },
        { volume: 0.5, shouldPlay: false }
      );
      reactionSoundObject = sound;
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

    if (!Audio || !isAudioSupported) return;
    await setupAudio();

    if (!sendSoundObject) {
      const { sound } = await Audio.Sound.createAsync(
        { uri: SEND_SOUND_URI },
        { volume: 0.6, shouldPlay: true }
      );
      sendSoundObject = sound;
    } else {
      await sendSoundObject.replayAsync();
    }
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

    if (!Audio || !isAudioSupported) return;
    await setupAudio();

    if (!receiveSoundObject) {
      const { sound } = await Audio.Sound.createAsync(
        { uri: RECEIVE_SOUND_URI },
        { volume: 0.8, shouldPlay: true }
      );
      receiveSoundObject = sound;
    } else {
      await receiveSoundObject.replayAsync();
    }
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

    if (!Audio || !isAudioSupported) return;
    await setupAudio();

    if (!reactionSoundObject) {
      const { sound } = await Audio.Sound.createAsync(
        { uri: REACTION_SOUND_URI },
        { volume: 0.5, shouldPlay: true }
      );
      reactionSoundObject = sound;
    } else {
      await reactionSoundObject.replayAsync();
    }
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

    if (!Audio || !isAudioSupported) return;
    await setupAudio();

    if (!notificationSoundObject) {
      const { sound } = await Audio.Sound.createAsync(
        { uri: NOTIFICATION_SOUND_URI },
        { volume: 0.85, shouldPlay: true }
      );
      notificationSoundObject = sound;
    } else {
      await notificationSoundObject.replayAsync();
    }
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
    if (Audio && isAudioSupported) {
      await setupAudio();
      if (!ringtoneSoundObject) {
        const { sound } = await Audio.Sound.createAsync(
          { uri: RINGTONE_SOUND_URI },
          { volume: 1.0, isLooping: true, shouldPlay: true }
        );
        ringtoneSoundObject = sound;
      } else {
        await ringtoneSoundObject.setIsLoopingAsync(true);
        await ringtoneSoundObject.playAsync();
      }
    }
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
    if (ringtoneSoundObject) {
      await ringtoneSoundObject.stopAsync();
      await ringtoneSoundObject.unloadAsync();
      ringtoneSoundObject = null;
    }
  } catch {
    ringtoneSoundObject = null;
  }
};

/**
 * Starts continuous looping outgoing dialing tone
 */
export const playDialingTone = async () => {
  try {
    if (!isSoundEnabled) return;
    if (Audio && isAudioSupported) {
      await setupAudio();
      if (!dialingSoundObject) {
        const { sound } = await Audio.Sound.createAsync(
          { uri: DIALING_SOUND_URI },
          { volume: 0.7, isLooping: true, shouldPlay: true }
        );
        dialingSoundObject = sound;
      } else {
        await dialingSoundObject.setIsLoopingAsync(true);
        await dialingSoundObject.playAsync();
      }
    }
  } catch {
    // Non-blocking
  }
};

export const stopDialingTone = async () => {
  try {
    if (dialingSoundObject) {
      await dialingSoundObject.stopAsync();
      await dialingSoundObject.unloadAsync();
      dialingSoundObject = null;
    }
  } catch {
    dialingSoundObject = null;
  }
};

export const playCallEndedSound = async () => {
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    stopRingtone();
    stopDialingTone();

    if (!isSoundEnabled) return;
    if (Audio && isAudioSupported) {
      await setupAudio();
      const { sound } = await Audio.Sound.createAsync(
        { uri: CALL_END_SOUND_URI },
        { volume: 0.8, shouldPlay: true }
      );
      setTimeout(() => {
        sound.unloadAsync().catch(() => {});
      }, 2000);
    }
  } catch {
    // Non-blocking
  }
};
