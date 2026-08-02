import { complaintsApi } from "../axios/apiServices";
import type { Complaint, WeeklyComplaintStats } from "../../types/complaints/complaint";
import type { PaginatedResponse } from "../../types/general/pagination";
import type { PaginationQueryParams } from "../../types/general/pagination";
import { buildQueryString } from "../../utils/buildQuery";

export const getComplaints = async (params?: PaginationQueryParams): Promise<PaginatedResponse<Complaint>> => {
  try {
    const queryString = buildQueryString(params || {});
    return await complaintsApi.get(`/all?${queryString}`);
  } catch (error) {
    console.error("Error fetching complaints:", error);
    throw error;
  };
};

export const getComplaintById = async (complaintId: number): Promise<Complaint> => {
  try {
    return await complaintsApi.get(`/${complaintId}`);
  } catch (error) {
    console.error("Error fetching complaint by ID:", error);
    throw error;
  };
};

export const getWeeklyComplaintStats = async (): Promise<WeeklyComplaintStats> => {
  try {
    return await complaintsApi.get("/weekly");
  } catch (error) {
    console.error("Error fetching weekly complaint stats:", error);
    throw error;
  };
};