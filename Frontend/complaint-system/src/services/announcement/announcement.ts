import { announcementApi, announcementInstance } from "../axios/apiServices";
import type { Announcement } from "../../types/general/announcement";

export const getAnnouncements = async (): Promise<Announcement[]> => {
    try {
      return await announcementApi.get("/");
    } catch (error) {
      console.error("Error fetching announcements:", error);
      throw error;
    }
};

export const getAnnouncementById = async (announcementId: number): Promise<Announcement> => {
    try {
      return await announcementApi.get(`/${announcementId}`);
    } catch (error) {
      console.error(`Error fetching announcement with id ${announcementId}:`, error);
      throw error;
    }
};

export const createAnnouncement = async (formData: FormData): Promise<{ message: string; announcement_id: number }> => {
    try {
      const response = await announcementInstance.post("/create", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response.data;
    } catch (error) {
      console.error("Error creating announcement:", error);
      throw error;
    }
};

export const getMyAnnouncements = async (): Promise<Announcement[]> => {
    try {
      return await announcementApi.get("/my-announcements");
    } catch (error) {
      console.error("Error fetching my announcements:", error);
      throw error;
    }
};

export const updateAnnouncement = async (announcementId: number, formData: FormData): Promise<Announcement> => {
    try {
      const response = await announcementInstance.put(`/${announcementId}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response.data;
    } catch (error) {
      console.error(`Error updating announcement with id ${announcementId}:`, error);
      throw error;
    }
};

export const deleteAnnouncement = async (announcementId: number): Promise<void> => {
    try {
      await announcementApi.delete(`/${announcementId}`);
    } catch (error) {
      console.error(`Error deleting announcement with id ${announcementId}:`, error);
      throw error;
    }
};
