// ─── pages/DashboardPage.tsx ──────────────────────────────────────────────────

import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { Complaint, ComplaintStats, WeeklyDataPoint } from "../../../types/complaints/complaint";
import { useWeeklyComplaintStats } from "../../../hooks/useComplaints";

// ── Day mapping ──────────────────────────────────────────────────────────────
const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ── Stat Card Component ──────────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: number;
  color: string;
  bg: string;
  border: string;
  icon: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, color, bg, border, icon }) => (
  <div className={`bg-white rounded-xl border ${border} p-5 flex items-center gap-4 shadow-sm`}>
    <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
      <span className={color}>{icon}</span>
    </div>
    <div>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
      <p className="text-xs text-gray-500 font-medium mt-0.5">{label}</p>
    </div>
  </div>
);

// ── Icons ───────────────────────────────────────────────────────────────────
const TotalIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>;
const PendingIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const ReviewIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>;
const ResolvedIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;

// ── Loading Skeleton ────────────────────────────────────────────────────────
const SkeletonCard = () => (
  <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-4 animate-pulse">
    <div className="w-12 h-12 rounded-xl bg-gray-100 flex-shrink-0" />
    <div className="space-y-2">
      <div className="h-6 w-12 bg-gray-100 rounded" />
      <div className="h-3 w-24 bg-gray-100 rounded" />
    </div>
  </div>
);

// ── Dashboard Props ─────────────────────────────────────────────────────────
interface DashboardPageProps {
  complaints: Complaint[];
  isLoading: boolean;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ complaints, isLoading }) => {
  // Stat cards
  const stats: ComplaintStats = useMemo(() => ({
    total: complaints.length,
    submitted: complaints.filter(c => c.status === "submitted").length,
    underReview: complaints.filter(c => c.status === "under_review").length,
    resolved: complaints.filter(c => c.status === "resolved").length,
  }), [complaints]);

  // Recent complaints
  const recent = [...complaints]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  // Weekly complaint data
  const { data: weeklyStats, isLoading: statsLoading } = useWeeklyComplaintStats();

  const WEEKLY_DATA: WeeklyDataPoint[] = useMemo(() => {
    if (!weeklyStats) return [];

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const today = new Date();

    return Array.from({ length: 7 }).map((_, i) => {
      const date = new Date();
      date.setDate(today.getDate() - (6 - i)); // last 6 days + today
      const iso = date.toISOString().split("T")[0];
      const counts = weeklyStats.daily_counts[iso] || { submitted: 0, resolved: 0 };

      return {
        day: dayNames[date.getDay()],
        submitted: counts.submitted,
        resolved: counts.resolved,
      };
    });
  }, [weeklyStats]);

  return (
    <div className="space-y-6">
      {/* Heading */}
      <div>
        <h1 className="text-xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Overview of complaint activity in Sta. Maria, Laguna</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <StatCard label="Total Complaints" value={stats.total} color="text-blue-700" bg="bg-blue-50" border="border-blue-100" icon={<TotalIcon />} />
            <StatCard label="Submitted" value={stats.submitted} color="text-yellow-700" bg="bg-yellow-50" border="border-yellow-100" icon={<PendingIcon />} />
            <StatCard label="Under Review" value={stats.underReview} color="text-indigo-700" bg="bg-indigo-50" border="border-indigo-100" icon={<ReviewIcon />} />
            <StatCard label="Resolved" value={stats.resolved} color="text-green-700" bg="bg-green-50" border="border-green-100" icon={<ResolvedIcon />} />
          </>
        )}
      </div>

      {/* Weekly Chart */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-gray-700">Weekly Complaint Activity</h2>
          <p className="text-xs text-gray-400 mt-0.5">Complaints submitted vs. resolved this week</p>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={WEEKLY_DATA} barSize={20} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "12px" }} cursor={{ fill: "#f9fafb" }} />
            <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "12px" }} />
            <Bar dataKey="submitted" name="Submitted" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="resolved" name="Resolved" fill="#22c55e" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Recent Complaints */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Recent Complaints</h2>
          <span className="text-xs text-gray-400">{complaints.length} total</span>
        </div>
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Title</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Category</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recent.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-3 font-mono text-xs text-gray-400">#{c.id}</td>
                    <td className="px-5 py-3 text-gray-800 font-medium text-xs truncate max-w-[160px]">{c.title}</td>
                    <td className="px-5 py-3 text-gray-500 text-xs hidden md:table-cell">{c.category?.category_name ?? "—"}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold
                        ${c.status === "submitted" ? "bg-yellow-100 text-yellow-800" : ""}
                        ${c.status === "under_review" ? "bg-blue-100 text-blue-800" : ""}
                        ${c.status === "resolved" ? "bg-green-100 text-green-800" : ""}
                      `}>
                        {c.status === "under_review" ? "Under Review" : c.status.charAt(0).toUpperCase() + c.status.slice(1)}
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