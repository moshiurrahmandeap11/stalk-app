import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const isWeb = Platform.OS === "web";

export const Storage = {
  async getItem(key: string): Promise<string | null> {
    try {
      if (isWeb) {
        if (typeof window !== "undefined") {
          return localStorage.getItem(key);
        }
        return null;
      }
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      if (isWeb) {
        if (typeof window !== "undefined") {
          localStorage.setItem(key, value);
        }
        return;
      }
      await SecureStore.setItemAsync(key, value);
    } catch (e) {
      console.warn("Error saving to secure store:", e);
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      if (isWeb) {
        if (typeof window !== "undefined") {
          localStorage.removeItem(key);
        }
        return;
      }
      await SecureStore.deleteItemAsync(key);
    } catch (e) {
      console.warn("Error deleting from secure store:", e);
    }
  },
};

