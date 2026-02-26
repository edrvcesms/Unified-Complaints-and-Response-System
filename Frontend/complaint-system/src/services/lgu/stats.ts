import { lguApi } from "../axios/apiServices";

interface DailyCounts {
  [date: string]: {
    forwarded: number;
    resolved: number;
  };
}

interface WeeklyStats {
  daily_counts: DailyCounts;
}

export const getWeeklyForwardedIncidentsStats = async (): Promise<WeeklyStats> => {
  try {
    return await lguApi.get('/stats/weekly-forwarded-incidents');
  } catch (error) {
    console.error("Error fetching weekly forwarded incidents stats:", error);
    throw error;
  };
};