import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { Incident } from "../../../types/complaints/incident";
import { useWeeklyDepartmentStats } from "../../../hooks/useDepartment";
import { SkeletonCard } from "../../barangay/components/Skeletons";
import { TotalIcon, PendingIcon, ReviewIcon, ResolvedIcon } from "../../barangay/components/Icons";
import { formatCategoryName } from "../../../utils/categoryFormatter";
import { utcToLocal } from "../../../utils/dateUtils";

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
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-600 font-medium mt-0.5">{label}</p>
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
  resolved: number;
}

export const DepartmentDashboardPage: React.FC<DepartmentDashboardPageProps> = ({ incidents, isLoading }) => {
  const { t } = useTranslation();

  const stats = useMemo(() => ({
    total: incidents.length,
    pending: incidents.filter(i => 
      i.complaint_clusters[0]?.complaint?.status?.toLowerCase() === 'pending' ||
      i.complaint_clusters[0]?.complaint?.status?.toLowerCase() === 'submitted' ||
      i.complaint_clusters[0]?.complaint?.status?.toLowerCase() === 'forwarded_to_lgu' ||
      i.complaint_clusters[0]?.complaint?.status?.toLowerCase() === 'forwarded_to_department'
    ).length,
    underReview: incidents.filter(i => 
      i.complaint_clusters[0]?.complaint?.status?.toLowerCase() === 'under_review' ||
      i.complaint_clusters[0]?.complaint?.status?.toLowerCase() === 'reviewed_by_department'
    ).length,
    resolved: incidents.filter(i => 
      i.complaint_clusters[0]?.complaint?.status?.toLowerCase() === 'resolved' ||
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
      const counts = weeklyStats.daily_counts[iso] || { forwarded: 0, resolved: 0 };

      return {
        day: dayNames[date.getDay()],
        forwarded: counts.forwarded,
        resolved: counts.resolved,
      };
    });
  }, [weeklyStats]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('dashboard.dept.title')}</h1>
        <p className="text-sm text-gray-600 mt-1">{t('dashboard.dept.description')}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <StatCard 
              label={t('dashboard.dept.totalAssigned')} 
              value={stats.total} 
              color="text-blue-700" 
              bg="bg-blue-50" 
              border="border-blue-100" 
              icon={<TotalIcon />} 
            />
            <StatCard 
              label={t('dashboard.dept.pending')} 
              value={stats.pending} 
              color="text-yellow-700" 
              bg="bg-yellow-50" 
              border="border-yellow-100" 
              icon={<PendingIcon />} 
            />
            <StatCard 
              label={t('dashboard.dept.underReview')} 
              value={stats.underReview} 
              color="text-indigo-700" 
              bg="bg-indigo-50" 
              border="border-indigo-100" 
              icon={<ReviewIcon />} 
            />
            <StatCard 
              label={t('dashboard.dept.resolved')} 
              value={stats.resolved} 
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
          <h2 className="text-sm font-semibold text-gray-700">{t('dashboard.dept.weeklyTitle')}</h2>
          <p className="text-xs text-gray-500 mt-0.5">{t('dashboard.dept.weeklyDescription')}</p>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={WEEKLY_DATA} barSize={20} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis 
              dataKey="day" 
              tick={{ fontSize: 11, fill: "#9ca3af" }} 
              axisLine={false} 
              tickLine={false} 
            />
            <YAxis 
              tick={{ fontSize: 11, fill: "#9ca3af" }} 
              axisLine={false} 
              tickLine={false} 
            />
            <Tooltip 
              contentStyle={{ 
                borderRadius: "8px", 
                border: "1px solid #e5e7eb", 
                fontSize: "12px" 
              }} 
              cursor={{ fill: "#f9fafb" }} 
            />
            <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "12px" }} />
            <Bar dataKey="forwarded" name="Assigned" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="resolved" name="Resolved" fill="#22c55e" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Recent Assigned Incidents</h2>
          <span className="text-xs text-gray-500">{incidents.length} total</span>
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
            <p className="text-sm font-medium text-gray-900 mb-1">No Assigned Incidents</p>
            <p className="text-xs text-gray-500">There are currently no incidents assigned to your department.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">ID</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Title</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide hidden md:table-cell">Barangay</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide hidden lg:table-cell">Category</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recent.map(incident => (
                  <tr key={incident.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 font-mono text-xs text-gray-500">#{incident.id}</td>
                    <td className="px-5 py-3 text-gray-900 font-medium text-sm truncate max-w-40">
                      {incident.title}
                    </td>
                    <td className="px-5 py-3 text-gray-600 text-sm hidden md:table-cell">
                      {incident.barangay?.barangay_name}
                    </td>
                    <td className="px-5 py-3 text-gray-600 text-sm hidden lg:table-cell">
                      {formatCategoryName(incident.category?.category_name)}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold
                        ${incident.complaint_clusters[0]?.complaint?.status?.toLowerCase() === 'submitted' ? "bg-yellow-100 text-yellow-800" : ""}
                        ${incident.complaint_clusters[0]?.complaint?.status?.toLowerCase() === 'forwarded_to_lgu' || 
                          incident.complaint_clusters[0]?.complaint?.status?.toLowerCase() === 'forwarded_to_department' 
                          ? "bg-orange-100 text-orange-800" : ""}
                        ${incident.complaint_clusters[0]?.complaint?.status?.toLowerCase() === 'under_review' || 
                          incident.complaint_clusters[0]?.complaint?.status?.toLowerCase() === 'reviewed_by_department' || 
                          incident.complaint_clusters[0]?.complaint?.status?.toLowerCase() === 'reviewed_by_barangay' 
                          ? "bg-blue-100 text-blue-800" : ""}
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
