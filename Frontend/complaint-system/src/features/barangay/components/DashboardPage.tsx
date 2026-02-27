import { useMemo } from "react";
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { Complaint, ComplaintStats, WeeklyDataPoint } from "../../../types/complaints/complaint";
import { useWeeklyComplaintStats } from "../../../hooks/useComplaints";
import { SkeletonCard } from "../components/Skeletons";
import { TotalIcon, PendingIcon, ReviewIcon, ResolvedIcon, ForwardedIcon } from "../components/Icons";
import { StatCard } from "../../general";
import { formatCategoryName } from "../../../utils/categoryFormatter";

interface DashboardPageProps {
  complaints: Complaint[];
  isLoading: boolean;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ complaints, isLoading }) => {
  const { t } = useTranslation();

  const stats: ComplaintStats = useMemo(() => ({
    total: complaints.length,
    submitted: complaints.filter(c => c.status === "submitted").length,
    underReview: complaints.filter(c => c.status === "under_review").length,
    forwarded: complaints.filter(c => c.status === "forwarded_to_lgu").length,
    resolved: complaints.filter(c => c.status === "resolved").length,
  }), [complaints]);

  const recent = [...complaints]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const { stats: weeklyStats } = useWeeklyComplaintStats();

  const WEEKLY_DATA: WeeklyDataPoint[] = useMemo(() => {
    if (!weeklyStats) return [];

    console.log("📊 Weekly Stats from backend:", weeklyStats);

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const today = new Date();

    const data = Array.from({ length: 7 }).map((_, i) => {
      const date = new Date();
      date.setDate(today.getDate() - (6 - i));
      const iso = date.toISOString().split("T")[0];
      const counts = weeklyStats.daily_counts[iso] || { submitted: 0, resolved: 0, forwarded: 0, under_review: 0 };

      return {
        day: dayNames[date.getDay()],
        submitted: counts.submitted,
        resolved: counts.resolved,
        forwarded: counts.forwarded,
        under_review: counts.under_review,
      };
    });

    console.log("📈 Transformed chart data:", JSON.stringify(data, null, 2));
    return data;
  }, [weeklyStats]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('dashboard.title')}</h1>
        <p className="text-sm text-gray-600 mt-1">{t('dashboard.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <StatCard label={t('dashboard.totalComplaints')} value={stats.total} color="text-blue-700" bg="bg-blue-50" border="border-blue-100" icon={<TotalIcon />} />
            <StatCard label={t('dashboard.submitted')} value={stats.submitted} color="text-yellow-700" bg="bg-yellow-50" border="border-yellow-100" icon={<PendingIcon />} />
            <StatCard label={t('dashboard.underReview')} value={stats.underReview} color="text-indigo-700" bg="bg-indigo-50" border="border-indigo-100" icon={<ReviewIcon />} />
            <StatCard label={t('dashboard.forwardedToLgu')} value={stats.forwarded || 0} color="text-orange-700" bg="bg-orange-50" border="border-orange-100" icon={<ForwardedIcon />} />
            <StatCard label={t('dashboard.resolved')} value={stats.resolved} color="text-green-700" bg="bg-green-50" border="border-green-100" icon={<ResolvedIcon />} />
          </>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-5">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-gray-700">{t('dashboard.weeklyActivity')}</h2>
          <p className="text-xs text-gray-500 mt-0.5">{t('dashboard.weeklySubtitle')}</p>
        </div>
        <div className="w-full h-60 sm:h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={WEEKLY_DATA} barSize={20} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "12px" }} cursor={{ fill: "#f9fafb" }} />
            <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "12px" }} />
            <Bar dataKey="submitted" name={t('dashboard.submitted')} fill="#eab308" radius={[4, 4, 0, 0]} />
            <Bar dataKey="under_review" name={t('dashboard.underReview')} fill="#6366f1" radius={[4, 4, 0, 0]} />
            <Bar dataKey="forwarded" name={t('dashboard.forwardedToLgu')} fill="#f97316" radius={[4, 4, 0, 0]} />
            <Bar dataKey="resolved" name={t('dashboard.resolved')} fill="#22c55e" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 sm:px-5 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
          <h2 className="text-sm font-semibold text-gray-700">{t('dashboard.recentComplaints')}</h2>
          <span className="text-xs text-gray-500">{complaints.length} {t('dashboard.columns.total').toLowerCase()}</span>
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-900 mb-1">{t('dashboard.noRecentActivities')}</p>
            <p className="text-xs text-gray-500">{t('dashboard.noRecentActivitiesMessage')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">{t('dashboard.columns.id')}</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">{t('dashboard.columns.title')}</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide hidden md:table-cell">{t('dashboard.columns.category')}</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">{t('dashboard.columns.status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recent.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 font-mono text-xs text-gray-500">#{c.id}</td>
                    <td className="px-5 py-3 text-gray-900 font-medium text-sm">
                      <div className="truncate max-w-[200px] sm:max-w-xs">{c.title}</div>
                    </td>
                    <td className="px-5 py-3 text-gray-600 text-sm hidden md:table-cell">{formatCategoryName(c.category?.category_name)}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold
                        ${c.status === "submitted" ? "bg-yellow-100 text-yellow-800" : ""}
                        ${c.status === "under_review" ? "bg-blue-100 text-blue-800" : ""}
                        ${c.status === "forwarded_to_lgu" ? "bg-orange-100 text-orange-800" : ""}
                        ${c.status === "resolved" ? "bg-green-100 text-green-800" : ""}
                      `}>
                        {c.status === "submitted" ? t('dashboard.statuses.submitted') :
                         c.status === "under_review" ? t('dashboard.statuses.underReview') : 
                         c.status === "forwarded_to_lgu" ? t('dashboard.statuses.forwarded') :
                         c.status === "resolved" ? t('dashboard.statuses.resolved') :
                         c.status.charAt(0).toUpperCase() + c.status.slice(1)}
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