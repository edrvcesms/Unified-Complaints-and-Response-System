import axios, { type AxiosInstance, AxiosError } from "axios";
import { refreshToken } from "../authentication/token";
import { useBarangayStore } from "../../store/authStore";

declare module "axios" {
  export interface AxiosRequestConfig {
    _retry?: boolean;
  }
}

let isRefreshing = false;
let failedQueue: { resolve: (value?: unknown) => void; reject: (reason?: unknown) => void }[] = [];

const processQueue = (error?: any) => {
  failedQueue.forEach(p => error ? p.reject(error) : p.resolve());
  failedQueue = [];
};

export const createApiInstance = (baseUrl: string, withCredentials?: boolean): AxiosInstance => {
  const instance: AxiosInstance = axios.create({
    baseURL: baseUrl,
    withCredentials
  });

  instance.interceptors.request.use(async (config) => {
    const token = useBarangayStore.getState().barangayAccessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    config.withCredentials = true;
    return config;
  });

  instance.interceptors.response.use(
    response => response,
    async (error: AxiosError) => {
      const originalRequest = error.config;
      if (!originalRequest) return Promise.reject(error);

      if (error.response?.status === 401 && !originalRequest._retry) {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          }).then(() => instance(originalRequest));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const refreshed = await refreshToken();
          if (!refreshed) throw new Error("Refresh failed");

          useBarangayStore.getState().setBarangayAccessToken(refreshed.accessToken);
          processQueue(null);
          originalRequest.headers.Authorization = `Bearer ${refreshed.accessToken}`;
          return instance(originalRequest);
        } catch (refreshError) {
          processQueue(refreshError);
          useBarangayStore.getState().clearBarangayAuth();
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }

      return Promise.reject(error);
    }
  );

  return instance;
};