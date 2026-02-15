import { authApi } from "../axios/apiServices";

export const refreshToken = async (): Promise<{ accessToken: string } | null> => {
  try {
    const response = await authApi.post("/refresh-token", {}, { withCredentials: true });
    return response.data;
  }catch (error) {
    console.error("Failed to refresh token:", error);
    return null;
  }
};