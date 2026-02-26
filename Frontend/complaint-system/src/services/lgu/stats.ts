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
  return await lguApi.get('/stats/weekly-forwarded-incidents');
};