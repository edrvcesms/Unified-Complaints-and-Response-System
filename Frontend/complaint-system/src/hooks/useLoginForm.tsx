import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSubmitForm } from "./useSubmitForm";
import type { LoginFormErrors, LoginRequestData } from "../types/auth/login";
import { authInstance } from "../services/axios/apiServices";
import { useBarangayStore } from "../store/authStore";
import { validateEmail, validatePassword } from "../utils/validators";

export const useLoginForm = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState<LoginRequestData>({ email: "", password: "", role: "official" });
  const [errors, setErrors] = useState<LoginFormErrors>({});
  const [showPassword, setShowPassword] = useState<boolean>(false);


  const { mutate, isPending } = useSubmitForm<LoginRequestData>({
    endpoint: "/officials-login",
    method: "post",
    axiosInstance: authInstance,
    validators: [validateEmail, validatePassword],

    onSuccess: (data) => {
      console.log("Login successful:", data);
      useBarangayStore.getState().setAccessToken(data.access_token);
      useBarangayStore.getState().mapDataFromBackend(data);
      console.log("Updated store with account data:", useBarangayStore.getState().barangayAccountData);
      navigate("/dashboard");
    },

    onError: ({ general, errors: fieldErrors }) => {
      console.error("Login error:", general, fieldErrors);
      setErrors({
        general,
        ...fieldErrors,
      });
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof LoginFormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
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