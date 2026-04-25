import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ArcElement,
} from "chart.js";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip as ChartJsTooltip,
  Legend as ChartJsLegend,
  type ChartOptions,
} from "chart.js";
import { Line, Bar as ChartJsBar, Pie as ChartJsPie } from "react-chartjs-2";

import type { Complaint } from "../../../types/complaints/complaint";
import type { AnyStats, Period } from "../../../types/general/stats";
import {
  useWeeklyStats,
  useMonthlyStats,
  useYearlyStats,
} from "../../../hooks/useComplaintStats";
import {
  transformWeekly,
  transformMonthly,
  transformYearly,
  getCategoryNames,
  getCategoryColor,
} from "../../../utils/statsTransformer";

import { SkeletonCard, SkeletonChart, SkeletonPieChart } from "../components/Skeletons";
import { TotalIcon, PendingIcon, ReviewIcon, ResolvedIcon, ForwardedIcon } from "../components/Icons";
import { StatCard } from "../../general";
import { formatCategoryName } from "../../../utils/categoryFormatter";
import { utcToLocal } from "../../../utils/dateUtils";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, ChartJsTooltip, ChartJsLegend);

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardPageProps {
  complaints: Complaint[];
  isLoading: boolean;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-base">
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
      <span>{message}</span>
    </div>
  );
}

// ─── Period Selector ──────────────────────────────────────────────────────────

