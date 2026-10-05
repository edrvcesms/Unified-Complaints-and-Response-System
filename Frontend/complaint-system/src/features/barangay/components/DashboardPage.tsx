import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  type Plugin,
} from "chart.js";
import { Line, Bar as ChartJsBar, Pie as ChartJsPie } from "react-chartjs-2";

import type { Complaint, ComplaintSummary } from "../../../types/complaints/complaint";
import type { Period } from "../../../types/general/stats";
import {
  useWeeklyStats,
  useMonthlyStats,
  useYearlyStats,
} from "../../../hooks/useComplaintStats";
import { useCategoryFeedbackRates } from "../../../hooks/useCategoryFeedbackRates";
import {
  transformWeekly,
  transformMonthly,
  transformYearly,
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
  summary?: ComplaintSummary;
  isLoading: boolean;
}

// ─── Shared styles ────────────────────────────────────────────────────────────

// Minimalist card with a thicker bottom/right edge to give a subtle 3D look
const CHART_CARD_CLASS =
  "min-w-0 bg-white rounded-lg border border-gray-300 border-b-4 border-r-4 p-3 sm:p-4 lg:p-5";

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
    <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
      {/* Period tabs */}
      <div className="flex max-w-full rounded-lg border border-gray-200 overflow-hidden bg-white text-sm sm:text-base">
        {(["weekly", "monthly", "yearly"] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`px-2.5 py-1.5 font-medium capitalize transition-colors sm:px-3 ${period === p
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
          className="min-w-0 max-w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 sm:px-3 sm:text-base"
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
          className="min-w-0 max-w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 sm:px-3 sm:text-base"
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

// Status trend — line chart
function StatusChart({ data }: StatusChartProps) {
  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;

  const makeLine = (label: string, key: "submitted" | "under_review" | "forwarded" | "resolved", color: string) => ({
    label,
    data: data.map((row) => row[key]),
    borderColor: color,
    backgroundColor: color,
    borderWidth: 5,
    pointRadius: 5,
    pointHoverRadius: 7,
    pointBorderColor: "#ffffff",
    pointBorderWidth: 2,
    tension: 0.35,
  });

  const lineData = {
    labels: data.map((row) => row.label),
    datasets: [
      makeLine("Submitted", "submitted", "#eab308"),
      makeLine("Under Review", "under_review", "#6366f1"),
      makeLine("Forwarded", "forwarded", "#f97316"),
      makeLine("Resolved", "resolved", "#22c55e"),
    ],
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
        maxHeight: isMobile ? 86 : 110,
        labels: {
          font: {
            size: isMobile ? 10 : 13,
          },
          boxWidth: isMobile ? 10 : 14,
          boxHeight: isMobile ? 10 : 14,
          usePointStyle: true,
          pointStyle: "rectRounded",
          padding: isMobile ? 8 : 12,
        },
      },
      tooltip: {
        backgroundColor: "#111827",
      },
    },
    scales: {
      x: {
        border: { display: true, color: "#374151", width: 2 },
        ticks: {
          color: "#374151",
          font: {
            size: isMobile ? 11 : 14,
            weight: "bold",
          },
          maxRotation: isMobile ? 0 : 45,
        },
        grid: {
          color: "#d1d5db",
          lineWidth: 1.5,
        },
      },
      y: {
        beginAtZero: true,
        border: { display: true, color: "#374151", width: 2 },
        ticks: {
          color: "#374151",
          font: {
            size: isMobile ? 11 : 14,
            weight: "bold",
          },
          precision: 0,
        },
        grid: {
          color: "#d1d5db",
          lineWidth: 1.5,
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

interface CategoryChartProps {
  totalByCategory: Record<string, number>;
}

// Draws the percentage of each slice on the pie
const piePercentPlugin: Plugin<"pie"> = {
  id: "piePercent",
  afterDatasetsDraw(chart) {
    const { ctx } = chart;
    const meta = chart.getDatasetMeta(0);
    const values = chart.data.datasets[0].data as number[];

    // Only count slices that aren't hidden via the legend
    const total = values.reduce(
      (sum, v, i) => (chart.getDataVisibility(i) ? sum + v : sum),
      0
    );
    if (total === 0) return;

    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
    ctx.shadowBlur = 3;

    meta.data.forEach((arc, i) => {
      if (!chart.getDataVisibility(i)) return;
      const pct = (values[i] / total) * 100;
      if (pct < 4) return; // too small to fit a label
      const { x, y } = (arc as ArcElement).tooltipPosition(false);
      ctx.fillText(`${Number.isInteger(pct) ? pct : pct.toFixed(1)}%`, x, y);
    });

    ctx.restore();
  },
};

function CategoryPieChart({ totalByCategory }: CategoryChartProps) {
  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;

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
        borderWidth: 3,
        hoverOffset: 6,
      },
    ],
  };

  const options: ChartOptions<"pie"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        maxHeight: isMobile ? 96 : 120,
        labels: {
          font: {
            size: isMobile ? 10 : 13,
          },
          boxWidth: isMobile ? 10 : 14,
          boxHeight: isMobile ? 10 : 14,
          usePointStyle: true,
          pointStyle: "circle",
          padding: isMobile ? 8 : 12,
        },
      },
      tooltip: {
        backgroundColor: "#111827",
        callbacks: {
          label: (ctx) => {
            const values = ctx.dataset.data as number[];
            const total = values.reduce((a, b) => a + b, 0);
            const pct = total ? ((ctx.parsed / total) * 100).toFixed(1) : "0";
            return ` ${ctx.label}: ${ctx.parsed} (${pct}%)`;
          },
        },
      },
    },
  };

  return (
    <div className="w-full h-full min-w-0 min-h-[240px]">
      <ChartJsPie data={pieData} options={options} plugins={[piePercentPlugin]} />
    </div>
  );
}

interface CategoryFeedbackChartProps {
  categories: {
    category_name: string;
    average_rating: number;
  }[];
}

function CategoryFeedbackChart({ categories }: CategoryFeedbackChartProps) {
  if (categories.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-base text-gray-400">
        No feedback data by category.
      </div>
    );
  }

  const barData = {
    labels: categories.map((category) => formatCategoryName(category.category_name)),
    datasets: [{
      label: "Average rating",
      data: categories.map((category) => Math.max(0, Math.min(5, category.average_rating))),
      backgroundColor: "#fbbf24",
      borderColor: "#92400e",
      borderWidth: 2,
      borderSkipped: false,
      borderRadius: 4,
      barThickness: 22,
    }],
  };

  const options: ChartOptions<"bar"> = {
    indexAxis: "x",
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => ` ${Number(context.raw).toFixed(1)} / 5`,
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: "#374151",
          font: { weight: "bold" },
        },
        border: { display: true, color: "#374151", width: 2 },
        grid: {
          display: true,
          color: "#d1d5db",
          lineWidth: 1.5,
        },
      },
      y: {
        beginAtZero: true,
        max: 5,
        ticks: {
          stepSize: 1,
          color: "#374151",
          font: { weight: "bold" },
        },
        border: { display: true, color: "#374151", width: 2 },
        grid: {
          color: "#d1d5db",
          lineWidth: 1.5,
        },
        title: {
          display: true,
          text: "Average rating (1–5)",
          color: "#4b5563",
        },
      },
    },
  };

  return (
    <div className="h-full min-h-[18rem] w-full min-w-0">
      <ChartJsBar data={barData} options={options} />
    </div>
  );
}

// ─── Stable dashboard summary ────────────────────────────────────────────────

function useDashboardCardStats(summary: ComplaintSummary | undefined, complaints: Complaint[]) {
  return useMemo(() => {
    if (summary) {
      return {
        total: summary.total,
        submitted: summary.submitted,
        underReview: summary.under_review,
        forwarded: summary.forwarded,
        resolved: summary.resolved,
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
  }, [complaints, summary]);
}

// ─── Main Component ───────────────────────────────────────────────────────────

export const DashboardPage: React.FC<DashboardPageProps> = ({
  complaints,
  summary,
  isLoading,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

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
  // Cards use the dashboard's complaint summary and are intentionally
  // independent from the period-specific chart query.
  const cardStats = useDashboardCardStats(summary, complaints);

  // Transform to chart data
  const chartData = useMemo(() => {
    if (!data) return [];
    if (data.period === "weekly") return transformWeekly(data);
    if (data.period === "monthly") return transformMonthly(data);
    return transformYearly(data);
  }, [data]);

  const categoryFeedbackRates = useCategoryFeedbackRates();

  const recentActivities = useMemo(
    () =>
      [...complaints]
        .filter(
          (complaint) =>
            complaint.status === "resolved_by_barangay" ||
            complaint.status === "forwarded_to_lgu"
        )
        .sort(
          (a, b) =>
            utcToLocal(b.created_at).getTime() -
            utcToLocal(a.created_at).getTime()
        )
        .slice(0, 5),
    [complaints]
  );

  return (
    <div className="min-w-0 space-y-5 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
          {t("dashboard.title")}
        </h1>
        <p className="mt-1 text-sm text-gray-600 sm:text-base">{t("dashboard.subtitle")}</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 2xl:grid-cols-5">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <StatCard label={t("dashboard.totalComplaints")} value={cardStats.total} color="text-primary-700" bg="bg-primary-50" border="border-primary-100" icon={<TotalIcon />} onClick={() => navigate("/dashboard/incidents")} />
            <StatCard label={t("dashboard.submitted")} value={cardStats.submitted} color="text-yellow-700" bg="bg-yellow-50" border="border-yellow-100" icon={<PendingIcon />} onClick={() => navigate("/dashboard/incidents?complaint_status=submitted")} />
            <StatCard label={t("dashboard.underReview")} value={cardStats.underReview} color="text-indigo-700" bg="bg-indigo-50" border="border-indigo-100" icon={<ReviewIcon />} onClick={() => navigate("/dashboard/incidents?complaint_status=reviewed_by_barangay")} />
            <StatCard label={t("dashboard.forwarded")} value={cardStats.forwarded} color="text-orange-700" bg="bg-orange-50" border="border-orange-100" icon={<ForwardedIcon />} onClick={() => navigate("/dashboard/archive?complaint_status=forwarded_to_lgu")} />
            <StatCard label={t("dashboard.resolved")} value={cardStats.resolved} color="text-green-700" bg="bg-green-50" border="border-green-100" icon={<ResolvedIcon />} onClick={() => navigate("/dashboard/archive?complaint_status=resolved_by_barangay")} />
          </>
        )}
      </div>

      {/* Period controls + charts */}
      <div className="min-w-0 space-y-4">
        {/* Control row */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-700">
              {t("dashboard.activityOverview")}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {t("dashboard.complaintTrends")}
            </p>
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {isFetching && !statsLoading && (
              <span className="text-xs text-gray-400 animate-pulse sm:text-sm">
                {t("dashboard.refreshing")}
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
              t("dashboard.statsLoadFailed")
            }
          />
        )}

        {/* Status trend (line) */}
        {statsLoading ? (
          <SkeletonChart />
        ) : (
          <div className={CHART_CARD_CLASS}>
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-4">
              {t("dashboard.complaintsByStatus")}
            </h3>
            <div className="h-72 w-full min-w-0 sm:h-80 lg:h-[22rem]">
              <StatusChart data={chartData} />
            </div>
          </div>
        )}

        {/* Category charts — side by side on larger screens */}
        <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Pie: total by category for the period */}
          {statsLoading ? (
            <SkeletonPieChart />
          ) : (
            <div className={CHART_CARD_CLASS}>
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-4">
                {t("dashboard.complaintIssues")}
              </h3>
              <div className="w-full min-w-0 h-72 sm:h-64">
                <CategoryPieChart
                  totalByCategory={data?.total_by_category ?? {}}
                />
              </div>
            </div>
          )}

          {/* Bar: category over time */}
          {statsLoading || categoryFeedbackRates.isLoading ? (
            <SkeletonChart />
          ) : categoryFeedbackRates.isError ? (
            <ErrorBanner message={t("dashboard.statsLoadFailed")} />
          ) : (
            <div className="bg-white rounded-lg border border-gray-300 p-4 sm:p-5">
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-4">
                {t("dashboard.residentSatisfactionByCategory")}
              </h3>
              <div className="h-72 w-full min-w-0 sm:h-80 lg:h-[22rem]">
                <CategoryFeedbackChart
                  categories={categoryFeedbackRates.data?.by_category ?? []}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Barangay Activities table */}
      <div className="bg-white rounded-lg border-2 border-gray-300 overflow-hidden">
        <div className="px-4 sm:px-5 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h2 className="text-base font-semibold text-gray-700">
            {t("dashboard.recentBarangayActivities")}
          </h2>
          <span className="text-sm text-gray-500">
            {recentActivities.length} {t("dashboard.columns.total").toLowerCase()}
          </span>
        </div>

        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : recentActivities.length === 0 ? (
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-md bg-gray-100 mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <p className="text-base font-medium text-gray-900 mb-1">
              {t("dashboard.noRecentBarangayActivities")}
            </p>
            <p className="text-sm text-gray-500">
              {t("dashboard.noRecentBarangayActivitiesMessage")}
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
                  <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600 uppercase tracking-wide hidden md:table-cell">
                    {t("dashboard.columns.category")}
                  </th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600 uppercase tracking-wide">
                    {t("dashboard.columns.action")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentActivities.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 font-mono text-sm text-gray-500">
                      #{c.id}
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
      className: "bg-gray-100 text-gray-800",
    },
    under_review: {
      label: t("dashboard.statuses.underReview"),
      className: "bg-primary-100 text-primary-800",
    },
    reviewed_by_barangay: {
      label: t("dashboard.statuses.reviewedByBarangay"),
      className: "bg-primary-100 text-primary-800",
    },
    forwarded_to_lgu: {
      label: t("dashboard.statuses.forwardedToLgu"),
      className: "bg-blue-100 text-blue-800",
    },
    resolved_by_lgu: {
      label: t("dashboard.statuses.resolved_by_lgu"),
      className: "bg-green-100 text-green-800",
    },
    resolved_by_barangay: {
      label: t("dashboard.statuses.resolved_by_barangay"),
      className: "bg-green-100 text-green-800",
    },
    rejected: {
      label: t("dashboard.statuses.rejected"),
      className: "bg-red-100 text-red-800",
    },
  };

  const { label, className } = config[status] ?? {
    label: status.toUpperCase().replace(/_/g, " "),
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