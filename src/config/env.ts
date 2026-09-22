import Constants from "expo-constants";
import { Platform } from "react-native";

const getDevHost = () => {
  // 1. Try to auto-detect the dev machine IP from Expo's Metro host URI (works on physical devices & emulators in Expo Go)
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(":")[0];
    if (ip) {
      return `http://${ip}:6969`;
    }
  }

  // 2. Default to current local network IP (reachable by physical phones on same Wi-Fi)
  return "http://192.168.0.200:6969";
};

export const ENV = {
  API_BASE_URL: process.env.EXPO_PUBLIC_API_URL || getDevHost(),
  SOCKET_URL: process.env.EXPO_PUBLIC_SOCKET_URL || getDevHost(),
  API_PREFIX: "/api/v1",
};
