import { eventApi } from "../axios/apiServices";
import type { Event } from "../../types/general/event";
import type { PaginatedResponse } from "../../types/general/pagination";
import type { PaginationQueryParams } from "../../types/general/pagination";
import { buildQueryString } from "../../utils/buildQuery";

export const getEvents = async (params?: PaginationQueryParams): Promise<PaginatedResponse<Event>> => {
  try {
    const queryString = buildQueryString(params || {});
    return await eventApi.get(`/my-events?${queryString}`);
  }
  catch (error) {
    console.error("Error fetching events:", error);
    throw error;
  }
};

export const getEventById = async (eventId: number): Promise<Event> => {
  try {
    return await eventApi.get(`/${eventId}`);
  }
  catch (error) {
    console.error(`Error fetching event with ID ${eventId}:`, error);
    throw error;
  }
};

export const createEvent = async (eventData: FormData): Promise<{message: string, event_id: number}> => {
  try {
    return await eventApi.post("/create", eventData, { headers: { "Content-Type": "multipart/form-data" } });
  } catch (error) {
    console.error("Error creating event:", error);
    throw error;
  }
};

export const updateEvent = async (eventId: number, eventData: FormData): Promise<{message: string, event_id: number}> => {
  try {
    return await eventApi.put(`/update/${eventId}`, eventData, { headers: { "Content-Type": "multipart/form-data" } });
  } catch (error) {
    console.error(`Error updating event with ID ${eventId}:`, error);
    throw error;
  }
};

export const deleteEvent = async (eventId: number): Promise<{message: string, event_id: number}> => {
  try {
    return await eventApi.delete(`/delete/${eventId}`);
  } catch (error) {
    console.error(`Error deleting event with ID ${eventId}:`, error);
    throw error;
  }
};
