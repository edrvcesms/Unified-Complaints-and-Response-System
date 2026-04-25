import { useQuery } from "@tanstack/react-query";
import { getResolvedPostIncidentFeedbacks } from "../services/appFeedback/appFeedback";
import type { PostIncidentFeedback } from "../types/feedbacks/postIncidentFeedback";

export const useResolvedPostIncidentFeedbacks = () => {
  const { data, isLoading, error } = useQuery<PostIncidentFeedback[]>({
    queryKey: ["resolvedPostIncidentFeedbacks"],
    queryFn: getResolvedPostIncidentFeedbacks,
  });

  return {
    feedbacks: data,
    isLoading,
    error,
  };
};