import { incidentsApi } from "../axios/apiServices";
import type { Incident } from "../../types/complaints/incident";
import type { Complaint } from "../../types/complaints/complaint";

export const getIncidents = async (): Promise<Incident[]> => {
  const response = await incidentsApi.get(`/`);
  return response.data;
};

export const getIncidentById = async (incidentId: number): Promise<Incident> => {
  try {
    const response = await incidentsApi.get(`/${incidentId}`);
    console.log(`Fetched incident with ID ${incidentId}:`, response.data);
    return response.data;
  } catch (error) {
    console.error(`Error fetching incident with ID ${incidentId}:`, error);
    throw error;
  }
};

export const getComplaintsByIncidentId = async (incidentId: number): Promise<Complaint[]> => {
  try {
    const response = await incidentsApi.get(`/${incidentId}/complaints`);
    console.log(`Fetched complaints for incident ${incidentId}:`, response.data);
    return response.data;
  } catch (error) {
    console.error(`Error fetching complaints for incident ${incidentId}:`, error);
    throw error;
  }
};

export const resolveIncident = async (incidentId: number): Promise<void> => {
  try {
    const response = await incidentsApi.patch(`/${incidentId}/resolve`);
    console.log(`Resolved incident with ID ${incidentId}:`, response.data);
    return response.data;
  } catch (error) {
    console.error(`Error resolving incident with ID ${incidentId}:`, error);
    throw error;
  }
};

export const reviewIncident = async (incidentId: number): Promise<void> => {
  try {
    const response = await incidentsApi.patch(`/${incidentId}/review`);
    console.log(`Marked incident with ID ${incidentId} for review:`, response.data);
    return response.data;
  } catch (error) {
    console.error(`Error marking incident with ID ${incidentId} for review:`, error);
    throw error;
  }
};