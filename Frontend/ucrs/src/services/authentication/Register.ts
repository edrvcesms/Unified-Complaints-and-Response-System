import { authApi } from "../axios/ApiServices";
import type { RegisterUserData } from "../../types/auth/Register";

export const registerUser = async (registerData: RegisterUserData) => {
  try {
    const res = await authApi.post("/register", registerData);
    return res.data;
  } catch (error) {
    console.error("Registration failed:", error);
    throw error;
  }
};

