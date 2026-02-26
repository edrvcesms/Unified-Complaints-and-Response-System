import { authApi } from "../axios/apiServices";
import type { LoginRequestData, LoginResponseData } from "../../types/auth/login";
import { handleApiError } from "../../utils/apiErrorHandler";
import { useAuthStore } from "../../store/authStore";

export const loginBarangayAccount = async (
  data: LoginRequestData
): Promise<LoginResponseData> => {
  try {
    const response = await authApi.post<LoginResponseData>("/login", data);

    const store = useAuthStore.getState();
    store.setAccessToken(response.access_token);
    store.mapDataFromBackend(response);

    return response;
  } catch (error) {
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