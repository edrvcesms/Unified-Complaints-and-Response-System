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