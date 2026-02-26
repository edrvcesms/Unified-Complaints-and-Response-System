import { authApi } from "../axios/apiServices";
import type { BarangayAccountData } from "../../types/barangay/barangayAccount";

export const refreshToken = async (): Promise<{ 
  access_token: string, 
  barangayAccountData?: BarangayAccountData | null,
  departmentAccountData?: any | null,
  role?: string
} | null> => {
  try {
    return await authApi.post("/refresh-token");
  }catch (error: any) {
    if (error.response?.status === 401) {
      return null;
    }
    throw error;
  }
};