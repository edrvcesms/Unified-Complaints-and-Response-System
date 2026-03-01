import { incidentsApi } from "../axios/apiServices";
import type { Incident } from "../../types/complaints/incident";

export const getAssignedIncidents = async (): Promise<Incident[]> => {
  try {
    return await incidentsApi.get('/department');
  } catch (error) {
    console.error("Error fetching assigned incidents:", error);
    throw error;
  }
};