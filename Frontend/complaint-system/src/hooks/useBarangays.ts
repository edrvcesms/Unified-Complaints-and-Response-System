import { useQuery, useMutation } from "@tanstack/react-query";
import { getAllBarangays, getBarangayById, markBarangayIncidentsViewed } from "../services/barangay/barangays";
import type { BarangayAccountData } from "../types/barangay/barangayAccount";
import { queryClient } from "../main";

export const useAllBarangays = () => {
  const { data, isLoading, error } = useQuery<BarangayAccountData[]>({
    queryKey: ["barangays"],
    queryFn: getAllBarangays,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  return {
    barangays: data,
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
