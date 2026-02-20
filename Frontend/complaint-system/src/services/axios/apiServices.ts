import { createApiClient } from "./apiClient";
import { createApiInstance } from "./axiosInstance";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;
console.log("API Base URL:", BASE_URL);

export const authApi = createApiClient(createApiInstance(`${BASE_URL}/barangay-auth`, true));
export const barangayApi = createApiClient(createApiInstance(`${BASE_URL}/barangays`, true));
export const complaintsApi = createApiClient(createApiInstance(`${BASE_URL}/complaints`, true));