import { createApiClient } from "./ApiClient";
import { createApiInstance } from "./AxiosInstance";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const authApi = createApiClient(createApiInstance(`${BASE_URL}/auth`, true));
export const userApi = createApiClient(createApiInstance(`${BASE_URL}/users`, true));
export const brgyApi = createApiClient(createApiInstance(`${BASE_URL}/barangay`, true));