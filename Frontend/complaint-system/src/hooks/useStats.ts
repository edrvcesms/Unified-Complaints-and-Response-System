import { useQuery } from "@tanstack/react-query";
import { getWeeklyForwardedIncidentsStats, getComplaintCountsByBarangayCategory } from "../services/lgu/stats";

type WeeklyStats = Awaited<ReturnType<typeof getWeeklyForwardedIncidentsStats>>;

type ComplaintCountsByBarangayCategory = Awaited<ReturnType<typeof getComplaintCountsByBarangayCategory>>;

export const useWeeklyForwardedIncidentsStats = () => {
  const { data, isLoading, error } = useQuery<WeeklyStats>({
    queryKey: ["weeklyForwardedIncidentsStats"],
    queryFn: getWeeklyForwardedIncidentsStats,
  });

  return {
    stats: data,
    isLoading,
    error,
  };
};

export const useComplaintCountsByBarangayCategory = () => {
  const { data, isLoading, error } = useQuery<ComplaintCountsByBarangayCategory>({
    queryKey: ["complaintCountsByBarangayCategory"],
    queryFn: getComplaintCountsByBarangayCategory,
  });

  return {
    stats: data,
    isLoading,
    error,
  };
};
