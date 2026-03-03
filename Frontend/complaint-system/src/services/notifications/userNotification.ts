import { notificationApi } from "../axios/apiServices";
import type { Notification } from "../../types/notifications/notification";

export const getUserNotifications = async (): Promise<Notification[]> => {
  try {
    return await notificationApi.get("/")
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