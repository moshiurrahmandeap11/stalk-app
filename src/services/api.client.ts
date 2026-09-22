import axios from "axios";
import { ENV } from "../config/env";
import { Storage } from "../utils/storage";

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

// Response Interceptor: handle 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = await Storage.getItem("refreshToken");
        if (refreshToken) {
          const res = await axios.post(
            `${ENV.API_BASE_URL}${ENV.API_PREFIX}/auth/refresh-token`,
            {},
            {
              headers: {
                Cookie: `refreshToken=${refreshToken}`,
              },
            }
          );
          const newToken = res.data?.data?.accessToken || res.data?.accessToken;
          if (newToken) {
            await Storage.setItem("accessToken", newToken);
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return apiClient(originalRequest);
          }
        }
      } catch (refreshErr) {
        await Storage.removeItem("accessToken");
        await Storage.removeItem("refreshToken");
        await Storage.removeItem("user");
      }
    }
    return Promise.reject(error);
  }
);
