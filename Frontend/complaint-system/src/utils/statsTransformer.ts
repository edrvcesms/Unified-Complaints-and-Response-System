import type {
  WeeklyStats,
  MonthlyStats,
  YearlyStats,
  TimeSeriesPoint,
  StatusCountsMap,
  CategoryByPeriodMap,
} from "../types/general/stats";

function buildSeries(
  countsMap: StatusCountsMap,
  categoryMap: CategoryByPeriodMap,
  labelKey: "day" | "date" | "month"
): TimeSeriesPoint[] {
  return Object.entries(countsMap).map(([key, counts]) => {
    const catCounts = categoryMap[key] ?? {};
    return {
      label: key,
      ...counts,
      ...catCounts,
    };
  });
}

export function transformWeekly(stats: WeeklyStats): TimeSeriesPoint[] {
  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return buildSeries(stats.daily_counts, stats.daily_by_category, "day").map(
    (p) => ({
      ...p,
      label: DAYS[new Date(p.label + "T00:00:00").getDay()],
    })
  );
}

export function transformMonthly(stats: MonthlyStats): TimeSeriesPoint[] {
  return buildSeries(stats.daily_counts, stats.daily_by_category, "date").map(
    (p) => ({
      ...p,
      // Show "Mar 5" style labels
      label: new Date(p.label + "T00:00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
    })
  );
}

export function transformYearly(stats: YearlyStats): TimeSeriesPoint[] {
  return buildSeries(
    stats.monthly_counts,
    stats.monthly_by_category,
    "month"
  );
}

/** Derive sorted category names from total_by_category */
export function getCategoryNames(
  totalByCategory: Record<string, number>
): string[] {
  return Object.entries(totalByCategory)
    .sort(([, a], [, b]) => b - a) // descending by count
    .map(([name]) => name);
}

/** A pleasant palette for category bars (cycles if more than 8 categories) */
const CATEGORY_COLORS = [
  "#6366f1", // indigo
  "#f97316", // orange
  "#14b8a6", // teal
  "#ec4899", // pink
  "#84cc16", // lime
  "#8b5cf6", // violet
  "#0ea5e9", // sky
  "#f59e0b", // amber
];

export function getCategoryColor(index: number): string {
  return CATEGORY_COLORS[index % CATEGORY_COLORS.length];
}