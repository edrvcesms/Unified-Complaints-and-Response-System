import { getMonthlyIncidentReport } from "../services/reports/monthlyReport";
import { useQuery } from "@tanstack/react-query";

export const useMonthlyIncidentReport = (
  barangayId: number,
  month?: number,
  year?: number,
  enabled: boolean = false
) => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["monthlyIncidentReport", barangayId, month, year],
    queryFn: () => getMonthlyIncidentReport(barangayId, month, year),
    enabled: enabled,
  });

  return {
    report: data,
    isLoading,
    error,
    refetch
  };
};
