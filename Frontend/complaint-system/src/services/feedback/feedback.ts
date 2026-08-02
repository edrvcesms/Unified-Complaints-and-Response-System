import { appFeedbackApi } from "../axios/apiServices";
import type { PostIncidentFeedback } from "../../types/general/feedback";
import type { PaginatedResponse } from "../../types/general/pagination";
import type { PaginationQueryParams } from "../../types/general/pagination";
import { buildQueryString } from "../../utils/buildQuery";

export const getMyResolvedIncidentsFeedback = async (params?: PaginationQueryParams): Promise<PaginatedResponse<PostIncidentFeedback>> => {
  try {
    const queryString = buildQueryString(params || {});
    return await appFeedbackApi.get(`/my-resolved-incidents?${queryString}`);
  } catch (error) {
    console.error("Error fetching post-incident feedbacks:", error);
    throw error;
  }
};
