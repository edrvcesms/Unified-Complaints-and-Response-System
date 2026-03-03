import type { Incident } from "../../types/complaints/incident";
import { departmentApi } from "../axios/apiServices";

export const getAssignedIncidents = async (): Promise<Incident[]> => {
  try {
    return await departmentApi.get('/forwarded-incidents');
  } catch (error) {
    console.error("Error fetching assigned incidents:", error);
    throw error;
  }
};

export const getAssignedIncidentsPerBarangay = async (barangayId: number): Promise<Incident[]> => {
  try {
    return await departmentApi.get(`/forwarded-incidents/barangay/${barangayId}`);
  } catch (error) {
    console.error(`Error fetching assigned incidents for barangay ID ${barangayId}:`, error);
    throw error;
  }
};

export const weeklyDepartmentStats = async () => {
  try {
    return await departmentApi.get('/weekly-stats');
  }
  catch (error) {
    console.error("Error fetching weekly department stats:", error);
    throw error;
  }
};