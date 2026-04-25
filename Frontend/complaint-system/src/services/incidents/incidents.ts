import { incidentsApi } from "../axios/apiServices";
import { buildIncidentActionFormData } from "./incidentActionFormData";
import type { Incident } from "../../types/complaints/incident";
import type { Complaint } from "../../types/complaints/complaint";

export const getIncidents = async (): Promise<Incident[]> => {
  try {
    return await incidentsApi.get("/");
  } catch (error) {
    console.error("Error fetching incidents:", error);
    throw error;
  };
};

export const getAllIncidents = async (): Promise<Incident[]> => {
  try {
    return await incidentsApi.get("/archive/");
  } catch (error) {
    console.error("Error fetching all incidents:", error);
    throw error;
  };
};

export const getIncidentById = async (incidentId: number): Promise<Incident> => {
  try {
    return await incidentsApi.get(`/${incidentId}`);
  } catch (error) {
    console.error("Error fetching incident by ID:", error);
    throw error;
  };
};

export const getComplaintsByIncidentId = async (incidentId: number): Promise<Complaint[]> => {
  try {
    return await incidentsApi.get(`/${incidentId}/complaints`);
  } catch (error) {
    console.error("Error fetching complaints for incident:", error);
    throw error;
  }
};

export const resolveIncident = async (
  incidentId: number,
  payload: { actions_taken: string; attachments?: File[] }
): Promise<void> => {
  try {
    const formData = buildIncidentActionFormData(payload.actions_taken, payload.attachments);
    await incidentsApi.patch(`/${incidentId}/resolve`, formData);
  } catch (error) {
    console.error("Error resolving incident:", error);
    throw error;
  }
};

export const reviewIncident = async (
  incidentId: number,
  payload: { actions_taken: string; attachments?: File[] },
  signal?: AbortSignal
): Promise<void> => {
  try {
    const formData = buildIncidentActionFormData(payload.actions_taken, payload.attachments);
    await incidentsApi.patch(`/${incidentId}/review`, formData, { signal });
  } catch (error) {
    console.error("Error reviewing incident:", error);
    throw error;
  }
};

export const rejectIncident = async (
  incidentId: number,
  payload: { actions_taken: string; attachments?: File[] }
): Promise<void> => {
  try {
    const formData = buildIncidentActionFormData(payload.actions_taken, payload.attachments);
    await incidentsApi.patch(`/${incidentId}/reject`, formData);
  } catch (error) {
    console.error("Error rejecting incident:", error);
    throw error;
  }
};

export const markIncidentAsViewed = async (incidentId: number): Promise<void> => {
  try {
    await incidentsApi.post(`/${incidentId}/mark-viewed`);
  } catch (error) {
    console.error("Error marking incident as viewed:", error);
    throw error;
  }
};

export const notifyHearing = async (incidentId: number, hearingDate: FormData): Promise<void> => {
  try {
    await incidentsApi.post(`/notify-hearing/${incidentId}`, hearingDate);
  } catch (error) {
    console.error("Error notifying hearing for incident:", error);
    throw error;
  }
};