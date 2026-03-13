import { eventApi } from "../axios/apiServices";
import type { Event } from "../../types/general/event";

export const getEvents = async (): Promise<Event[]> => {
  try {
    return await eventApi.get("/");
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
