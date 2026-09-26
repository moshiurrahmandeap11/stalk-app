import {
  setAudioModeAsync as expoSetAudioModeAsync,
  createAudioPlayer as expoCreateAudioPlayer,
  requestRecordingPermissionsAsync as expoRequestRecordingPermissionsAsync,
  getRecordingPermissionsAsync as expoGetRecordingPermissionsAsync,
  RecordingPresets,
  type AudioPlayer,
} from "expo-audio";

export {
  expoCreateAudioPlayer as createAudioPlayer,
  expoSetAudioModeAsync as setAudioModeAsync,
  expoRequestRecordingPermissionsAsync as requestRecordingPermissionsAsync,
  expoGetRecordingPermissionsAsync as getRecordingPermissionsAsync,
  RecordingPresets,
  type AudioPlayer,
};

export const isAudioSupported = true;
