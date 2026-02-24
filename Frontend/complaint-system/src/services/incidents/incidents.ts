import { incidentsApi } from "../axios/apiServices";
import type { Incident } from "../../types/complaints/incident";

export const getIncidents = async (barangayId: number): Promise<Incident[]> => {
  const response = await incidentsApi.get(`/incidents/${barangayId}`);
  return response.data;
};