
import { createApiClient } from "./apiClient";
import { createApiInstance } from "./axiosInstance";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const authInstance = createApiInstance(`${BASE_URL}/auth`, true);
export const usersInstance = createApiInstance(`${BASE_URL}/users`, true);
export const barangayInstance = createApiInstance(`${BASE_URL}/barangays`, true);
export const complaintsInstance = createApiInstance(`${BASE_URL}/complaints`, true);
export const incidentsInstance = createApiInstance(`${BASE_URL}/incidents`, true);
export const lguInstance = createApiInstance(`${BASE_URL}/lgu`, true);
export const notificationInstance = createApiInstance(`${BASE_URL}/notifications`, true);
export const departmentInstance = createApiInstance(`${BASE_URL}/departments`, true);
export const announcementInstance = createApiInstance(`${BASE_URL}/announcements`, true);
export const reportInstance = createApiInstance(`${BASE_URL}/reports`, true);
export const eventInstance = createApiInstance(`${BASE_URL}/events`, true);
export const superAdminInstance = createApiInstance(`${BASE_URL}/super-admin`, true);
export const knowledgeBaseInstance = createApiInstance(`${BASE_URL}/chatbot`, true);
export const appFeedbackInstance = createApiInstance(`${BASE_URL}/app-feedback`, true);
export const categoryInstance = createApiInstance(`${BASE_URL}/categories`, true);
export const authApi = createApiClient(authInstance);
export const usersApi = createApiClient(usersInstance);
export const barangayApi = createApiClient(barangayInstance);
export const complaintsApi = createApiClient(complaintsInstance);
export const incidentsApi = createApiClient(incidentsInstance);
export const lguApi = createApiClient(lguInstance);
export const notificationApi = createApiClient(notificationInstance);
export const departmentApi = createApiClient(departmentInstance);
export const announcementApi = createApiClient(announcementInstance);
export const reportApi = createApiClient(reportInstance);
export const eventApi = createApiClient(eventInstance);
export const superAdminApi = createApiClient(superAdminInstance);
export const knowledgeBaseApi = createApiClient(knowledgeBaseInstance);
export const appFeedbackApi = createApiClient(appFeedbackInstance);
export const categoryApi = createApiClient(categoryInstance);