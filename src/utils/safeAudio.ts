import type { Audio as ExpoAudioType } from "expo-av";

/**
 * Safe Audio wrapper that prevents crashes when ExponentAV native module
 * is not present in Expo Go, Web, or unlinked custom native runtimes.
 */
let AudioModule: any = null;

try {
  const av = require("expo-av");
  if (av && av.Audio) {
    AudioModule = av.Audio;
  }
} catch {
  // Native module ExponentAV not available in current runtime
}

export const Audio = AudioModule as typeof ExpoAudioType | null;
export const isAudioSupported = Boolean(AudioModule);

export type AudioRecording = any;
export type AudioSound = any;
