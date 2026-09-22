import { apiClient } from "./api.client";
import { IAuthResponse, ILoginPayload, ISignupPayload } from "../interfaces/auth.interface";
import { IUser } from "../interfaces/user.interface";

export const authService = {
  async login(payload: ILoginPayload): Promise<IAuthResponse> {
    const res = await apiClient.post<IAuthResponse>("/auth/login", payload);
    return res.data;
  },

  async signup(payload: ISignupPayload): Promise<IAuthResponse> {
    const res = await apiClient.post<IAuthResponse>("/auth/signup", payload);
    return res.data;
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post("/auth/logout");
    } catch {}
  },

  async getMe(): Promise<IUser> {
    const res = await apiClient.get<{ success: boolean; data: IUser }>("/users/me");
    return res.data.data;
  },

  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken?: string }> {
    const res = await apiClient.post<{ success: boolean; data: { accessToken: string; refreshToken?: string } }>(
      "/auth/refresh-token",
      { refreshToken }
    );
    return res.data.data;
  },
};

