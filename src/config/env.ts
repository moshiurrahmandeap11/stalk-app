import { Platform } from "react-native";

// In development, Android emulator accesses localhost via 10.0.2.2, while physical devices or iOS use LAN IP or localhost
const getDevHost = () => {
  if (Platform.OS === "android") {
    return "http://10.0.2.2:6969";
  }
  return "http://localhost:6969";
};

export const ENV = {
  API_BASE_URL: process.env.EXPO_PUBLIC_API_URL || getDevHost(),
  SOCKET_URL: process.env.EXPO_PUBLIC_SOCKET_URL || getDevHost(),
  API_PREFIX: "/api/v1",
};

