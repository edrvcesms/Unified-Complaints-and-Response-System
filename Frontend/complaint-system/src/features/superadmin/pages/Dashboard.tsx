import { useQuery } from "@tanstack/react-query";
import { Bar } from "react-chartjs-2";
import { BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Tooltip } from "chart.js";
import { Users, UserRound, Building2, Landmark } from "lucide-react";
import { superAdminInstance } from "../../../services/axios/apiServices";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

interface RegistrationPoint { period: string; count: number; }
interface UserStats {
  total_users: number;
  role_counts: { user: number; barangay_official: number; lgu_official: number };
  registrations: { week: RegistrationPoint[]; month: RegistrationPoint[]; year: RegistrationPoint[] };
}

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
};

function chartData(points: RegistrationPoint[], period: "week" | "month" | "year") {
  return {
    labels: points.map(({ period: value }) => {
      const date = new Date(value);
      return period === "week"
        ? date.toLocaleDateString("en-US", { weekday: "short" })
        : period === "month"
          ? date.toLocaleDateString("en-US", { day: "numeric" })
          : date.toLocaleDateString("en-US", { month: "short" });
    }),
    datasets: [{ data: points.map(({ count }) => count), backgroundColor: "#2563eb", borderRadius: 5, maxBarThickness: 36 }],
  };
}

const cards = [
  { key: "user" as const, label: "Residents", icon: <UserRound className="h-5 w-5" />, color: "text-blue-700", bg: "bg-blue-50" },
  { key: "barangay_official" as const, label: "Barangay Officials", icon: <Building2 className="h-5 w-5" />, color: "text-emerald-700", bg: "bg-emerald-50" },
  { key: "lgu_official" as const, label: "LGU Officials", icon: <Landmark className="h-5 w-5" />, color: "text-amber-700", bg: "bg-amber-50" },
];

export const SuperAdminDashboard: React.FC = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["superadmin", "user-registration-stats"],
    queryFn: async () => (await superAdminInstance.get<UserStats>("/stats/user-registrations")).data,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Super Admin Dashboard</h1>
        <p className="mt-1 text-base text-gray-600">User registration and account overview.</p>
      </div>
      {error && <p className="rounded-lg bg-red-50 p-4 text-sm text-red-700">Failed to load user statistics.</p>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-5">
          <div className="rounded-lg bg-gray-100 p-3 text-gray-700"><Users className="h-5 w-5" /></div>
          <div><p className="text-3xl font-bold text-gray-900">{isLoading ? "-" : data?.total_users ?? 0}</p><p className="text-sm font-medium text-gray-600">Total Users</p></div>
        </div>
        {cards.map((card) => (
          <div key={card.key} className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-5">
            <div className={`rounded-lg p-3 ${card.bg} ${card.color}`}>{card.icon}</div>
            <div><p className="text-3xl font-bold text-gray-900">{isLoading ? "-" : data?.role_counts[card.key] ?? 0}</p><p className="text-sm font-medium text-gray-600">{card.label}</p></div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {(["week", "month", "year"] as const).map((period) => (
          <section key={period} className="rounded-lg border border-gray-200 bg-white p-5">
            <h2 className="text-base font-semibold text-gray-800">Registrations This {period === "week" ? "Week" : period === "month" ? "Month" : "Year"}</h2>
            <div className="mt-4 h-64">
              {isLoading ? <div className="h-full animate-pulse rounded bg-gray-100" /> : <Bar data={chartData(data?.registrations[period] ?? [], period)} options={chartOptions} />}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};

export default SuperAdminDashboard;