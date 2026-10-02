import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { getCategoryFeedbackRates } from "../services/categories/categoryFeedbackRates";
import type { CategoryFeedbackRates } from "../types/general/categoryFeedbackRates";

export function useCategoryFeedbackRates(): UseQueryResult<CategoryFeedbackRates, Error> {
  return useQuery<CategoryFeedbackRates, Error>({
    queryKey: ["category-feedback-rates"],
    queryFn: getCategoryFeedbackRates,
    staleTime: 1000 * 60 * 5,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    retry: 2,
  });
}
