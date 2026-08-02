import { appFeedbackApi } from "../axios/apiServices";
import type { PostIncidentFeedback } from "../../types/feedbacks/postIncidentFeedback";
import type { PaginatedResponse } from "../../types/general/pagination";
import type { PaginationQueryParams } from "../../types/general/pagination";
import { buildQueryString } from "../../utils/buildQuery";

export const getResolvedPostIncidentFeedbacks = async (params: PaginationQueryParams): Promise<PaginatedResponse<PostIncidentFeedback>> => {
  
  try {
    const queryString = buildQueryString(params || {});
    return await appFeedbackApi.get(`/post-incident/resolved?${queryString}`);
  } catch (error) {
    console.error("Error fetching resolved post-incident feedbacks:", error);
    throw error;
  }
};