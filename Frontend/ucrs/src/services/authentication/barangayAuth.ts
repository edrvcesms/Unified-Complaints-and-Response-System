import { authApi } from "../axios/apiServices";
import type { LoginRequestData } from "../../types/auth/login";
import { useBarangayStore } from "../../store/authStore";

export const loginBarangayAccount = async (data: LoginRequestData) => {
  try {
    const response = await authApi.post("/login", data);
    const { barangayAccessToken, barangayAccountData } = response.data;
    useBarangayStore.getState().setBarangayAccessToken(barangayAccessToken);
    useBarangayStore.getState().mapDataFromBackend(barangayAccountData);
    return response.data;
  } catch (error) {
    console.error("Login failed:", error);
    throw error;
  }
};

export const logoutBarangayAccount = async () => {
  try {
    await authApi.post("/logout");
    useBarangayStore.getState().clearBarangayAuth();
  } catch (error) {
    console.error("Logout failed:", error);
    throw error;
  }
};