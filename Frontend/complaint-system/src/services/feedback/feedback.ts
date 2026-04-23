import { appFeedbackApi } from "../axios/apiServices";
import type { PostIncidentFeedback } from "../../types/general/feedback";

export const getMyResolvedIncidentsFeedback = async (): Promise<PostIncidentFeedback[]> => {
  try {
    return await appFeedbackApi.get<PostIncidentFeedback[]>("/my-resolved-incidents");
  } catch (error) {
    console.error("Error fetching post-incident feedbacks:", error);
    throw error;
  }
};
