import { AxiosError } from "axios";

export interface ApiError {
  message: string;
  status?: number;
}

/**
 * Unified API error handler for web
 */
export const handleApiError = (error: unknown): ApiError => {
  // Common network error messages
  const networkErrors: Record<string, string> = {
    OFFLINE: "No internet connection. Please check your network.",
    TIMEOUT: "Request timed out. Please try again.",
    NETWORK_ERROR: "Network error. Please check your connection.",
    ECONNABORTED: "Connection aborted. Please try again.",
    ENOTFOUND: "Unable to connect. Please check your internet connection.",
    ECONNREFUSED: "Connection refused. Please try again later.",
    ERR_NETWORK: "Network error. Please check your connection.",
  };

  // HTTP status-based messages
  const statusMessages: Record<number, string> = {
    400: "Invalid request data.",
    401: "Invalid credentials. Please try again.",
    403: "You do not have permission to perform this action.",
    404: "Resource not found.",
    408: "Request timed out. Please try again.",
    422: "Validation error. Please check your input.",
    429: "Too many requests. Please wait a moment and try again.",
    500: "Something went wrong. Please try again later.",
    502: "Bad gateway. Please try again later.",
    503: "Service temporarily unavailable.",
    504: "Gateway timeout. Please try again.",
  };

  // Handle Axios errors
  if ((error as AxiosError)?.isAxiosError) {
    const axiosError = error as AxiosError;

    // No response => network error
    if (!axiosError.response) {
      const code = (axiosError.code || "").toUpperCase();

      // Specific network error messages
      if (code && networkErrors[code]) {
        return { message: networkErrors[code] };
      }

      // Timeout detection
      if (axiosError.message?.toLowerCase().includes("timeout")) {
        return { message: networkErrors.TIMEOUT };
      }

      // Generic network fallback
      return { message: networkErrors.NETWORK_ERROR };
    }

    // Has response => check status code
    const status = axiosError.response.status;
    const data = axiosError.response.data as any;

    // Extract custom backend message if available
    let customMessage: string | undefined;
    if (data?.message) customMessage = data.message;
    else if (data?.error) customMessage = typeof data.error === "string" ? data.error : data.error.message;
    else if (data?.errors && Array.isArray(data.errors)) customMessage = data.errors[0]?.message || data.errors[0];

    return {
      message: customMessage || statusMessages[status] || "Something went wrong.",
      status,
    };
  }

  // Generic network errors (non-Axios)
  const msg = (error as any)?.message?.toLowerCase() || "";
  const code = (error as any)?.code || "";

  if (
    msg.includes("network") ||
    msg.includes("connection") ||
    msg.includes("internet") ||
    networkErrors[code]
  ) {
    return {
      message: networkErrors[code] || networkErrors.NETWORK_ERROR,
    };
  }

  // Fallback for unknown errors
  return {
    message: (error as any)?.message || "An unexpected error occurred.",
  };
};