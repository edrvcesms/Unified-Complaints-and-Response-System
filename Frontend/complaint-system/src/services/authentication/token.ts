import { authApi } from "../axios/apiServices";
import type { BarangayAccountData } from "../../types/barangay/barangayAccount";

export const refreshToken = async (): Promise<{ access_token: string, barangayAccountData: BarangayAccountData | null } | null> => {
  try {
    const response = await authApi.post("/refresh-token", {}, { withCredentials: true });
    console.log("Refresh token response:", response.data);
    return response.data;
  }catch (error: any) {
    if (error.response?.status === 401) {
      return null;
    }
    throw error;
  }
};