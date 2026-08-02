import { useQuery, useMutation, keepPreviousData } from "@tanstack/react-query";
import { getAllBarangays, getBarangayById, markBarangayIncidentsViewed } from "../services/barangay/barangays";
import type { BarangayAccountData } from "../types/barangay/barangayAccount";
import type { PaginatedResponse } from "../types/general/pagination";
import type { PaginationQueryParams } from "../types/general/pagination";
import { queryClient } from "../main";

export const useAllBarangays = (params: PaginationQueryParams) => {
  const { data, isLoading, error } = useQuery<PaginatedResponse<BarangayAccountData>>({
    queryKey: ["barangays", params.page, params.page_size, params.search],
    queryFn: () => getAllBarangays(params),
    placeholderData: keepPreviousData,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  return {
    barangays: data?.data ?? [],
    pagination: data?.pagination,
    isLoading,
    error,
  };
};

export const useBarangayById = (barangayId: number) => {
  const { data, isLoading, error } = useQuery<BarangayAccountData>({
    queryKey: ["barangays", barangayId],
    queryFn: () => getBarangayById(barangayId),
    enabled: !!barangayId,
  });

  return {
    barangay: data,
    isLoading,
    error,
  };
};

export const useMarkBarangayViewed = () => {
  return useMutation({
    mutationFn: (barangayId: number) => markBarangayIncidentsViewed(barangayId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["barangays"] });
    },
  });
};
