import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { ENV } from "../config/env";
import { Storage } from "../utils/storage";
import { useAuthStore } from "../store/auth.store";

export const apiClient = axios.create({
  baseURL: `${ENV.API_BASE_URL}${ENV.API_PREFIX}`,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

// Request Interceptor: inject Bearer token
apiClient.interceptors.request.use(
  async (config) => {
    const token = await Storage.getItem("accessToken");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Queue for holding requests while token is refreshing
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((promise) => {
    if (token) {
      promise.resolve(token);
    } else {
      promise.reject(error);
    }
  });
  failedQueue = [];
};

// Response Interceptor: handle 401 & auto refresh token or logout
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;

    // If no config or error status is not 401, reject immediately
    if (!originalRequest || error.response?.status !== 401) {
      return Promise.reject(error);
    }

    const url = originalRequest.url || "";

    // Do NOT attempt refresh on auth endpoints (login, register, or refresh-token itself)
    if (
      url.includes("/auth/refresh-token") ||
      url.includes("/auth/login") ||
      url.includes("/auth/signup") ||
      url.includes("/auth/register")
    ) {
      // If refresh-token endpoint itself gave 401, the refresh token has expired -> LOGOUT!
      if (url.includes("/auth/refresh-token")) {
        await useAuthStore.getState().logout();
      }
      return Promise.reject(error);
    }

    // If this request was already retried once and failed again, session is invalid -> LOGOUT
    if (originalRequest._retry) {
      await useAuthStore.getState().logout();
      return Promise.reject(error);
    }

    // If another refresh request is already running in background, queue this request
    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((newToken) => {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
          }
          return apiClient(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const storedRefreshToken = await Storage.getItem("refreshToken");

      if (!storedRefreshToken) {
        // No refresh token available -> session is dead, log out user immediately
        processQueue(new Error("Session expired. Please log in again."), null);
        await useAuthStore.getState().logout();
        return Promise.reject(error);
      }

      // Call refresh-token endpoint with refreshToken in body, Cookie header, and x-refresh-token header
      const refreshResponse = await axios.post(
        `${ENV.API_BASE_URL}${ENV.API_PREFIX}/auth/refresh-token`,
        { refreshToken: storedRefreshToken },
        {
          headers: {
            Cookie: `refreshToken=${storedRefreshToken}`,
            "x-refresh-token": storedRefreshToken,
          },
          timeout: 10000,
        }
      );

      const newAccessToken =
        refreshResponse.data?.data?.accessToken ||
        refreshResponse.data?.accessToken;
      const newRefreshToken =
        refreshResponse.data?.data?.refreshToken ||
        refreshResponse.data?.refreshToken ||
        storedRefreshToken;

      if (!newAccessToken) {
        throw new Error("Failed to receive new access token");
      }

      // Update both persistent Storage and Zustand auth store
      await useAuthStore.getState().setTokens(newAccessToken, newRefreshToken);

      // Release all queued requests with the new token
      processQueue(null, newAccessToken);

      // Retry original request with new access token
      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      }
      return apiClient(originalRequest);
    } catch (refreshErr) {
      // If refresh failed (e.g. 7-day token expired or rejected by server), LOG OUT!
      processQueue(refreshErr, null);
      await useAuthStore.getState().logout();
      return Promise.reject(refreshErr);
    } finally {
      isRefreshing = false;
    }
  }
);
