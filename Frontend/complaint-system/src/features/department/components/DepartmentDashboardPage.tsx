import { useMemo } from "react";
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
import { useWeeklyDepartmentStats } from "../../../hooks/useDepartment";
import { SkeletonCard } from "../../barangay/components/Skeletons";
import { PendingIcon, ReviewIcon, ResolvedIcon } from "../../barangay/components/Icons";
import { formatCategoryName } from "../../../utils/categoryFormatter";
import { utcToLocal } from "../../../utils/dateUtils";

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

interface DepartmentDashboardPageProps {
  incidents: Incident[];
  isLoading: boolean;
}

interface WeeklyDataPoint {
  day: string;
  forwarded: number;
  under_review: number;
  resolved: number;
}

export const DepartmentDashboardPage: React.FC<DepartmentDashboardPageProps> = ({ incidents, isLoading }) => {
  const { t } = useTranslation();

  const stats = useMemo(() => ({
    forwardedToDepartment: incidents.filter(i =>
      i.complaint_clusters[0]?.complaint?.status?.toLowerCase() === 'forwarded_to_department'
    ).length,
    reviewedByDepartment: incidents.filter(i =>
      i.complaint_clusters[0]?.complaint?.status?.toLowerCase() === 'reviewed_by_department'
    ).length,
    resolvedByDepartment: incidents.filter(i =>
      i.complaint_clusters[0]?.complaint?.status?.toLowerCase() === 'resolved_by_department'
    ).length,
  }), [incidents]);

  const recent = [...incidents]
    .sort((a, b) => utcToLocal(b.first_reported_at).getTime() - utcToLocal(a.first_reported_at).getTime())
    .slice(0, 5);

  const { stats: weeklyStats } = useWeeklyDepartmentStats();

  const WEEKLY_DATA: WeeklyDataPoint[] = useMemo(() => {
    if (!weeklyStats?.daily_counts) return [];

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const today = new Date();

    return Array.from({ length: 7 }).map((_, i) => {
      const date = new Date();
      date.setDate(today.getDate() - (6 - i));
      const iso = date.toISOString().split("T")[0];
      const counts = weeklyStats.daily_counts[iso] || { forwarded: 0, under_review: 0, resolved: 0 };

      return {
        day: dayNames[date.getDay()],
        forwarded: counts.forwarded,
        under_review: counts.under_review,
        resolved: counts.resolved,
      };
    });
  }, [weeklyStats]);

  const weeklyChartData = {
    labels: WEEKLY_DATA.map((row) => row.day),
    datasets: [
      { label: "Forwarded to Department", data: WEEKLY_DATA.map((row) => row.forwarded), backgroundColor: "#3b82f6", borderRadius: 4 },
      { label: "Reviewed by Department", data: WEEKLY_DATA.map((row) => row.under_review), backgroundColor: "#6366f1", borderRadius: 4 },
      { label: "Resolved by Department", data: WEEKLY_DATA.map((row) => row.resolved), backgroundColor: "#22c55e", borderRadius: 4 },
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('dashboard.dept.title')}</h1>
        <p className="text-base text-gray-600 mt-1">{t('dashboard.dept.description')}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <StatCard 
              label="Forwarded to Department" 
              value={stats.forwardedToDepartment} 
              color="text-blue-700" 
              bg="bg-blue-50" 
              border="border-blue-100" 
              icon={<PendingIcon />} 
            />
            <StatCard 
              label="Reviewed by Department" 
              value={stats.reviewedByDepartment} 
              color="text-indigo-700" 
              bg="bg-indigo-50" 
              border="border-indigo-100" 
              icon={<ReviewIcon />} 
            />
            <StatCard 
              label="Resolved by Department" 
              value={stats.resolvedByDepartment} 
              color="text-green-700" 
              bg="bg-green-50" 
              border="border-green-100" 
              icon={<ResolvedIcon />} 
            />
          </>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-gray-700">{t('dashboard.dept.weeklyTitle')}</h2>
          <p className="text-sm text-gray-500 mt-0.5">{t('dashboard.dept.weeklyDescription')}</p>
        </div>
        <div className="w-full h-[300px]">
          <ChartJsBar data={weeklyChartData} options={weeklyChartOptions} />
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-700">Recent Assigned Incidents</h2>
          <span className="text-sm text-gray-500">{incidents.length} total</span>
        </div>
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-base font-medium text-gray-900 mb-1">No Assigned Incidents</p>
            <p className="text-sm text-gray-500">There are currently no incidents assigned to your department.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600 uppercase tracking-wide">ID</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600 uppercase tracking-wide">Title</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600 uppercase tracking-wide hidden md:table-cell">Barangay</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600 uppercase tracking-wide hidden lg:table-cell">Category</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recent.map(incident => (
                  <tr key={incident.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 font-mono text-sm text-gray-500">#{incident.id}</td>
                    <td className="px-5 py-3 text-gray-900 font-medium text-base truncate max-w-40">
                      {incident.title}
                    </td>
                    <td className="px-5 py-3 text-gray-600 text-base hidden md:table-cell">
                      {incident.barangay?.barangay_name}
                    </td>
                    <td className="px-5 py-3 text-gray-600 text-base hidden lg:table-cell">
                      {formatCategoryName(incident.category?.category_name)}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-sm font-semibold
                        ${incident.complaint_clusters[0]?.complaint?.status?.toLowerCase() === 'submitted' ? "bg-yellow-100 text-yellow-800" : ""}
                        ${incident.complaint_clusters[0]?.complaint?.status?.toLowerCase() === 'forwarded_to_lgu' || 
                          incident.complaint_clusters[0]?.complaint?.status?.toLowerCase() === 'forwarded_to_department' 
                          ? "bg-orange-100 text-orange-800" : ""}
                        ${incident.complaint_clusters[0]?.complaint?.status?.toLowerCase() === 'under_review' || 
                          incident.complaint_clusters[0]?.complaint?.status?.toLowerCase() === 'reviewed_by_department' || 
                          incident.complaint_clusters[0]?.complaint?.status?.toLowerCase() === 'reviewed_by_barangay' 
                          ? "bg-primary-100 text-primary-800" : ""}
                        ${incident.complaint_clusters[0]?.complaint?.status?.toLowerCase() === 'resolved' || 
                          incident.complaint_clusters[0]?.complaint?.status?.toLowerCase() === 'resolved_by_department' || 
                          incident.complaint_clusters[0]?.complaint?.status?.toLowerCase() === 'resolved_by_barangay' 
                          ? "bg-green-100 text-green-800" : ""}
                      `}>
                        {incident.complaint_clusters[0]?.complaint?.status?.toLowerCase() === 'forwarded_to_lgu' || 
                         incident.complaint_clusters[0]?.complaint?.status?.toLowerCase() === 'forwarded_to_department' 
                          ? "FORWARDED" : 
                         incident.complaint_clusters[0]?.complaint?.status?.toLowerCase() === 'resolved_by_department' || 
                         incident.complaint_clusters[0]?.complaint?.status?.toLowerCase() === 'resolved_by_barangay' 
                          ? "RESOLVED" :
                         incident.complaint_clusters[0]?.complaint?.status?.toLowerCase() === 'reviewed_by_department' || 
                         incident.complaint_clusters[0]?.complaint?.status?.toLowerCase() === 'reviewed_by_barangay' 
                          ? "UNDER REVIEW" :
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
