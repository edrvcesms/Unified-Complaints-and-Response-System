import { useMutation } from "@tanstack/react-query";
import { useNetwork } from "../context/NetworkContext";
import type { AxiosInstance } from "axios";
import { handleApiError } from "../utils/apiErrorHandler";

export type ValidatorFn<T> = (data: T) => Record<string, string> | null;

interface UseSubmitFormProps<T> {
  endpoint: string;
  method?: "post" | "put" | "patch" | "delete";
  axiosInstance: AxiosInstance;
  validators?: ValidatorFn<T>[];
  onSuccess?: (data: any) => void;
  onError?: (error: { general: string; errors?: Record<string, string> }) => void;
}

export const useSubmitForm = <T = any>({
  endpoint,
  method = "post",
  axiosInstance,
  validators = [],
  onSuccess,
  onError,
}: UseSubmitFormProps<T>) => {
  const { isOnline } = useNetwork();

  return useMutation({
    mutationFn: async (formData: T) => {
      // Run client-side validators
      const errors: Record<string, string> = {};
      for (const validator of validators) {
        const result = validator(formData);
        if (result) Object.assign(errors, result);
      }
      if (Object.keys(errors).length > 0) {
        throw { type: "validation", errors };
      }

      // Network check
      if (!isOnline) {
        throw { type: "network", message: "You are offline. Please check your connection." };
      }

      // Perform API request
      let response;
      switch (method) {
        case "post":
          response = await axiosInstance.post(endpoint, formData);
          break;
        case "put":
          response = await axiosInstance.put(endpoint, formData);
          break;
        case "patch":
          response = await axiosInstance.patch(endpoint, formData);
          break;
        case "delete":
          response = await axiosInstance.delete(endpoint, { data: formData });
          break;
        default:
          throw new Error(`Unsupported method: ${method}`);
      }

      return response.data;
    },

    onSuccess: (data) => {
      onSuccess?.(data);
    },

    onError: (error: any) => {
      // Handle client-side validation errors
      if (error?.type === "validation") {
        onError?.({ general: "Validation failed", errors: error.errors });
        return;
      }

      // Handle network errors thrown manually
      if (error?.type === "network") {
        onError?.({ general: error.message });
        return;
      }

      // Handle API/Server errors
      const apiError = handleApiError(error);
      onError?.({ general: apiError.message });
    },
  });
};