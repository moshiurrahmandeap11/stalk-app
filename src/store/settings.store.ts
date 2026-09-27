import { create } from "zustand";
import { Storage } from "../utils/storage";

export interface SettingsState {
  activeStatus: boolean;
  readReceipts: boolean;
  pushNotifications: boolean;
  notificationSound: boolean;
  notificationVibration: boolean;
  dataSaver: boolean;
  darkMode: "system" | "light" | "dark";
  profileAudience: "public" | "friends" | "only_me";
  
  loadSettings: () => Promise<void>;
  setActiveStatus: (val: boolean) => Promise<void>;
  setReadReceipts: (val: boolean) => Promise<void>;
  setPushNotifications: (val: boolean) => Promise<void>;
  setNotificationSound: (val: boolean) => Promise<void>;
  setNotificationVibration: (val: boolean) => Promise<void>;
  setDataSaver: (val: boolean) => Promise<void>;
  setDarkMode: (val: "system" | "light" | "dark") => Promise<void>;
  setProfileAudience: (val: "public" | "friends" | "only_me") => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  activeStatus: true,
  readReceipts: true,
  pushNotifications: true,
  notificationSound: true,
  notificationVibration: true,
  dataSaver: false,
  darkMode: "system",
  profileAudience: "public",

  loadSettings: async () => {
    try {
      const activeStatus = await Storage.getItem("setting_activeStatus");
      const readReceipts = await Storage.getItem("setting_readReceipts");
      const pushNotifications = await Storage.getItem("setting_pushNotifications");
      const notificationSound = await Storage.getItem("setting_notificationSound");
      const notificationVibration = await Storage.getItem("setting_notificationVibration");
      const dataSaver = await Storage.getItem("setting_dataSaver");
      const darkMode = await Storage.getItem("setting_darkMode");
      const profileAudience = await Storage.getItem("setting_profileAudience");

      set({
        activeStatus: activeStatus !== null ? activeStatus === "true" : true,
        readReceipts: readReceipts !== null ? readReceipts === "true" : true,
        pushNotifications: pushNotifications !== null ? pushNotifications === "true" : true,
        notificationSound: notificationSound !== null ? notificationSound === "true" : true,
        notificationVibration: notificationVibration !== null ? notificationVibration === "true" : true,
        dataSaver: dataSaver !== null ? dataSaver === "true" : false,
        darkMode: (darkMode as "system" | "light" | "dark") || "system",
        profileAudience: (profileAudience as "public" | "friends" | "only_me") || "public",
      });
    } catch {
      // ignore
    }
  },

  setActiveStatus: async (val: boolean) => {
    set({ activeStatus: val });
    await Storage.setItem("setting_activeStatus", String(val));
  },

  setReadReceipts: async (val: boolean) => {
    set({ readReceipts: val });
    await Storage.setItem("setting_readReceipts", String(val));
  },

  setPushNotifications: async (val: boolean) => {
    set({ pushNotifications: val });
    await Storage.setItem("setting_pushNotifications", String(val));
  },

  setNotificationSound: async (val: boolean) => {
    set({ notificationSound: val });
    await Storage.setItem("setting_notificationSound", String(val));
  },

  setNotificationVibration: async (val: boolean) => {
    set({ notificationVibration: val });
    await Storage.setItem("setting_notificationVibration", String(val));
  },

  setDataSaver: async (val: boolean) => {
    set({ dataSaver: val });
    await Storage.setItem("setting_dataSaver", String(val));
  },

  setDarkMode: async (val: "system" | "light" | "dark") => {
    set({ darkMode: val });
    await Storage.setItem("setting_darkMode", val);
  },

  setProfileAudience: async (val: "public" | "friends" | "only_me") => {
    set({ profileAudience: val });
    await Storage.setItem("setting_profileAudience", val);
  },
}));
