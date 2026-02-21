import { authApi } from "../axios/apiServices";
import type { BarangayAccountData } from "../../types/barangay/barangayAccount";

export const refreshToken = async (): Promise<{ barangayAccessToken: string, barangayAccountData: BarangayAccountData | null } | null> => {
  try {
    const response = await authApi.post("/token-refresh", {}, { withCredentials: true });
    return response.data;
  }catch (error) {
    console.error("Failed to refresh token:", error);
    throw error;
  }
};