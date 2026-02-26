import { barangayApi } from "../axios/apiServices";
import type { BarangayAccountData } from "../../types/barangay/barangayAccount";

export const getAllBarangays = async (): Promise<BarangayAccountData[]> => {
  try {
    return await barangayApi.get("/all");
  } catch (error) {
    console.error("Error fetching all barangays:", error);
    throw error;
  }
};

export const getBarangayById = async (barangayId: number): Promise<BarangayAccountData> => {
  try {
    return await barangayApi.get(`/${barangayId}`);
  } catch (error) {
    console.error(`Error fetching barangay with ID ${barangayId}:`, error);
    throw error;
  };
};