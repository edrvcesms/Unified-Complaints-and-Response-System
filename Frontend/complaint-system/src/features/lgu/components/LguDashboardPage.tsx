import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip as ChartJsTooltip,
  Legend as ChartJsLegend,
  type ChartOptions,
} from "chart.js";
import { Bar as ChartJsBar } from "react-chartjs-2";
import type { Incident } from "../../../types/complaints/incident";
import { useWeeklyForwardedIncidentsStats, useComplaintCountsByBarangayCategory } from "../../../hooks/useStats";
import { SkeletonCard } from "../../barangay/components/Skeletons";
import { TotalIcon, PendingIcon, ReviewIcon, ResolvedIcon } from "../../barangay/components/Icons";
import { formatCategoryName } from "../../../utils/categoryFormatter";

ChartJS.register(CategoryScale, LinearScale, BarElement, ChartJsTooltip, ChartJsLegend);

interface StatCardProps {
  label: string;
  value: number;
  color: string;
  bg: string;
  border: string;
  icon: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, color, bg, border, icon }) => (
  <div className={`bg-white rounded-lg border ${border} p-5 flex items-center gap-4`}>
    <div className={`w-12 h-12 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
      <span className={color}>{icon}</span>
    </div>
    <div>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      <p className="text-base text-gray-600 font-medium mt-0.5">{label}</p>
    </div>
  </div>
);

interface DashboardPageProps {
  incidents: Incident[];
  isLoading: boolean;
}

interface WeeklyDataPoint {
  day: string;
  forwarded: number;
  resolved: number;
  under_review: number;
}

export const LguDashboardPage: React.FC<DashboardPageProps> = ({ incidents, isLoading }) => {
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const stats = useMemo(() => ({
    total: incidents.length,
    pending: incidents.filter(i => 
      i.complaint_clusters[0]?.complaint?.status?.toLowerCase() === 'forwarded_to_lgu'
    ).length,
    underReview: incidents.filter(i => 
      i.complaint_clusters[0]?.complaint?.status?.toLowerCase() === 'reviewed_by_lgu'
    ).length,
    resolved: incidents.filter(i => 
      i.complaint_clusters[0]?.complaint?.status?.toLowerCase() === 'resolved_by_lgu'
    ).length,
  }), [incidents]);

  const recent = [...incidents]
    .sort((a, b) => new Date(b.first_reported_at).getTime() - new Date(a.first_reported_at).getTime())
    .slice(0, 5);

  const { stats: weeklyStats } = useWeeklyForwardedIncidentsStats();
  const { stats: categoryStats, isLoading: isCategoryLoading } = useComplaintCountsByBarangayCategory();

  const WEEKLY_DATA: WeeklyDataPoint[] = useMemo(() => {
    if (!weeklyStats?.daily_counts) return [];

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const today = new Date();

    return Array.from({ length: 7 }).map((_, i) => {
      const date = new Date();
      date.setDate(today.getDate() - (6 - i));
      const iso = date.toISOString().split("T")[0];
      const counts = weeklyStats.daily_counts[iso] || { forwarded: 0, resolved: 0, under_review: 0 };

      return {
        day: dayNames[date.getDay()],
        forwarded: counts.forwarded,
        resolved: counts.resolved,
        under_review: counts.under_review,
      };
    });
  }, [weeklyStats]);

  const CATEGORY_COLORS = [
    "#0ea5e9",
    "#22c55e",
    "#f97316",
    "#8b5cf6",
    "#e11d48",
    "#14b8a6",
    "#f59e0b",
    "#6366f1",
    "#10b981",
    "#ef4444"
  ];

  const categoryChart = useMemo(() => {
    if (!categoryStats) return { data: [], series: [] as { key: string; label: string; color: string }[] };

    const isAll = selectedCategory === "all";
    const activeCategory = categoryStats.categories.find(
      (category) => String(category.id) === selectedCategory
    );

    const series = (isAll ? categoryStats.categories : activeCategory ? [activeCategory] : []).map(
      (category, index) => ({
        key: `cat_${category.id}`,
        label: formatCategoryName(category.name),
        color: CATEGORY_COLORS[index % CATEGORY_COLORS.length]
      })
    );

    const data = categoryStats.data.map((barangay) => {
      const row: Record<string, string | number> = { barangay: barangay.barangay_name };
      barangay.categories.forEach((category) => {
        if (isAll || String(category.category_id) === selectedCategory) {
          row[`cat_${category.category_id}`] = category.count;
        }
      });
      return row;
    });

    return { data, series };
  }, [categoryStats, selectedCategory]);

  const weeklyChartData = {
    labels: WEEKLY_DATA.map((row) => row.day),
    datasets: [
      { label: t('chart.forwarded'), data: WEEKLY_DATA.map((row) => row.forwarded), backgroundColor: "#3b82f6", borderRadius: 4 },
      { label: t('chart.resolved'), data: WEEKLY_DATA.map((row) => row.resolved), backgroundColor: "#22c55e", borderRadius: 4 },
      { label: t('chart.underReview'), data: WEEKLY_DATA.map((row) => row.under_review), backgroundColor: "#6366f1", borderRadius: 4 },
    ],
  };

  const weeklyChartOptions: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          font: { size: 14 },
          padding: 12,
        },
      },
      tooltip: {
        backgroundColor: "#111827",
      },
    },
    scales: {
      x: {
        ticks: { color: "#9ca3af", font: { size: 15 } },
        grid: { display: false },
      },
      y: {
        beginAtZero: true,
        ticks: { color: "#9ca3af", font: { size: 15 }, precision: 0 },
        grid: { color: "#f0f0f0" },
      },
    },
  };

  const categoryChartData = {
    labels: categoryChart.data.map((row) => String(row.barangay ?? "")),
    datasets: categoryChart.series.map((series) => ({
      label: series.label,
      data: categoryChart.data.map((row) => Number(row[series.key] ?? 0)),
      backgroundColor: series.color,
      borderRadius: 4,
      stack: "total",
    })),
  };

  const categoryChartOptions: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          font: { size: 13 },
          padding: 8,
        },
      },
      tooltip: {
        backgroundColor: "#111827",
      },
    },
    scales: {
      x: {
        stacked: true,
        ticks: { color: "#9ca3af", font: { size: 14 }, maxRotation: 25, minRotation: 25 },
        grid: { display: false },
      },
      y: {
        stacked: true,
        beginAtZero: true,
        ticks: { color: "#9ca3af", font: { size: 15 }, precision: 0 },
        grid: { color: "#f0f0f0" },
      },
    },
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('dashboard.lgu.title')}</h1>
        <p className="text-base text-gray-600 mt-1">{t('dashboard.lgu.description')}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <StatCard label={t('dashboard.lgu.totalForwarded')} value={stats.total} color="text-primary-700" bg="bg-primary-50" border="border-primary-100" icon={<TotalIcon />} />
            <StatCard label={t('dashboard.lgu.pending')} value={stats.pending} color="text-yellow-700" bg="bg-yellow-50" border="border-yellow-100" icon={<PendingIcon />} />
            <StatCard label={t('dashboard.lgu.underReview')} value={stats.underReview} color="text-indigo-700" bg="bg-indigo-50" border="border-indigo-100" icon={<ReviewIcon />} />
            <StatCard label={t('dashboard.lgu.resolved')} value={stats.resolved} color="text-green-700" bg="bg-green-50" border="border-green-100" icon={<ResolvedIcon />} />
          </>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-gray-700">{t('dashboard.lgu.weeklyTitle')}</h2>
          <p className="text-sm text-gray-500 mt-0.5">{t('dashboard.lgu.weeklyDescription')}</p>
        </div>
        <div className="w-full h-[300px]">
          <ChartJsBar data={weeklyChartData} options={weeklyChartOptions} />
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-700">{t('dashboard.lgu.categoryBreakdownTitle')}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{t('dashboard.lgu.categoryBreakdownDescription')}</p>
          </div>
          <label className="text-sm text-gray-600 flex items-center gap-2">
            <span>{t('dashboard.lgu.categoryFilterLabel')}</span>
            <select
              className="border border-gray-200 rounded-md px-2 py-1 text-sm text-gray-700 bg-white"
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.target.value)}
            >
              <option value="all">{t('dashboard.lgu.categoryFilterAll')}</option>
              {(categoryStats?.categories || []).map((category) => (
                <option key={category.id} value={String(category.id)}>
                  {formatCategoryName(category.name)}
                </option>
              ))}
            </select>
          </label>
        </div>
        {isCategoryLoading ? (
          <div className="h-60 bg-gray-100 rounded animate-pulse" />
        ) : (
          <div className="w-full h-[340px]">
            <ChartJsBar data={categoryChartData} options={categoryChartOptions} />
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-700">{t('dashboard.lgu.recentTitle')}</h2>
          <span className="text-sm text-gray-500">{incidents.length} {t('stats.total').toLowerCase()}</span>
        </div>
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600 uppercase tracking-wide">{t('table.headers.id')}</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600 uppercase tracking-wide">{t('table.headers.title')}</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600 uppercase tracking-wide hidden md:table-cell">{t('table.headers.barangay')}</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600 uppercase tracking-wide hidden lg:table-cell">{t('table.headers.category')}</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600 uppercase tracking-wide">{t('table.headers.status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recent.map(incident => (
                  <tr key={incident.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 font-mono text-sm text-gray-500">#{incident.id}</td>
                    <td className="px-5 py-3 text-gray-900 font-medium text-base truncate max-w-40">{incident.title}</td>
                    <td className="px-5 py-3 text-gray-600 text-base hidden md:table-cell">{incident.barangay?.barangay_name}</td>
                    <td className="px-5 py-3 text-gray-600 text-base hidden lg:table-cell">{formatCategoryName(incident.category?.category_name)}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-sm font-semibold
                        ${incident.complaint_clusters[0]?.complaint?.status?.toLowerCase() === 'submitted' ? "bg-yellow-100 text-yellow-800" : ""}
                        ${incident.complaint_clusters[0]?.complaint?.status?.toLowerCase() === 'forwarded_to_lgu' || incident.complaint_clusters[0]?.complaint?.status?.toLowerCase() === 'forwarded_to_department' ? "bg-orange-100 text-orange-800" : ""}
                        ${incident.complaint_clusters[0]?.complaint?.status?.toLowerCase() === 'under_review' || incident.complaint_clusters[0]?.complaint?.status?.toLowerCase() === 'reviewed_by_department' || incident.complaint_clusters[0]?.complaint?.status?.toLowerCase() === 'reviewed_by_barangay' ? "bg-primary-100 text-primary-800" : ""}
                        ${incident.complaint_clusters[0]?.complaint?.status?.toLowerCase() === 'resolved' || incident.complaint_clusters[0]?.complaint?.status?.toLowerCase() === 'resolved_by_department' || incident.complaint_clusters[0]?.complaint?.status?.toLowerCase() === 'resolved_by_barangay' ? "bg-green-100 text-green-800" : ""}
                      `}>
                        {incident.complaint_clusters[0]?.complaint?.status?.toLowerCase() === 'forwarded_to_lgu' || incident.complaint_clusters[0]?.complaint?.status?.toLowerCase() === 'forwarded_to_department' ? "FORWARDED" : 
                         incident.complaint_clusters[0]?.complaint?.status?.toLowerCase() === 'resolved_by_department' || incident.complaint_clusters[0]?.complaint?.status?.toLowerCase() === 'resolved_by_barangay' ? "RESOLVED" :
                         incident.complaint_clusters[0]?.complaint?.status?.toLowerCase() === 'reviewed_by_department' || incident.complaint_clusters[0]?.complaint?.status?.toLowerCase() === 'reviewed_by_barangay' ? "UNDER REVIEW" :
                         incident.complaint_clusters[0]?.complaint?.status?.replace("_", " ").toUpperCase() || "N/A"}
                      </span>
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
