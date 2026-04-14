import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import type { LoginFormErrors, LoginRequestData } from "../types/auth/login";
import { loginSuperAdmin } from "../services/authentication/auth";
import { validateEmail, validatePassword } from "../utils/validators";

export const useSuperAdminLoginForm = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState<LoginRequestData>({
    email: "",
    password: "",
    role: "superadmin",
  });
  const [errors, setErrors] = useState<LoginFormErrors>({});
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const { mutate, isPending } = useMutation({
    mutationFn: (data: LoginRequestData) => loginSuperAdmin(data),
    onSuccess: () => {
      console.log("Super admin login successful");
      navigate("/superadmin/dashboard");
    },
    onError: (error: any) => {
      console.error("Login error:", error);
      setErrors({
        general: error.message || "Login failed. Please try again.",
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

    try {
      const validationErrors: LoginFormErrors = {};
      const emailError = validateEmail(formData);
      const passwordError = validatePassword(formData);

      if (emailError) Object.assign(validationErrors, emailError);
      if (passwordError) Object.assign(validationErrors, passwordError);

      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return;
      }

      mutate(formData);
    } catch (error) {
      console.error("Validation error:", error);
      setErrors({
        general: "An error occurred. Please try again.",
      });
    }
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
