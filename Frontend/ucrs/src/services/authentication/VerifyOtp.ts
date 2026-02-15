import { authApi } from "../axios/ApiServices";
import type { OtpVerificationData } from "../../types/auth/otpVerify";

export const verifyOtpAndRegister = async (data: OtpVerificationData, frontId?: File, backId?: File, selfieWithId?: File) => {
  try {
    const formData = new FormData();
    formData.append("data", JSON.stringify(data));
    if (frontId) formData.append("front_id", frontId);
    if (backId) formData.append("back_id", backId);
    if (selfieWithId) formData.append("selfie_with_id", selfieWithId);
    const res = await authApi.post("/verify-otp", formData, { withCredentials: true });
    return res.data;
  } catch (error) {
    console.error("OTP verification and registration failed:", error);
    throw error;
  }
};