interface PeriodSelectorProps {
  period: Period;
  onChange: (p: Period) => void;
  year: number;
  month: number;
  onYearChange: (y: number) => void;
  onMonthChange: (m: number) => void;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function PeriodSelector({
  period, onChange,
  year, month, onYearChange, onMonthChange,
}: PeriodSelectorProps) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Period tabs */}
      <div className="flex rounded-lg border border-gray-200 overflow-hidden bg-white text-base">
        {(["weekly", "monthly", "yearly"] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`px-3 py-1.5 font-medium capitalize transition-colors ${
              period === p
                ? "bg-primary-600 text-white"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Month picker — only for monthly */}
      {period === "monthly" && (
        <select
          value={month}
          onChange={(e) => onMonthChange(Number(e.target.value))}
          className="text-base rounded-lg border border-gray-200 px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          {MONTHS.map((name, idx) => (
            <option key={idx + 1} value={idx + 1}>{name}</option>
          ))}
        </select>
      )}

      {/* Year picker — for monthly and yearly */}
      {(period === "monthly" || period === "yearly") && (
        <select
          value={year}
          onChange={(e) => onYearChange(Number(e.target.value))}
          className="text-base rounded-lg border border-gray-200 px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      )}
    </div>
  );
}

// ─── Charts ───────────────────────────────────────────────────────────────────

interface StatusChartProps {
  data: ReturnType<typeof transformWeekly>;
}

function StatusChart({ data }: StatusChartProps) {
  const barData = {
    labels: data.map((row) => row.label),
    datasets: [
      { label: "Submitted", data: data.map((row) => row.submitted), backgroundColor: "#eab308", borderRadius: 4 },
      { label: "Under Review", data: data.map((row) => row.under_review), backgroundColor: "#6366f1", borderRadius: 4 },
      { label: "Forwarded", data: data.map((row) => row.forwarded), backgroundColor: "#f97316", borderRadius: 4 },
      { label: "Resolved", data: data.map((row) => row.resolved), backgroundColor: "#22c55e", borderRadius: 4 },
    ],
  };

  const options: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          font: {
            size: 13,
          },
          padding: 12,
        },
      },
      tooltip: {
        backgroundColor: "#111827",
      },
    },
    scales: {
      x: {
        ticks: {
          color: "#9ca3af",
          font: {
            size: 14,
          },
        },
        grid: {
          display: false,
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: "#9ca3af",
          font: {
            size: 14,
          },
          precision: 0,
        },
        grid: {
          color: "#f0f0f0",
        },
      },
    },
  };

  return (
    <div className="w-full h-full min-w-0 min-h-[300px]">
      <ChartJsBar data={barData} options={options} />
    </div>
  );
}

interface CategoryChartProps {
  totalByCategory: Record<string, number>;
}

function CategoryPieChart({ totalByCategory }: CategoryChartProps) {
  const pieEntries = Object.entries(totalByCategory)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a)
    .map(([name, value]) => ({ name: formatCategoryName(name), value }));

  if (pieEntries.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-base text-gray-400">
        No category data for this period.
      </div>
    );
  }

  const pieData = {
    labels: pieEntries.map((entry) => entry.name),
    datasets: [
      {
        data: pieEntries.map((entry) => entry.value),
        backgroundColor: pieEntries.map((_, index) => getCategoryColor(index)),
        borderColor: "#ffffff",
        borderWidth: 2,
      },
    ],
  };

  const options: ChartOptions<"pie"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          font: {
            size: 13,
          },
          padding: 12,
        },
      },
      tooltip: {
        backgroundColor: "#111827",
      },
    },
  };

  return (
    <div className="w-full h-full min-w-0 min-h-[240px]">
      <ChartJsPie data={pieData} options={options} />
    </div>
  );
}

interface CategoryBarChartProps {
  data: ReturnType<typeof transformWeekly>;
  categoryNames: string[];
}

function CategoryLineChart({ data, categoryNames }: CategoryBarChartProps) {
  if (categoryNames.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-base text-gray-400">
        No category data for this period.
      </div>
    );
  }

  const lineData = {
    labels: data.map((row) => row.label),
    datasets: categoryNames.map((name, i) => ({
      label: formatCategoryName(name),
      data: data.map((row) => Number(row[name] ?? 0)),
      borderColor: getCategoryColor(i),
      backgroundColor: getCategoryColor(i),
      borderWidth: 3,
      pointRadius: 3,
      pointHoverRadius: 5,
      tension: 0.35,
    })),
  };

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index",
      intersect: false,
    },
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          font: {
            size: 13,
          },
          padding: 12,
        },
      },
      tooltip: {
        backgroundColor: "#111827",
      },
    },
    scales: {
      x: {
        ticks: {
          color: "#9ca3af",
          font: {
            size: 14,
          },
        },
        grid: {
          display: false,
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: "#9ca3af",
          font: {
            size: 14,
          },
          precision: 0,
        },
        grid: {
          color: "#f0f0f0",
        },
      },
    },
  };

  return (
    <div className="w-full h-full min-w-0 min-h-[300px]">
      <Line data={lineData} options={options} />
    </div>
  );
}

// ─── Card summary from active period stats ───────────────────────────────────

function useDashboardCardStats(
  activeStats: AnyStats | undefined,
  complaints: Complaint[]
) {
  return useMemo(() => {
    if (activeStats) {
      return {
        total: activeStats.total_complaints,
        submitted: activeStats.total_submitted,
        underReview: activeStats.total_under_review,
        forwarded: activeStats.total_forwarded,
        resolved: activeStats.total_resolved,
      };
    }

    return {
      total: complaints.length,
      submitted: complaints.filter((c) => c.status === "submitted").length,
      underReview: complaints.filter(
        (c) => c.status === "reviewed_by_barangay"
      ).length,
      forwarded: complaints.filter(
        (c) => c.status === "forwarded_to_lgu"
      ).length,
      resolved: complaints.filter(
        (c) => c.status === "resolved_by_barangay"
      ).length,
    };
  }, [activeStats, complaints]);
}

// ─── Main Component ───────────────────────────────────────────────────────────

export const DashboardPage: React.FC<DashboardPageProps> = ({
  complaints,
  isLoading,
}) => {
  const { t } = useTranslation();

  // Period state
  const now = new Date();
  const [period, setPeriod] = useState<Period>("weekly");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  // Hooks (only the active one will actually fetch)
  const weekly = useWeeklyStats();
  const monthly = useMonthlyStats(year, month);
  const yearly = useYearlyStats(year);

  // Pick active query result
  const activeQuery =
    period === "weekly" ? weekly
    : period === "monthly" ? monthly
    : yearly;

  const { data, isLoading: statsLoading, isError, error, isFetching } = activeQuery;
  const cardStats = useDashboardCardStats(data, complaints);

  // Transform to chart data
  const chartData = useMemo(() => {
    if (!data) return [];
    if (data.period === "weekly") return transformWeekly(data);
    if (data.period === "monthly") return transformMonthly(data);
    return transformYearly(data);
  }, [data]);

  const categoryNames = useMemo(
    () => (data ? getCategoryNames(data.total_by_category) : []),
    [data]
  );

  // Recent complaints list
  const recent = useMemo(
    () =>
      [...complaints]
        .sort(
          (a, b) =>
            utcToLocal(b.created_at).getTime() -
            utcToLocal(a.created_at).getTime()
        )
        .slice(0, 5),
    [complaints]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          {t("dashboard.title")}
        </h1>
        <p className="text-base text-gray-600 mt-1">{t("dashboard.subtitle")}</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <StatCard label={t("dashboard.totalComplaints")} value={cardStats.total} color="text-primary-700" bg="bg-primary-50" border="border-primary-100" icon={<TotalIcon />} />
            <StatCard label={t("dashboard.submitted")} value={cardStats.submitted} color="text-yellow-700" bg="bg-yellow-50" border="border-yellow-100" icon={<PendingIcon />} />
            <StatCard label={t("dashboard.underReview")} value={cardStats.underReview} color="text-indigo-700" bg="bg-indigo-50" border="border-indigo-100" icon={<ReviewIcon />} />
            <StatCard label="Forwarded" value={cardStats.forwarded} color="text-orange-700" bg="bg-orange-50" border="border-orange-100" icon={<ForwardedIcon />} />
            <StatCard label={t("dashboard.resolved")} value={cardStats.resolved} color="text-green-700" bg="bg-green-50" border="border-green-100" icon={<ResolvedIcon />} />
          </>
        )}
      </div>

      {/* Period controls + charts */}
      <div className="space-y-4">
        {/* Control row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-700">
              Activity Overview
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Complaint trends by status and category
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isFetching && !statsLoading && (
              <span className="text-sm text-gray-400 animate-pulse">
                Refreshing…
              </span>
            )}
            <PeriodSelector
              period={period}
              onChange={setPeriod}
              year={year}
              month={month}
              onYearChange={setYear}
              onMonthChange={setMonth}
            />
          </div>
        </div>

        {/* Error state */}
        {isError && (
          <ErrorBanner
            message={
              error?.message ??
              "Failed to load stats. Please try again later."
            }
          />
        )}

        {/* Status chart */}
        {statsLoading ? (
          <SkeletonChart />
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-4">
              Complaints by Status
            </h3>
            <div className="w-full min-w-0 h-72 sm:h-80">
              <StatusChart data={chartData} />
            </div>
          </div>
        )}

        {/* Category charts — side by side on larger screens */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Pie: total by category for the period */}
          {statsLoading ? (
            <SkeletonPieChart />
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-5">
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-4">
                Total by Category
              </h3>
              <div className="w-full min-w-0 h-60 sm:h-64">
                <CategoryPieChart
                  totalByCategory={data?.total_by_category ?? {}}
                />
              </div>
            </div>
          )}

          {/* Stacked bar: category over time */}
          {statsLoading ? (
            <SkeletonChart />
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-5">
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-4">
                Category Trend
              </h3>
              <div className="w-full min-w-0 h-72 sm:h-80">
                <CategoryLineChart
                  data={chartData}
                  categoryNames={categoryNames}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Complaints table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 sm:px-5 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h2 className="text-base font-semibold text-gray-700">
            {t("dashboard.recentComplaints")}
          </h2>
          <span className="text-sm text-gray-500">
            {complaints.length} {t("dashboard.columns.total").toLowerCase()}
          </span>
        </div>

        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-md bg-gray-100 mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <p className="text-base font-medium text-gray-900 mb-1">
              {t("dashboard.noRecentActivities")}
            </p>
            <p className="text-sm text-gray-500">
              {t("dashboard.noRecentActivitiesMessage")}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600 uppercase tracking-wide">
                    {t("dashboard.columns.id")}
                  </th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600 uppercase tracking-wide">
                    {t("dashboard.columns.title")}
                  </th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600 uppercase tracking-wide hidden md:table-cell">
                    {t("dashboard.columns.category")}
                  </th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600 uppercase tracking-wide">
                    {t("dashboard.columns.status")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recent.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 font-mono text-sm text-gray-500">
                      #{c.id}
                    </td>
                    <td className="px-5 py-3 text-gray-900 font-medium text-base">
                      <div className="truncate max-w-xs sm:max-w-sm">
                        {c.title}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-600 text-base hidden md:table-cell">
                      {formatCategoryName(c.category?.category_name)}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={c.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();

  const config: Record<
    string,
    { label: string; className: string }
  > = {
    submitted: {
      label: t("dashboard.statuses.submitted"),
      className: "bg-yellow-100 text-yellow-800",
    },
    under_review: {
      label: t("dashboard.statuses.underReview"),
      className: "bg-primary-100 text-primary-800",
    },
    reviewed_by_barangay: {
      label: t("dashboard.statuses.reviewedByBarangay"),
      className: "bg-primary-100 text-primary-800",
    },
    reviewed_by_department: {
      label: t("dashboard.statuses.reviewedByDepartment"),
      className: "bg-primary-100 text-primary-800",
    },
    forwarded_to_lgu: {
      label: t("dashboard.statuses.forwardedToLgu"),
      className: "bg-orange-100 text-orange-800",
    },
    forwarded_to_department: {
      label: t("dashboard.statuses.forwardedToDepartment"),
      className: "bg-orange-100 text-orange-800",
    },
    resolved_by_lgu: {
      label: t("dashboard.statuses.resolved_by_lgu"),
      className: "bg-green-100 text-green-800",
    },
    resolved_by_barangay: {
      label: t("dashboard.statuses.resolved_by_barangay"),
      className: "bg-green-100 text-green-800",
    },
    resolved_by_department: {
      label: t("dashboard.statuses.resolved_by_department"),
      className: "bg-green-100 text-green-800",
    },
    rejected: {
      label: t("dashboard.statuses.rejected"),
      className: "bg-red-100 text-red-800",
    },
  };

  const { label, className } = config[status] ?? {
    label: status.charAt(0).toUpperCase() + status.slice(1),
    className: "bg-gray-100 text-gray-700",
  };

  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded-md text-sm font-semibold ${className}`}
    >
      {label}
    </span>
  );
}