import { useQuery } from "@tanstack/react-query";
import { getAllBarangays, getBarangayById } from "../services/barangay/barangays";
import type { BarangayAccountData } from "../types/barangay/barangayAccount";

/**
 * Hook to fetch all barangays
 */
export const useAllBarangays = () => {
  const { data, isLoading, error } = useQuery<BarangayAccountData[]>({
    queryKey: ["barangays"],
    queryFn: getAllBarangays,
  });

  return {
    barangays: data,
    isLoading,
    error,
  };
};

/**
 * Hook to fetch a specific barangay by ID
 */
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
