import type{ LoginRequestData } from "../types/auth/login";
import type { ValidatorFn } from "../hooks/useSubmitForm";

export const validateEmail: ValidatorFn<LoginRequestData> = ({ email }) => {
  if (!email.trim()) return { email: "Email or username is required." };
  if (email.includes("@") && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { email: "Please enter a valid email address." };
  }
  return null;
};

export const validatePassword: ValidatorFn<LoginRequestData> = ({ password }) => {
  if (!password) return { password: "Password is required." };
  if (password.length < 6) return { password: "Password must be at least 6 characters." };
  return null;
};
