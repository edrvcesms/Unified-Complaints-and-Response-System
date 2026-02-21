import { createApiClient } from "./apiClient";
import { createApiInstance } from "./axiosInstance";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const authInstance     = createApiInstance(`${BASE_URL}/barangay-auth`, true);
export const barangayInstance = createApiInstance(`${BASE_URL}/barangays`, true);
export const complaintsInstance = createApiInstance(`${BASE_URL}/complaints`, true);
export const authApi = createApiClient(authInstance);
export const barangayApi = createApiClient(barangayInstance);
export const complaintsApi = createApiClient(complaintsInstance);