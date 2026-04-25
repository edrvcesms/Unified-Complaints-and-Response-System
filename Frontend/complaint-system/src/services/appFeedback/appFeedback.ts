import { appFeedbackApi } from "../axios/apiServices";
import type { PostIncidentFeedback } from "../../types/feedbacks/postIncidentFeedback";

export const getResolvedPostIncidentFeedbacks = async (): Promise<PostIncidentFeedback[]> => {
  try {
    return await appFeedbackApi.get("/post-incident/resolved");
  } catch (error) {
    console.error("Error fetching resolved post-incident feedbacks:", error);
    throw error;
  }
};