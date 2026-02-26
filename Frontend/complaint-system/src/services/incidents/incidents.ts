import { incidentsApi } from "../axios/apiServices";
import type { Incident } from "../../types/complaints/incident";
import type { Complaint } from "../../types/complaints/complaint";

export const getIncidents = async (): Promise<Incident[]> => {
  return await incidentsApi.get("/");
};

export const getIncidentById = async (incidentId: number): Promise<Incident> => {
  return await incidentsApi.get(`/${incidentId}`);
};

export const getComplaintsByIncidentId = async (incidentId: number): Promise<Complaint[]> => {
  return await incidentsApi.get(`/${incidentId}/complaints`);
};

export const resolveIncident = async (incidentId: number): Promise<void> => {
  return await incidentsApi.patch(`/${incidentId}/resolve`);
};

export const reviewIncident = async (incidentId: number): Promise<void> => {
  return await incidentsApi.patch(`/${incidentId}/review`);
};