import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getResolvedPostIncidentFeedbacks } from "../services/appFeedback/appFeedback";
import type { PostIncidentFeedback } from "../types/feedbacks/postIncidentFeedback";
import type { PaginatedResponse } from "../types/general/pagination";
import type { PaginationQueryParams } from "../types/general/pagination";

export const useResolvedPostIncidentFeedbacks = (params: PaginationQueryParams) => {
  const { data, isLoading, isFetching, error } = useQuery<PaginatedResponse<PostIncidentFeedback>>({
    queryKey: ["resolvedPostIncidentFeedbacks", params.page, params.page_size, params.search],
    queryFn: () => getResolvedPostIncidentFeedbacks(params),
    placeholderData: keepPreviousData,
  });

  return {
    feedbacks: data?.data ?? [],
    pagination: data?.pagination,
    isLoading,
    isFetching,
    error,
  };
};