import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type { WeeklyStats, MonthlyStats, YearlyStats } from "../types/general/stats";
import { complaintsApi } from "../services/axios/apiServices";

// ── Weekly ────────────────────────────────────────────────────────────────────
export function useWeeklyStats(): UseQueryResult<WeeklyStats, Error> {
  return useQuery<WeeklyStats, Error>({
    queryKey: ["complaint-stats", "weekly"],
    queryFn: async () => {
      const res = await complaintsApi.get<WeeklyStats>("/weekly");
      return res;
    },
    staleTime: 1000 * 60 * 5,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    retry: 2,
  });
}

// ── Monthly ───────────────────────────────────────────────────────────────────
export function useMonthlyStats(year: number, month: number): UseQueryResult<MonthlyStats, Error> {
  return useQuery<MonthlyStats, Error>({
    queryKey: ["complaint-stats", "monthly", year, month],
    queryFn: async () => {
      const res = await complaintsApi.get<MonthlyStats>(`/monthly/${year}/${month}`);
      return res;
    },
    staleTime: 1000 * 60 * 5,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    retry: 2,
    enabled: !!year && !!month,
  });
}

// ── Yearly ────────────────────────────────────────────────────────────────────
export function useYearlyStats(year: number): UseQueryResult<YearlyStats, Error> {
  return useQuery<YearlyStats, Error>({
    queryKey: ["complaint-stats", "yearly", year],
    queryFn: async () => {
      const res = await complaintsApi.get<YearlyStats>(`/yearly/${year}`);
      return res;
    },
    staleTime: 1000 * 60 * 5,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    retry: 2,
    enabled: !!year,
  });
}