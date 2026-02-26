import { lguApi } from "../axios/apiServices";
import type { Incident } from "../../types/complaints/incident";

export const getAllForwardedIncidents = async (): Promise<Incident[]> => {
  return await lguApi.get('/forwarded-incidents');
};

export const getForwardedIncidents = async (barangayId: number): Promise<Incident[]> => {
  return await lguApi.get(`/forwarded-incidents/${barangayId}`);
};