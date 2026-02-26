import { authApi } from "../axios/apiServices";
import type { LoginRequestData, LoginResponseData } from "../../types/auth/login";
import { handleApiError } from "../../utils/apiErrorHandler";
import { useAuthStore } from "../../store/authStore";

export const loginBarangayAccount = async (
  data: LoginRequestData
): Promise<LoginResponseData> => {
  try {
    const response = await authApi.post<LoginResponseData>("/officials-login", data);

    const store = useAuthStore.getState();
    store.setAccessToken(response.access_token);
    store.mapDataFromBackend(response);

    if (!store.isAuthenticated) {
      store.clearAuthLocal();
      throw new Error("Unauthorized: Invalid user role. Access denied.");
    }

    return response;
  } catch (error: any) {
    if (error.response?.status === 401) {
      throw new Error("Invalid email or password. Please try again.");
    }
    if (error.message?.includes("Unauthorized")) {
      throw error;
    }
    throw handleApiError(error);
  }
};

export const logoutBarangayAccount = async (): Promise<void> => {
  try {
    await authApi.post<void>("/logout", {});
    useAuthStore.getState().clearAuth?.();
  } catch (error) {
    throw handleApiError(error);
  }
};