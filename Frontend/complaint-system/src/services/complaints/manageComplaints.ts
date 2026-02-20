import { complaintsApi } from "../axios/apiServices";

export const reviewComplaint = async (complaintId: number) => {
  try {
    const response = await complaintsApi.post(`/review/${complaintId}`);
    console.log(`Complaint with ID ${complaintId} marked as under review:`, response.data);
    return response.data;
  } catch (error) {
    console.error(`Error marking complaint with ID ${complaintId} as under review:`, error);
    throw error;
  }
};

export const resolveComplaint = async (complaintId: number) => {
  try {
    const response = await complaintsApi.post(`/resolve/${complaintId}`);
    console.log(`Complaint with ID ${complaintId} marked as resolved:`, response.data);
    return response.data;
  } catch (error) {
    console.error(`Error marking complaint with ID ${complaintId} as resolved:`, error);
    throw error;
  }
};