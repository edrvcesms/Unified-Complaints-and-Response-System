import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { getCategoryFeedbackRates } from "../services/categories/categoryFeedbackRates";
import type { CategoryFeedbackRates } from "../types/general/categoryFeedbackRates";
import { useAuthStore } from "../store/authStore";

export function useCategoryFeedbackRates(): UseQueryResult<CategoryFeedbackRates, Error> {
  const userRole = useAuthStore((state) => state.userRole);
  const barangayId = useAuthStore((state) => state.barangayAccountData?.barangay_account.barangay_id);

  return useQuery<CategoryFeedbackRates, Error>({
    queryKey: ["category-feedback-rates", userRole, barangayId],
    queryFn: getCategoryFeedbackRates,
    staleTime: 1000 * 60 * 5,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    retry: 2,
  });
}
