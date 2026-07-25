import { useQuery } from "@tanstack/react-query";
import {
  getWeeklyForwardedIncidentsStats,
  getMonthlyForwardedIncidentsStats,
  getYearlyForwardedIncidentsStats,
  getComplaintCountsByBarangayCategory,
} from "../services/lgu/stats";

type WeeklyStats = Awaited<ReturnType<typeof getWeeklyForwardedIncidentsStats>>;
type MonthlyStats = Awaited<ReturnType<typeof getMonthlyForwardedIncidentsStats>>;
type YearlyStats = Awaited<ReturnType<typeof getYearlyForwardedIncidentsStats>>;

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

export const useMonthlyForwardedIncidentsStats = (year: number, month: number) => {
  const { data, isLoading, error, isFetching } = useQuery<MonthlyStats>({
    queryKey: ["monthlyForwardedIncidentsStats", year, month],
    queryFn: () => getMonthlyForwardedIncidentsStats(year, month),
  });

  return {
    stats: data,
    isLoading,
    isFetching,
    error,
  };
};

export const useYearlyForwardedIncidentsStats = (year: number) => {
  const { data, isLoading, error, isFetching } = useQuery<YearlyStats>({
    queryKey: ["yearlyForwardedIncidentsStats", year],
    queryFn: () => getYearlyForwardedIncidentsStats(year),
  });

  return {
    stats: data,
    isLoading,
    isFetching,
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