import { useQuery } from "@tanstack/react-query";
import { getWeeklyForwardedIncidentsStats } from "../services/lgu/stats";

interface DailyCounts {
  [date: string]: {
    forwarded: number;
    resolved: number;
  };
}

interface WeeklyStats {
  daily_counts: DailyCounts;
}

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
