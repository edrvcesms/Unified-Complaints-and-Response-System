import { complaintsApi } from "../axios/apiServices";
import type { Complaint } from "../../types/complaints/complaint";

export const getComplaints = async (): Promise<Complaint[]> => {
  try {
    return await complaintsApi.get("/all");
  } catch (error) {
    console.error("Error fetching complaints:", error);
    throw error;
  }
};

export const getComplaintById = async (complaintId: number): Promise<Complaint> => {
  try {
    return await complaintsApi.get(`/${complaintId}`);
  } catch (error) {
    console.error(`Error fetching complaint with ID ${complaintId}:`, error);
    throw error;
  }
};

export const getWeeklyComplaintStats = async () => {
  try {
    return await complaintsApi.get("/stats/weekly");
  } catch (error) {
    console.error("Error fetching weekly complaint stats:", error);
    throw error;
  }
};