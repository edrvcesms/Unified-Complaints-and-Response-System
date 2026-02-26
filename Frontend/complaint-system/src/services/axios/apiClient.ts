import type { AxiosInstance, AxiosRequestConfig } from "axios";

export const createApiClient = (axiosInstance: AxiosInstance) => {
  return {
    get: async <T = unknown>(
      url: string,
      config?: AxiosRequestConfig
    ): Promise<T> => {
      const response = await axiosInstance.get<T>(url, config);
      return response.data;
    },

    post: async <T = unknown>(
      url: string,
      data?: unknown,
      config?: AxiosRequestConfig
    ): Promise<T> => {
      console.log("POST Request to:", url, "with data:", data);
      const response = await axiosInstance.post<T>(url, data, config);
      return response.data;
    },

    put: async <T = unknown>(
      url: string,
      data?: unknown,
      config?: AxiosRequestConfig
    ): Promise<T> => {
      const response = await axiosInstance.put<T>(url, data, config);
      return response.data;
    },

    patch: async <T = unknown>(
      url: string,
      data?: unknown,
      config?: AxiosRequestConfig
    ): Promise<T> => {
      const response = await axiosInstance.patch<T>(url, data, config);
      return response.data;
    },

    delete: async <T = unknown>(
      url: string,
      config?: AxiosRequestConfig
    ): Promise<T> => {
      const response = await axiosInstance.delete<T>(url, config);
      return response.data;
    },
  };
};