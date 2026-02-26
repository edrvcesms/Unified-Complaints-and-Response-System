import { barangayApi } from "../axios/apiServices";
import type { BarangayAccountData } from "../../types/barangay/barangayAccount";

export const getAllBarangays = async (): Promise<BarangayAccountData[]> => {
  return await barangayApi.get("/all");
};

export const getBarangayById = async (barangayId: number): Promise<BarangayAccountData> => {
  return await barangayApi.get(`/${barangayId}`);
};