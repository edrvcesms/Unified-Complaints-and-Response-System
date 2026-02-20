import { AxiosError } from "axios";

export const handleAxiosError = (error: unknown): string => {
  if ((error as AxiosError)?.isAxiosError) {
    const axiosError = error as AxiosError;

    if (!axiosError.response) {
      return "No internet connection. Please try again.";
    }

    const status = axiosError.response.status;

    if (status >= 500) {
      return "Server error occurred. Please try again later.";
    }

    if (status >= 400 && status < 500) {
  const data = axiosError.response.data;

  if (data && typeof data === "object" && "message" in data) {
    return (data as { message: string }).message;
  }

  return "Invalid request.";
}
  }

  return (error as Error)?.message || "Something went wrong.";
};