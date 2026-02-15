import { authApi } from "../axios/ApiServices";
import type { UserLoginData } from "../../types/auth/Login";

export const loginUser = async (loginData: UserLoginData) => {
  try {
    const res = await authApi.post("/login", loginData, { withCredentials: true });
    return res.data;
  } catch (error) {
    console.error("Login failed:", error);
    throw error;
  }
};

export const logoutUser = async () => {
  try {
    await authApi.post("/logout", {}, { withCredentials: true });
  } catch (error) {
    console.error("Logout failed:", error);
    throw error;
  }
};