export type Period = "weekly" | "monthly" | "yearly";

export interface StatusCounts {
  submitted: number;
  resolved: number;
  forwarded: number;
  under_review: number;
}

export interface CategoryCountsMap {
  [categoryName: string]: number;
}

export interface StatusCountsMap {
  [key: string]: StatusCounts; // key = "YYYY-MM-DD" (weekly/monthly) or "Jan".."Dec" (yearly)
}

export interface CategoryByPeriodMap {
  [key: string]: CategoryCountsMap; // same key shape as StatusCountsMap
}

// ── Weekly ────────────────────────────────────────────────────────────────────
export interface WeeklyStats {
  period: "weekly";
  total_complaints: number;
  total_submitted: number;
  total_resolved: number;
  total_forwarded: number;
  total_under_review: number;
  total_by_category: CategoryCountsMap;
  daily_counts: StatusCountsMap;       // keyed by "YYYY-MM-DD"
  daily_by_category: CategoryByPeriodMap;
}

// ── Monthly ───────────────────────────────────────────────────────────────────
export interface MonthlyStats {
  period: "monthly";
  year: number;
  month: number;
  total_complaints: number;
  total_submitted: number;
  total_resolved: number;
  total_forwarded: number;
  total_under_review: number;
  total_by_category: CategoryCountsMap;
  daily_counts: StatusCountsMap;       // keyed by "YYYY-MM-DD"
  daily_by_category: CategoryByPeriodMap;
}

// ── Yearly ────────────────────────────────────────────────────────────────────
export interface YearlyStats {
  period: "yearly";
  year: number;
  total_complaints: number;
  total_submitted: number;
  total_resolved: number;
  total_forwarded: number;
  total_under_review: number;
  total_by_category: CategoryCountsMap;
  monthly_counts: StatusCountsMap;     // keyed by "Jan".."Dec"
  monthly_by_category: CategoryByPeriodMap;
}

export type AnyStats = WeeklyStats | MonthlyStats | YearlyStats;

// ── Chart data shapes consumed by Recharts ────────────────────────────────────
export interface TimeSeriesPoint extends StatusCounts {
  label: string; // the x-axis label
  [categoryName: string]: number | string;
}