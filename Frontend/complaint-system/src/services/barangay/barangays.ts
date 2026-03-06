import { barangayApi } from "../axios/apiServices";
import type { BarangayAccountData } from "../../types/barangay/barangayAccount";

export const getAllBarangays = async (): Promise<BarangayAccountData[]> => {
  try {
    return await barangayApi.get("/all");
  } catch (error) {
    console.error("Error fetching barangays:", error);
    throw error;
  }
};

export const getBarangayById = async (barangayId: number): Promise<BarangayAccountData> => {
  try {
    return await barangayApi.get(`/${barangayId}`);
  } catch (error) {
    console.error("Error fetching barangay by ID:", error);
    throw error;
  }
};

export const markBarangayIncidentsViewed = async (barangayId: number): Promise<{message: string; viewed_at: string}> => {
  try {
    return await barangayApi.post(`/${barangayId}/mark-viewed`);
  } catch (error) {
    console.error("Error marking barangay incidents as viewed:", error);
    throw error;
  }
};