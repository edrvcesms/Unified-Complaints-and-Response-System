import { lguApi } from "../axios/apiServices";
import type { Incident } from "../../types/complaints/incident";
import type { PaginatedResponse } from "../../types/general/pagination";
import type { PaginationQueryParams } from "../../types/general/pagination";
import { buildQueryString } from "../../utils/buildQuery";

export const getAllForwardedIncidents = async (params?: PaginationQueryParams): Promise<PaginatedResponse<Incident>> => {
  try {
    const queryString = buildQueryString(params || {});
    return await lguApi.get(`/forwarded-incidents?${queryString}`);
  } catch (error) {
    console.error("Error fetching forwarded incidents:", error);
    throw error;
  };
};

export const getForwardedIncidents = async (barangayId: number, params?: PaginationQueryParams): Promise<PaginatedResponse<Incident>> => {
  try {
    const queryString = buildQueryString(params || {});
    return await lguApi.get(`/forwarded-incidents/${barangayId}?${queryString}`);
  } catch (error) {
    console.error(`Error fetching forwarded incidents for barangay ${barangayId}:`, error);
    throw error;
  };
};