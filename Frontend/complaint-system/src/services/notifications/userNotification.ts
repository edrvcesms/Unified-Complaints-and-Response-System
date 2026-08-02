import { notificationApi } from "../axios/apiServices";
import type { Notification } from "../../types/notifications/notification";
import type { PaginatedResponse } from "../../types/general/pagination";
import type { PaginationQueryParams } from "../../types/general/pagination";
import { buildQueryString } from "../../utils/buildQuery";

export const getUserNotifications = async (params?: PaginationQueryParams): Promise<PaginatedResponse<Notification>> => {
  try {
    const queryString = buildQueryString(params || {});
    return await notificationApi.get(`/?${queryString}`);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    throw error;
  }
};

export const markNotificationAsRead = async (notificationId: number) => {
  try {
    await notificationApi.post(`/${notificationId}/read`);
} catch (error) {
    console.error(`Error marking notification ${notificationId} as read:`, error);
    throw error;
  }
};

export const markAllNotificationsAsRead = async () => {
  try {
    await notificationApi.post("/read-all");
} catch (error) {
    console.error("Error marking all notifications as read:", error);
    throw error;
  }
};