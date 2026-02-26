import { useQuery } from "@tanstack/react-query";
import { getAllBarangays, getBarangayById } from "../services/barangay/barangays";
import type { BarangayAccountData } from "../types/barangay/barangayAccount";

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
