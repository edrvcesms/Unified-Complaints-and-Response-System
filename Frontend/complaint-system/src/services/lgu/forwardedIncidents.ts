import { lguApi } from "../axios/apiServices";
import type { Incident } from "../../types/complaints/incident";

export const getAllForwardedIncidents = async (): Promise<Incident[]> => {
  try {
    return await lguApi.get('/forwarded-incidents');
  } catch (error) {
    console.error('Error fetching all forwarded incidents:', error);
    throw error;
  }
};

export const getForwardedIncidents = async (barangayId: number): Promise<Incident[]> => {
  try {
    return await lguApi.get(`/forwarded-incidents/${barangayId}`);
  } catch (error) {
    console.error(`Error fetching forwarded incidents for barangay ID ${barangayId}:`, error);
    throw error;
  };
};