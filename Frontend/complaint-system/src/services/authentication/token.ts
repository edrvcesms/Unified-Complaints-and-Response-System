import { authApi } from "../axios/apiServices";

export const refreshToken = async (): Promise<{ accessToken: string } | null> => {
  try {
    const response = await authApi.post("/token-refresh", {}, { withCredentials: true });
    console.log("Token refresh response:", response.data);
    return response.data;
  }catch (error) {
    console.error("Failed to refresh token:", error);
    return null;
  }
};