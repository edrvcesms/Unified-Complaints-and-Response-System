import { useNavigate } from "react-router-dom";
import type { Incident } from "../../../types/complaints/incident";
import { Pagination } from "./Pagination";
import { TableSkeleton } from "./Skeletons";
import { formatCategoryName } from "../../../utils/categoryFormatter";
import { useTranslation } from "react-i18next";

interface ScheduledHearingsTableProps {
  incidents: Incident[];
  isLoading: boolean;
  isFetching?: boolean;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const formatDate = (value?: string | Date | null) => {
  if (!value) return "N/A";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "N/A"
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

const formatOrdinal = (value: number) => {
  const remainder = value % 100;
  if (remainder >= 11 && remainder <= 13) return `${value}th`;

  switch (value % 10) {
    case 1:
      return `${value}st`;
    case 2:
      return `${value}nd`;
    case 3:
      return `${value}rd`;
    default:
      return `${value}th`;
  }
};

const formatHearingDate = (incident: Incident, hearingLabel: string) => {
  if (!incident.hearing_date) return "N/A";
  const date = new Date(incident.hearing_date);
  if (Number.isNaN(date.getTime())) return "N/A";
  const hearingNumber = incident.hearing_count || 1;
  return `${formatOrdinal(hearingNumber)} ${hearingLabel}, ${date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })}`;
};

const getReporterName = (incident: Incident) => {
  const reporter = incident.complaint_clusters?.[0]?.complaint?.user;
  if (!reporter) return "N/A";
  const name = `${reporter.first_name || ""} ${reporter.last_name || ""}`.trim();
  return name || reporter.email || "N/A";
};

export const ScheduledHearingsTable: React.FC<ScheduledHearingsTableProps> = ({
  incidents,
  isLoading,
  isFetching = false,
  currentPage,
  totalPages,
  onPageChange,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-3 pt-2 text-[11px] text-gray-500 sm:hidden">
        {t('hearings.swipeHint')}
      </div>
      <div className="overflow-x-auto -mx-2 sm:mx-0">
        <table className="w-full min-w-[820px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-center">
              {[
                  t('hearings.headers.incident'),
                  t('hearings.headers.firstReporter'),
                  t('hearings.headers.barangay'),
                  t('hearings.headers.category'),
                  t('hearings.headers.complaints'),
                  t('hearings.headers.dateReported'),
                  t('hearings.headers.hearingDate'),
              ].map((label) => (
                <th key={label} className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading || isFetching ? (
                <TableSkeleton columns={7} rows={5} />
            ) : incidents.length === 0 ? (
              <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-sm text-gray-500">
                  {t('hearings.noUpcoming')}
                </td>
              </tr>
            ) : (
              incidents.map((incident) => (
                <tr
                  key={incident.id}
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/dashboard/incidents/${incident.id}`)}
                >
                  <td className="px-4 py-3 text-left">
                    <p className="text-sm font-medium text-gray-900">{incident.title}</p>
                    <p className="text-xs text-gray-500">Incident #{incident.id}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 text-center">{getReporterName(incident)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 text-center">{incident.barangay?.barangay_name || "N/A"}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 text-center">{formatCategoryName(incident.category?.category_name)}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 font-semibold text-center">{incident.complaint_count}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 text-center">{formatDate(incident.first_reported_at)}</td>
                  <td className="px-4 py-3 text-sm text-primary-700 font-medium text-center">{formatHearingDate(incident, t('hearings.hearing'))}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} />
    </div>
  );
};