import { authApi } from "../axios/apiServices";
import type { LoginRequestData, LoginResponseData } from "../../types/auth/login";
import { handleApiError } from "../../utils/apiErrorHandler";
import { useBarangayStore } from "../../store/authStore";

export const loginBarangayAccount = async (
  data: LoginRequestData
): Promise<LoginResponseData> => {
  try {
    const response = await authApi.post<LoginResponseData>("/login", data);

    const { barangayAccessToken, barangayAccountData } = response;

    const store = useBarangayStore.getState();
    store.setBarangayAccessToken(barangayAccessToken);
    store.mapDataFromBackend(barangayAccountData);

    return response;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const logoutBarangayAccount = async (): Promise<void> => {
  try {
    await authApi.post<void>("/logout", {});
    useBarangayStore.getState().clearBarangayAuth?.();
  } catch (error) {
    throw handleApiError(error);
  }
};