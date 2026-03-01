import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { Incident } from "../../../types/complaints/incident";
import { useWeeklyForwardedIncidentsStats } from "../../../hooks/useStats";
import { SkeletonCard } from "../../barangay/components/Skeletons";
import { TotalIcon, PendingIcon, ReviewIcon, ResolvedIcon } from "../../barangay/components/Icons";
import { formatCategoryName } from "../../../utils/categoryFormatter";

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

interface DashboardPageProps {
  incidents: Incident[];
  isLoading: boolean;
}

interface WeeklyDataPoint {
  day: string;
  forwarded: number;
  resolved: number;
}

export const LguDashboardPage: React.FC<DashboardPageProps> = ({ incidents, isLoading }) => {

  const stats = useMemo(() => ({
    total: incidents.length,
    pending: incidents.filter(i => 
      i.complaint_clusters[0]?.complaint?.status?.toLowerCase() === 'pending' ||
      i.complaint_clusters[0]?.complaint?.status?.toLowerCase() === 'submitted' ||
      i.complaint_clusters[0]?.complaint?.status?.toLowerCase() === 'forwarded_to_lgu' ||
      i.complaint_clusters[0]?.complaint?.status?.toLowerCase() === 'forwarded_to_department'
    ).length,
    underReview: incidents.filter(i => 
      i.complaint_clusters[0]?.complaint?.status?.toLowerCase() === 'under_review'
    ).length,
    resolved: incidents.filter(i => 
      i.complaint_clusters[0]?.complaint?.status?.toLowerCase() === 'resolved'
    ).length,
  }), [incidents]);

  const recent = [...incidents]
    .sort((a, b) => new Date(b.first_reported_at).getTime() - new Date(a.first_reported_at).getTime())
    .slice(0, 5);

  const { stats: weeklyStats } = useWeeklyForwardedIncidentsStats();

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
        <h1 className="text-2xl font-bold text-gray-900">LGU Dashboard</h1>
        <p className="text-sm text-gray-600 mt-1">Overview of incidents forwarded from barangays</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <StatCard label="Total Forwarded" value={stats.total} color="text-blue-700" bg="bg-blue-50" border="border-blue-100" icon={<TotalIcon />} />
            <StatCard label="Pending" value={stats.pending} color="text-yellow-700" bg="bg-yellow-50" border="border-yellow-100" icon={<PendingIcon />} />
            <StatCard label="Under Review" value={stats.underReview} color="text-indigo-700" bg="bg-indigo-50" border="border-indigo-100" icon={<ReviewIcon />} />
            <StatCard label="Resolved" value={stats.resolved} color="text-green-700" bg="bg-green-50" border="border-green-100" icon={<ResolvedIcon />} />
          </>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-gray-700">Weekly Activity</h2>
          <p className="text-xs text-gray-500 mt-0.5">Incidents forwarded and resolved in the last 7 days</p>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={WEEKLY_DATA} barSize={20} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "12px" }} cursor={{ fill: "#f9fafb" }} />
            <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "12px" }} />
            <Bar dataKey="forwarded" name="Forwarded" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="resolved" name="Resolved" fill="#22c55e" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Recent Forwarded Incidents</h2>
          <span className="text-xs text-gray-500">{incidents.length} total</span>
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
                    <td className="px-5 py-3 text-gray-900 font-medium text-sm truncate max-w-40">{incident.title}</td>
                    <td className="px-5 py-3 text-gray-600 text-sm hidden md:table-cell">{incident.barangay?.barangay_name}</td>
                    <td className="px-5 py-3 text-gray-600 text-sm hidden lg:table-cell">{formatCategoryName(incident.category?.category_name)}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold
                        ${incident.complaint_clusters[0]?.complaint?.status?.toLowerCase() === 'submitted' || incident.complaint_clusters[0]?.complaint?.status?.toLowerCase() === 'forwarded_to_lgu' || incident.complaint_clusters[0]?.complaint?.status?.toLowerCase() === 'forwarded_to_department' ? "bg-yellow-100 text-yellow-800" : ""}
                        ${incident.complaint_clusters[0]?.complaint?.status?.toLowerCase() === 'under_review' ? "bg-blue-100 text-blue-800" : ""}
                        ${incident.complaint_clusters[0]?.complaint?.status?.toLowerCase() === 'resolved' ? "bg-green-100 text-green-800" : ""}
                      `}>
                        {incident.complaint_clusters[0]?.complaint?.status?.toLowerCase() === 'forwarded_to_lgu' || incident.complaint_clusters[0]?.complaint?.status?.toLowerCase() === 'forwarded_to_department' ? "UNRESOLVED" : incident.complaint_clusters[0]?.complaint?.status?.replace("_", " ").toUpperCase() || "N/A"}
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
