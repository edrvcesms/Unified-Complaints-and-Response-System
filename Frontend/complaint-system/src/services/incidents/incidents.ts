import { incidentsApi } from "../axios/apiServices";
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

export const resolveIncident = async (incidentId: number): Promise<void> => {
  try {
    await incidentsApi.patch(`/${incidentId}/resolve`);
  } catch (error) {
    console.error("Error resolving incident:", error);
    throw error;
  }
};

export const reviewIncident = async (incidentId: number): Promise<void> => {
  try {
    await incidentsApi.patch(`/${incidentId}/review`);
  } catch (error) {
    console.error("Error reviewing incident:", error);
    throw error;
  }
};