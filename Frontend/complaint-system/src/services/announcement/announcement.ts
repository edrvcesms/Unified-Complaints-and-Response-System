import { announcementApi, announcementInstance } from "../axios/apiServices";
import type { Announcement } from "../../types/general/announcement";
import type { PaginatedResponse, PaginationQueryParams } from "../../types/general/pagination";
import {buildQueryString} from "../../utils/buildQuery";


export const getAnnouncements = async (params?: PaginationQueryParams): Promise<PaginatedResponse<Announcement>> => {
    try {
      const queryString = buildQueryString(params || {});
      return await announcementApi.get(`/?${queryString}`);
    } catch (error) {
      console.error("Error fetching announcements:", error);
      throw error;
    }
};

export const getAnnouncementById = async (announcementId: number, params?: PaginationQueryParams): Promise<Announcement> => {
    try {
      const queryString = buildQueryString(params || {});
      return await announcementApi.get(`/my-announcements/?${queryString}`);
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

export const getMyAnnouncements = async (params?: PaginationQueryParams): Promise<PaginatedResponse<Announcement>> => {
    try {
      const queryString = buildQueryString(params || {});
      console.log(params, queryString, "params and queryString in getMyAnnouncements");
      return await announcementApi.get(`/my-announcements?${queryString}`);
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
