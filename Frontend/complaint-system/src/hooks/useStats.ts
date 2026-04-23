import { useQuery } from "@tanstack/react-query";
import { getWeeklyForwardedIncidentsStats, getComplaintCountsByBarangayCategory } from "../services/lgu/stats";

interface DailyCounts {
  [date: string]: {
    forwarded: number;
    forwarded_to_department: number;
    resolved: number;
    under_review: number;
  };
}

interface WeeklyStats {
  daily_counts: DailyCounts;
}

interface BarangayCategoryCount {
  category_id: number;
  category_name: string;
  count: number;
}

interface BarangayCategoryData {
  barangay_id: number;
  barangay_name: string;
  categories: BarangayCategoryCount[];
}

interface ComplaintCountsByBarangayCategory {
  barangays: { id: number; name: string }[];
  categories: { id: number; name: string }[];
  data: BarangayCategoryData[];
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
