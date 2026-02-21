import { complaintsApi } from "../axios/apiServices";
import type { Complaint } from "../../types/complaints/complaint";

export const getComplaints = async (): Promise<Complaint[]> => {
  try {
    const response = await complaintsApi.get("/all");
    console.log("Fetched complaints:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error fetching complaints:", error);
    throw error;
  }
};

export const getComplaintById = async (complaintId: number): Promise<Complaint> => {
  try {
    const response = await complaintsApi.get(`/${complaintId}`);
    console.log(`Fetched complaint with ID ${complaintId}:`, response.data);
    return response.data;
  } catch (error) {
    console.error(`Error fetching complaint with ID ${complaintId}:`, error);
    throw error;
  }
};

export const getWeeklyComplaintStats = async () => {
  try {
    const response = await complaintsApi.get("/stats/weekly");
    console.log("Fetched weekly complaint stats:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error fetching weekly complaint stats:", error);
    throw error;
  }
};