import { complaintsApi } from "../axios/apiServices";
import type { Complaint, WeeklyComplaintStats } from "../../types/complaints/complaint";

export const getComplaints = async (): Promise<Complaint[]> => {
  return await complaintsApi.get("/all");
};

export const getComplaintById = async (complaintId: number): Promise<Complaint> => {
  return await complaintsApi.get(`/${complaintId}`);
};

export const getWeeklyComplaintStats = async (): Promise<WeeklyComplaintStats> => {
  return await complaintsApi.get("/stats/weekly");
};