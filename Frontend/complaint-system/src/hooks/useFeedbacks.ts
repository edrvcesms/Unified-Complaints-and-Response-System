import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getMyResolvedIncidentsFeedback } from "../services/feedback/feedback";
import type { PostIncidentFeedback } from "../types/general/feedback";
import type { PaginatedResponse, PaginationQueryParams } from "../types/general/pagination";

export const useFeedbacks = (params: PaginationQueryParams) => {
  const { data, isLoading, error } = useQuery<PaginatedResponse<PostIncidentFeedback>>({
    queryKey: ["postIncidentFeedbacks", "myResolvedIncidents", params.page, params.page_size, params.search],
    queryFn: () => getMyResolvedIncidentsFeedback(params),
    placeholderData: keepPreviousData,
  });

  return {
    feedbacks: data?.data ?? [],
    pagination: data?.pagination,
    isLoading,
    error,
  };
};
