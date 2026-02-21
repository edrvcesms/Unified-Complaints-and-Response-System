import { authApi } from "../axios/apiServices";

export const refreshToken = async (): Promise<{ barangayAccessToken: string } | null> => {
  try {
    const response = await authApi.post("/token-refresh", {}, { withCredentials: true });
    return response.data;
  }catch (error) {
    console.error("Failed to refresh token:", error);
    throw error;
  }
};