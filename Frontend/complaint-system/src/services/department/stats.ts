import { departmentApi } from "../axios/apiServices";

interface DailyCounts {
  [date: string]: {
    forwarded?: number;
    under_review?: number;
    resolved?: number;
  };
}

interface WeeklyDepartmentStats {
  daily_counts: DailyCounts;
}

export const getWeeklyDepartmentStats = async (): Promise<WeeklyDepartmentStats> => {
  try {
    return await departmentApi.get('/weekly-stats');
  } catch (error) {
    console.error("Error fetching weekly department stats:", error);
    throw error;
  }
};
