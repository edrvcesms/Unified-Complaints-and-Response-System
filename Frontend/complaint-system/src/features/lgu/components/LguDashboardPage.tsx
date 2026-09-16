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
import {
  useWeeklyForwardedIncidentsStats,
  useMonthlyForwardedIncidentsStats,
  useYearlyForwardedIncidentsStats,
  useComplaintCountsByBarangayCategory,
} from "../../../hooks/useStats";
import { SkeletonCard } from "../../barangay/components/Skeletons";
import { PendingIcon, ReviewIcon, ResolvedIcon } from "../../barangay/components/Icons";
import { formatCategoryName } from "../../../utils/categoryFormatter";
import { Download, FileText, LoaderCircle, X } from "lucide-react";
import { generateMunicipalComplaintReport } from "../../../services/lgu/stats";

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

interface ForwardedCounts {
  forwarded?: number;
  resolved?: number;
  under_review?: number;
}

interface ChartRow {
  label: string;
  forwarded: number;
  resolved: number;
  under_review: number;
}

type Period = "weekly" | "monthly" | "yearly";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// ─── Transform helpers ─────────────────────────────────────────────────────

function transformWeekly(dailyCounts: Record<string, ForwardedCounts> | undefined): ChartRow[] {
  if (!dailyCounts) return [];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const today = new Date();

  return Array.from({ length: 7 }).map((_, i) => {
    const date = new Date();
    date.setDate(today.getDate() - (6 - i));
    const iso = date.toISOString().split("T")[0];
    const counts = dailyCounts[iso] || {};

    return {
      label: dayNames[date.getDay()],
      forwarded: counts.forwarded ?? 0,
      resolved: counts.resolved ?? 0,
      under_review: counts.under_review ?? 0,
    };
  });
}

function transformMonthly(dailyCounts: Record<string, ForwardedCounts> | undefined): ChartRow[] {
  if (!dailyCounts) return [];

  return Object.keys(dailyCounts)
    .sort()
    .map((dateStr) => {
      const counts = dailyCounts[dateStr] || {};
      const day = dateStr.split("-")[2];

      return {
        label: day,
        forwarded: counts.forwarded ?? 0,
        resolved: counts.resolved ?? 0,
        under_review: counts.under_review ?? 0,
      };
    });
}

function transformYearly(monthlyCounts: Record<string, ForwardedCounts> | undefined): ChartRow[] {
  if (!monthlyCounts) return [];

  return MONTH_ABBR.map((m) => {
    const counts = monthlyCounts[m] || {};
    return {
      label: m,
      forwarded: counts.forwarded ?? 0,
      resolved: counts.resolved ?? 0,
      under_review: counts.under_review ?? 0,
    };
  });
}

// ─── Period Selector ────────────────────────────────────────────────────────

interface PeriodSelectorProps {
  period: Period;
  onChange: (p: Period) => void;
  year: number;
  month: number;
  onYearChange: (y: number) => void;
  onMonthChange: (m: number) => void;
}

function PeriodSelector({
  period, onChange,
  year, month, onYearChange, onMonthChange,
}: PeriodSelectorProps) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="flex flex-wrap items-center gap-2">
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

// ─── Main Component ─────────────────────────────────────────────────────────

