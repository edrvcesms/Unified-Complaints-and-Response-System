import { authApi } from "../axios/apiServices";
import type { LoginRequestData } from "../../types/auth/login";
import { handleApiError } from "../../utils/apiErrorHandler";
import { useBarangayStore } from "../../store/authStore";

export const loginBarangayAccount = async (data: LoginRequestData) => {
  try {
    const response = await authApi.post("/login", data, { withCredentials: true });
    console.log("Login response:", response.data);
    const { barangayAccessToken, barangayAccountData } = response.data;
    useBarangayStore.getState().setBarangayAccessToken(barangayAccessToken);
    useBarangayStore.getState().mapDataFromBackend(barangayAccountData);
    return response.data;
  } catch (error) {
    const errorMessage = handleApiError(error);
    console.error("Login failed:", errorMessage.message);
    throw error;
  }
};

export const logoutBarangayAccount = async () => {
  try {
    await authApi.post("/logout", { withCredentials: true });
  } catch (error) {
    const errorMessage = handleApiError(error);
    console.error("Logout failed:", errorMessage.message);
    console.error("Logout failed:", error);
    throw error;
  }
};