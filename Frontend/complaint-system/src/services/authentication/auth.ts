import { authApi, usersApi } from "../axios/apiServices";
import type { LoginRequestData, LoginResponseData } from "../../types/auth/login";
import type { RequestResetPassword, VerifyResetPasswordOtp, CreateNewPassword } from "../../types/auth/resetPassword";
import { handleApiError } from "../../utils/apiErrorHandler";
import { useAuthStore } from "../../store/authStore";

const isTurnstileValidationError = (error: any): boolean => {
  const detail = String(error?.response?.data?.detail || "").toLowerCase();
  return detail.includes("turnstile verification required");
};

export const loginAccount = async (
  data: LoginRequestData
): Promise<LoginResponseData> => {
  try {
    const response = await authApi.post<LoginResponseData>("/officials-login", data);

    const store = useAuthStore.getState();
    store.setAccessToken(response.access_token);
    store.mapDataFromBackend(response);

    const updatedStore = useAuthStore.getState();
    
    if (!updatedStore.isAuthenticated) {
      store.clearAuthLocal();
      throw new Error("Unauthorized: Invalid user role. Access denied.");
    }

    return response;
  } catch (error: any) {
    if (error.response?.status === 401) {
      throw new Error("Invalid email or password. Please try again.");
    }
    if (isTurnstileValidationError(error)) {
      throw new Error("Login failed. Please try again.");
    }
    if (error.message?.includes("Unauthorized")) {
      throw error;
    }
    console.error("Login error:", error);
    throw handleApiError(error);
  }
};

export const logoutBarangayAccount = async (): Promise<void> => {
  try {
    await authApi.post<void>("/logout", {});
  } catch (error: any) {
    console.warn("Logout API call failed (this is OK, clearing local auth):", error.message);
  }
};

export const requestResetPassword = async (
  data: RequestResetPassword
): Promise<{ message?: string }> => {
  try {
    return await usersApi.post("/request-reset-password", data);
  } catch (error: any) {
    throw handleApiError(error);
  }
};

export const verifyResetPasswordOtp = async (
  data: VerifyResetPasswordOtp
): Promise<{ message?: string }> => {
  try {
    return await usersApi.post("/verify-reset-password-otp", data);
  } catch (error: any) {
    throw handleApiError(error);
  }
};

export const createNewPassword = async (
  data: CreateNewPassword
): Promise<{ message?: string }> => {
  try {
    return await usersApi.post("/create-new-password", data);
  } catch (error: any) {
    throw handleApiError(error);
  }
};

export const loginSuperAdmin = async (
  data: LoginRequestData
): Promise<LoginResponseData> => {
  try {
    const response = await authApi.post<LoginResponseData>("/superadmin-login", data);

    const store = useAuthStore.getState();
    store.setAccessToken(response.access_token);
    store.mapDataFromBackend(response);

    const updatedStore = useAuthStore.getState();

    if (!updatedStore.isAuthenticated) {
      store.clearAuthLocal();
      throw new Error("Unauthorized: Invalid user role. Access denied.");
    }

    return response;
  } catch (error: any) {
    if (error.response?.status === 401) {
      throw new Error("Invalid email or password. Please try again.");
    }
    if (isTurnstileValidationError(error)) {
      throw new Error("Login failed. Please try again.");
    }
    if (error.message?.includes("Unauthorized")) {
      throw error;
    }
    console.error("Login error:", error);
    throw handleApiError(error);
  }
};