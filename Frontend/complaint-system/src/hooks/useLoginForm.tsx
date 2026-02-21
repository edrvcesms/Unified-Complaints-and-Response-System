import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSubmitForm } from "./useSubmitForm";
import type { LoginFormErrors, LoginRequestData } from "../types/auth/login";
import type { ValidatorFn } from "./useSubmitForm";
import { authInstance } from "../services/axios/apiServices";
import { useBarangayStore } from "../store/authStore";

// ─── Validators ───────────────────────────────────────────────────────────────
// Pure functions — each returns a partial errors object or null if valid.
// useSubmitForm runs all validators and merges results before submitting.

const validateEmail: ValidatorFn<LoginRequestData> = ({ email }) => {
  if (!email.trim()) return { email: "Email or username is required." };
  if (email.includes("@") && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { email: "Please enter a valid email address." };
  }
  return null;
};

const validatePassword: ValidatorFn<LoginRequestData> = ({ password }) => {
  if (!password) return { password: "Password is required." };
  if (password.length < 6) return { password: "Password must be at least 6 characters." };
  return null;
};

// ─── useLoginForm Hook ────────────────────────────────────────────────────────
// Handles UI state (field values, visibility, remember me) and delegates
// all API + validation logic to useSubmitForm.

export const useLoginForm = () => {
  const navigate = useNavigate();

  // UI-only state — not part of the submitted payload
  const [formData, setFormData] = useState<LoginRequestData>({ email: "", password: "" });
  const [errors, setErrors] = useState<LoginFormErrors>({});
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // ── useSubmitForm ───────────────────────────────────────────────────────────
  // Wires validation, network check, and Axios request into a single mutation.

  const { mutate, isPending } = useSubmitForm<LoginRequestData>({
    endpoint: "/login",   // adjust to your actual endpoint
    method: "post",
    axiosInstance: authInstance,
    validators: [validateEmail, validatePassword],

    onSuccess: (data) => {
      useBarangayStore.getState().setBarangayAccessToken(data.barangayAccessToken);
      navigate("/dashboard");
    },

    onError: ({ general, errors: fieldErrors }) => {
      console.error("Login error:", general, fieldErrors);
      setErrors({
        general,
        ...fieldErrors, // spreads field-level errors (e.g. email, password) if returned by API
      });
    },
  });

  // ── Handlers ────────────────────────────────────────────────────────────────

  /** Update a field and clear its inline error as the user types */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof LoginFormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({}); // Clear previous errors on new submit
    mutate(formData);

  };

  const handleForgotPassword = () => navigate("/forgot-password");

  const togglePasswordVisibility = () => setShowPassword((prev) => !prev);

  return {
    formData,
    errors,
    showPassword,
    isLoading: isPending,
    handleChange,
    handleSubmit,
    handleForgotPassword,
    togglePasswordVisibility,
  };
};