export const LguDashboardPage: React.FC<DashboardPageProps> = ({ incidents, isLoading }) => {
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const today = new Date();
  const [reportFromDate, setReportFromDate] = useState(`${today.getFullYear()}-01-01`);
  const [reportToDate, setReportToDate] = useState(formatDateInput(today));
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [isReportLoading, setIsReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportUrl, setReportUrl] = useState<string | null>(null);
  const [reportFileName, setReportFileName] = useState("municipal-complaint-report.pdf");
  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;

  const recent = [...incidents]
    .sort((a, b) => new Date(b.first_reported_at).getTime() - new Date(a.first_reported_at).getTime())
    .slice(0, 5);

  // Period state for the forwarded-incidents chart
  const now = new Date();
  const [period, setPeriod] = useState<Period>("weekly");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const weekly = useWeeklyForwardedIncidentsStats();
  const monthly = useMonthlyForwardedIncidentsStats(year, month);
  const yearly = useYearlyForwardedIncidentsStats(year);

  const activeQuery = period === "weekly" ? weekly : period === "monthly" ? monthly : yearly;
  const { stats: forwardedStats, isLoading: forwardedLoading } = activeQuery;

  const { stats: categoryStats, isLoading: isCategoryLoading } = useComplaintCountsByBarangayCategory();

  const PERIOD_DATA: ChartRow[] = useMemo(() => {
    if (!forwardedStats) return [];

    if (period === "weekly") {
      return transformWeekly((forwardedStats as { daily_counts?: Record<string, ForwardedCounts> }).daily_counts);
    }
    if (period === "monthly") {
      return transformMonthly((forwardedStats as { daily_counts?: Record<string, ForwardedCounts> }).daily_counts);
    }
    return transformYearly((forwardedStats as { monthly_counts?: Record<string, ForwardedCounts> }).monthly_counts);
  }, [forwardedStats, period]);

  const stats = useMemo(() => {
    if (PERIOD_DATA.length > 0) {
      return PERIOD_DATA.reduce(
        (acc, row) => ({
          forwardedToLgu: acc.forwardedToLgu + row.forwarded,
          reviewedByLgu: acc.reviewedByLgu + row.under_review,
          resolvedByLgu: acc.resolvedByLgu + row.resolved,
        }),
        {
          forwardedToLgu: 0,
          reviewedByLgu: 0,
          resolvedByLgu: 0,
        }
      );
    }

    return {
      forwardedToLgu: incidents.filter(
        (i) => i.complaint_clusters[0]?.complaint?.status?.toLowerCase() === "forwarded_to_lgu"
      ).length,
      reviewedByLgu: incidents.filter(
        (i) => i.complaint_clusters[0]?.complaint?.status?.toLowerCase() === "reviewed_by_lgu"
      ).length,
      resolvedByLgu: incidents.filter(
        (i) => i.complaint_clusters[0]?.complaint?.status?.toLowerCase() === "resolved_by_lgu"
      ).length,
    };
  }, [PERIOD_DATA, incidents]);


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

  const forwardedChartData = {
    labels: PERIOD_DATA.map((row) => row.label),
    datasets: [
      { label: "Forwarded to LGU", data: PERIOD_DATA.map((row) => row.forwarded), backgroundColor: "#3b82f6", borderRadius: 4 },
      { label: "Reviewed by LGU", data: PERIOD_DATA.map((row) => row.under_review), backgroundColor: "#6366f1", borderRadius: 4 },
      { label: "Resolved by LGU", data: PERIOD_DATA.map((row) => row.resolved), backgroundColor: "#22c55e", borderRadius: 4 },
    ],
  };

  const forwardedChartOptions: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        maxHeight: isMobile ? 90 : 120,
        labels: {
          font: { size: isMobile ? 10 : 14 },
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
        ticks: { color: "#9ca3af", font: { size: isMobile ? 11 : 15 }, maxRotation: isMobile ? 0 : 45 },
        grid: { display: false },
      },
      y: {
        beginAtZero: true,
        ticks: { color: "#9ca3af", font: { size: isMobile ? 11 : 15 }, precision: 0 },
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
        maxHeight: isMobile ? 96 : 120,
        labels: {
          font: { size: isMobile ? 10 : 13 },
          boxWidth: isMobile ? 10 : 14,
          boxHeight: isMobile ? 10 : 14,
          usePointStyle: true,
          pointStyle: "rectRounded",
          padding: isMobile ? 8 : 10,
        },
      },
      tooltip: {
        backgroundColor: "#111827",
      },
    },
    scales: {
      x: {
        stacked: true,
        ticks: { color: "#9ca3af", font: { size: isMobile ? 10 : 14 }, maxRotation: isMobile ? 0 : 25, minRotation: isMobile ? 0 : 25 },
        grid: { display: false },
      },
      y: {
        stacked: true,
        beginAtZero: true,
        ticks: { color: "#9ca3af", font: { size: isMobile ? 11 : 15 }, precision: 0 },
        grid: { color: "#f0f0f0" },
      },
    },
  };

  const handleGenerateReport = async () => {
    if (!reportFromDate || !reportToDate) {
      setReportError("Please select both a start date and an end date.");
      return;
    }
    if (reportFromDate > reportToDate) {
      setReportError("The start date must not be after the end date.");
      return;
    }

    setIsReportLoading(true);
    setReportError(null);
    try {
      const reportBlob = await generateMunicipalComplaintReport(reportFromDate, reportToDate);
      if (reportUrl) URL.revokeObjectURL(reportUrl);
      setReportUrl(URL.createObjectURL(reportBlob));
      setReportFileName(`municipal-complaint-report-${reportFromDate}-to-${reportToDate}.pdf`);
      setIsReportDialogOpen(false);
    } catch (error) {
      const responseData = (error as { response?: { data?: Blob | { detail?: string } } })?.response?.data;
      let responseDetail = typeof responseData === "object" && responseData && "detail" in responseData
        ? responseData.detail
        : undefined;
      if (!responseDetail && responseData instanceof Blob) {
        try {
          const parsed = JSON.parse(await responseData.text()) as { detail?: string };
          responseDetail = parsed.detail;
        } catch {
          responseDetail = undefined;
        }
      }
      setReportError(responseDetail || "Unable to generate the report. Please try again.");
    } finally {
      setIsReportLoading(false);
    }
  };

  const closeReportPreview = () => {
    if (reportUrl) URL.revokeObjectURL(reportUrl);
    setReportUrl(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('dashboard.lgu.title')}</h1>
        <p className="text-base text-gray-600 mt-1">{t('dashboard.lgu.description')}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <StatCard label="Forwarded to LGU" value={stats.forwardedToLgu} color="text-yellow-700" bg="bg-yellow-50" border="border-yellow-100" icon={<PendingIcon />} />
            <StatCard label="Reviewed by LGU" value={stats.reviewedByLgu} color="text-indigo-700" bg="bg-indigo-50" border="border-indigo-100" icon={<ReviewIcon />} />
            <StatCard label="Resolved by LGU" value={stats.resolvedByLgu} color="text-green-700" bg="bg-green-50" border="border-green-100" icon={<ResolvedIcon />} />
          </>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-700">{t('dashboard.lgu.weeklyTitle')}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{t('dashboard.lgu.weeklyDescription')}</p>
          </div>
          <PeriodSelector
            period={period}
            onChange={setPeriod}
            year={year}
            month={month}
            onYearChange={setYear}
            onMonthChange={setMonth}
          />
        </div>
        {forwardedLoading ? (
          <div className="h-72 bg-gray-100 rounded animate-pulse" />
        ) : (
          <div className="w-full h-[22rem] sm:h-[300px]">
            <ChartJsBar data={forwardedChartData} options={forwardedChartOptions} />
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-700">{t('dashboard.lgu.categoryBreakdownTitle')}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{t('dashboard.lgu.categoryBreakdownDescription')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
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
            <button
              type="button"
              onClick={() => { setReportError(null); setIsReportDialogOpen(true); }}
              className="inline-flex items-center gap-2 rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary-700"
            >
              <FileText size={16} aria-hidden="true" />
              Generate Report
            </button>
          </div>
        </div>
        {isCategoryLoading ? (
          <div className="h-60 bg-gray-100 rounded animate-pulse" />
        ) : (
          <div className="w-full h-[24rem] sm:h-[340px]">
            <ChartJsBar data={categoryChartData} options={categoryChartOptions} />
          </div>
        )}
      </div>

      {isReportDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="report-dialog-title">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="report-dialog-title" className="text-lg font-semibold text-gray-900">Generate municipal report</h2>
                <p className="mt-1 text-sm text-gray-500">Choose the reporting period for all barangays.</p>
              </div>
              <button type="button" onClick={() => setIsReportDialogOpen(false)} className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700" aria-label="Close report dialog">
                <X size={20} />
              </button>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-gray-700">
                From date
                <input type="date" value={reportFromDate} onChange={(event) => setReportFromDate(event.target.value)} className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 font-normal text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </label>
              <label className="text-sm font-medium text-gray-700">
                To date
                <input type="date" value={reportToDate} onChange={(event) => setReportToDate(event.target.value)} className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 font-normal text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </label>
            </div>
            {reportError && <p className="mt-3 text-sm text-red-600" role="alert">{reportError}</p>}
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setIsReportDialogOpen(false)} className="rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
              <button type="button" onClick={handleGenerateReport} disabled={isReportLoading} className="inline-flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60">
                {isReportLoading && <LoaderCircle size={16} className="animate-spin" />}
                {isReportLoading ? "Generating..." : "Generate PDF"}
              </button>
            </div>
          </div>
        </div>
      )}

      {reportUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="report-preview-title">
          <div className="flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 sm:px-5">
              <h2 id="report-preview-title" className="text-base font-semibold text-gray-900">Municipal complaint report</h2>
              <div className="flex items-center gap-2">
                <a href={reportUrl} download={reportFileName} className="inline-flex items-center gap-2 rounded-md bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700">
                  <Download size={16} aria-hidden="true" />
                  Download PDF
                </a>
                <button type="button" onClick={closeReportPreview} className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800" aria-label="Close report preview">
                  <X size={20} />
                </button>
              </div>
            </div>
            <iframe src={reportUrl} title="Municipal complaint report PDF preview" className="min-h-0 flex-1 bg-gray-100" />
          </div>
        </div>
      )}

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
                        ${incident.complaint_clusters[0]?.complaint?.status?.toLowerCase() === 'forwarded_to_lgu' ? "bg-blue-100 text-blue-800" : ""}
                        ${incident.complaint_clusters[0]?.complaint?.status?.toLowerCase() === 'under_review' || incident.complaint_clusters[0]?.complaint?.status?.toLowerCase() === 'reviewed_by_lgu' ? "bg-yellow-100 text-yellow-800" : ""}
                        ${incident.complaint_clusters[0]?.complaint?.status?.toLowerCase() === 'resolved' || incident.complaint_clusters[0]?.complaint?.status?.toLowerCase() === 'resolved_by_lgu' ? "bg-green-100 text-green-800" : ""}
                      `}>
                        {incident.complaint_clusters[0]?.complaint?.status?.toLowerCase() === 'forwarded_to_lgu' ? "FORWARDED" : 
                         incident.complaint_clusters[0]?.complaint?.status?.toLowerCase() === 'resolved_by_lgu' ? "RESOLVED" :
                         incident.complaint_clusters[0]?.complaint?.status?.toLowerCase() === 'reviewed_by_lgu' ? "UNDER REVIEW" :
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