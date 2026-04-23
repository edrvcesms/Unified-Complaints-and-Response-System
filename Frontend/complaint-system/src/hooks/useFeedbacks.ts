import { useQuery } from "@tanstack/react-query";
import { getMyResolvedIncidentsFeedback } from "../services/feedback/feedback";
import type { PostIncidentFeedback } from "../types/general/feedback";

export const useFeedbacks = () => {
  const { data, isLoading, error } = useQuery<PostIncidentFeedback[]>({
    queryKey: ["postIncidentFeedbacks", "myResolvedIncidents"],
    queryFn: getMyResolvedIncidentsFeedback,
  });

  return {
    feedbacks: data,
    isLoading,
    error,
  };
};
