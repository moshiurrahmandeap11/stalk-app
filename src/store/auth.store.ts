import { create } from "zustand";
import { IUser } from "../interfaces/user.interface";
import { Storage } from "../utils/storage";
import { authService } from "../services/auth.service";

interface AuthState {
  user: IUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: IUser, token: string, refreshToken?: string) => Promise<void>;
  setTokens: (accessToken: string, refreshToken?: string) => Promise<void>;
  restoreSession: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: true,

  async setAuth(user: IUser, token: string, refreshToken?: string) {
    await Storage.setItem("accessToken", token);
    if (refreshToken) {
      await Storage.setItem("refreshToken", refreshToken);
    }
    await Storage.setItem("user", JSON.stringify(user));
    set({ user, accessToken: token, isAuthenticated: true, isLoading: false });
  },

  async setTokens(accessToken: string, refreshToken?: string) {
    await Storage.setItem("accessToken", accessToken);
    if (refreshToken) {
      await Storage.setItem("refreshToken", refreshToken);
    }
    set({ accessToken });
  },

  async restoreSession() {
    try {
      const token = await Storage.getItem("accessToken");
      const userStr = await Storage.getItem("user");

      if (token && userStr) {
        const user = JSON.parse(userStr);
        set({ user, accessToken: token, isAuthenticated: true, isLoading: false });

        // Refresh profile in background
        authService
          .getMe()
          .then((freshUser) => {
            set({ user: freshUser });
            Storage.setItem("user", JSON.stringify(freshUser));
          })
          .catch(() => {});
      } else {
        set({ user: null, accessToken: null, isAuthenticated: false, isLoading: false });
      }
    } catch {
      set({ user: null, accessToken: null, isAuthenticated: false, isLoading: false });
    }
  },

  async logout() {
    try {
      await authService.logout();
    } catch {}
    await Storage.removeItem("accessToken");
    await Storage.removeItem("refreshToken");
    await Storage.removeItem("user");
    set({ user: null, accessToken: null, isAuthenticated: false, isLoading: false });
  },
}));

