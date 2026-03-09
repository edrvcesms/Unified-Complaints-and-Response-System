import { reportApi } from "../axios/apiServices";
import type { MonthlyIncidentReport } from "../../types/reports/monthlyReports";

export const getMonthlyIncidentReport = async (
  barangayId: number,
  month?: number,
  year?: number
): Promise<MonthlyIncidentReport> => {
  try {
    const params = new URLSearchParams();
    if (month !== undefined) params.append('month', month.toString());
    if (year !== undefined) params.append('year', year.toString());
    
    const queryString = params.toString();
    const url = `/monthly/${barangayId}${queryString ? `?${queryString}` : ''}`;
    
    return await reportApi.get(url);
  } catch (error) {
    console.error("Error fetching monthly incident report:", error);
    throw error;
  }
};