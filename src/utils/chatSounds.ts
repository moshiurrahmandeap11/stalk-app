import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";

// High-performance lightweight audio chimes for chat
const SEND_SOUND_URI =
  "https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3"; // Subtle clean pop/whoosh
const RECEIVE_SOUND_URI =
  "https://assets.mixkit.co/active_storage/sfx/2344/2344-preview.mp3"; // Clean Messenger chime
const REACTION_SOUND_URI =
  "https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3"; // Crisp reaction pop

let sendSoundObject: Audio.Sound | null = null;
let receiveSoundObject: Audio.Sound | null = null;
let reactionSoundObject: Audio.Sound | null = null;
let isAudioConfigured = false;
let isSoundEnabled = true;

export const setChatSoundsEnabled = (enabled: boolean) => {
  isSoundEnabled = enabled;
};

export const isChatSoundsEnabled = () => isSoundEnabled;

async function setupAudio() {
  if (isAudioConfigured) return;
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
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
    // Graceful fallback to haptics
  }
};

export const playReceiveSound = async () => {
  try {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (!isSoundEnabled) return;
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
    // Graceful fallback to haptics
  }
};

export const playReactionSound = async () => {
  try {
    Haptics.selectionAsync();
    if (!isSoundEnabled) return;
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
