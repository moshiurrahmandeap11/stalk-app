import Constants from "expo-constants";
import { Platform } from "react-native";

const getApiBaseUrl = () => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (!envUrl || envUrl.includes("192.168.0.200") || envUrl.includes("localhost") || envUrl.includes("127.0.0.1")) {
    return "https://stalk-api.ahsanul.dev";
  }
  return envUrl;
};

const getSocketUrl = () => {
  const envUrl = process.env.EXPO_PUBLIC_SOCKET_URL;
  if (!envUrl || envUrl.includes("192.168.0.200") || envUrl.includes("localhost") || envUrl.includes("127.0.0.1")) {
    return "https://stalk-api.ahsanul.dev";
  }
  return envUrl;
};

export const ENV = {
  API_BASE_URL: getApiBaseUrl(),
  SOCKET_URL: getSocketUrl(),
  API_PREFIX: "/api/v1",
};

