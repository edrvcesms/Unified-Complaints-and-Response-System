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

export const getSubmittedComplaints = async (): Promise<Complaint[]> => {
  try {
    const response = await complaintsApi.get("/submitted");
    console.log("Fetched submitted complaints:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error fetching submitted complaints:", error);
    throw error;
  }
};

export const getUnderReviewComplaints = async (): Promise<Complaint[]> => {
  try {
    const response = await complaintsApi.get("/under-review");
    console.log("Fetched under review complaints:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error fetching under review complaints:", error);
    throw error;
  }
};

export const getResolvedComplaints = async (): Promise<Complaint[]> => {
  try {
    const response = await complaintsApi.get("/resolved");
    console.log("Fetched resolved complaints:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error fetching resolved complaints:", error);
    throw error;
  }
};