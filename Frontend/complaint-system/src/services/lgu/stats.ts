import { lguApi } from "../axios/apiServices";

interface DailyCounts {
  [date: string]: {
    forwarded?: number;
    resolved?: number;
    under_review?: number;
  };
}

interface MonthlyCounts {
  [month: string]: {
    forwarded?: number;
    resolved?: number;
    under_review?: number;
  };
}

interface WeeklyStats {
  daily_counts: DailyCounts;
}

interface MonthlyStats {
  year: number;
  month: number;
  daily_counts: DailyCounts;
}

interface YearlyStats {
  year: number;
  monthly_counts: MonthlyCounts;
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

export const getWeeklyForwardedIncidentsStats = async (): Promise<WeeklyStats> => {
  try {
    return await lguApi.get('/stats/weekly-forwarded-incidents');
  } catch (error) {
    console.error("Error fetching weekly forwarded incidents stats:", error);
    throw error;
  };
};

export const getMonthlyForwardedIncidentsStats = async (year: number, month: number): Promise<MonthlyStats> => {
  try {
    return await lguApi.get('/stats/monthly-forwarded-incidents', { params: { year, month } });
  } catch (error) {
    console.error("Error fetching monthly forwarded incidents stats:", error);
    throw error;
  }
};

export const getYearlyForwardedIncidentsStats = async (year: number): Promise<YearlyStats> => {
  try {
    return await lguApi.get('/stats/yearly-forwarded-incidents', { params: { year } });
  } catch (error) {
    console.error("Error fetching yearly forwarded incidents stats:", error);
    throw error;
  }
};

export const getComplaintCountsByBarangayCategory = async (): Promise<ComplaintCountsByBarangayCategory> => {
  try {
    return await lguApi.get('/stats/complaints-by-barangay-category');
  } catch (error) {
    console.error("Error fetching complaint counts by barangay/category:", error);
    throw error;
  }
};