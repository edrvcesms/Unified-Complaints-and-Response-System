import { barangayApi } from "../axios/apiServices";
import type { BarangayAccountData } from "../../types/barangay/barangayAccount";
import type { PaginatedResponse } from "../../types/general/pagination";
import type { PaginationQueryParams } from "../../types/general/pagination";
import { buildQueryString } from "../../utils/buildQuery";

export interface BarangayMember {
  id: number;
  barangay_id: number;
  name: string;
  position: string;
}

export const getAllBarangays = async (params?: PaginationQueryParams): Promise<PaginatedResponse<BarangayAccountData>> => {
  try {
    const queryString = buildQueryString(params || {});
    return await barangayApi.get(`/all?${queryString}`);
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

export const getBarangayMembers = async (barangayId: number): Promise<BarangayMember[]> => {
  try {
    return await barangayApi.get(`/${barangayId}/members`);
  } catch (error) {
    console.error("Error fetching barangay members:", error);
    throw error;
  }
};

export const addBarangayMember = async (barangayId: number, payload: { name: string; position: string }) => {
  return await barangayApi.post(`/${barangayId}/add-member`, payload);
};

export const removeBarangayMember = async (barangayId: number, memberId: number) => {
  return await barangayApi.delete(`/${barangayId}/remove-member/${memberId}`);
};