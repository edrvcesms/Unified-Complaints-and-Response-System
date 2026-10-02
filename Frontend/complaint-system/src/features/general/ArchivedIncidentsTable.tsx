import { useNavigate } from "react-router-dom";
import type { Incident } from "../../types/complaints/incident";
import { Pagination } from "../barangay/components/Pagination";
import { TableSkeleton } from "../barangay/components/Skeletons";
import { formatCategoryName } from "../../utils/categoryFormatter";
import { getStatusColor } from "../../utils/incidentHelpers";
import { useAuthStore } from "../../store/authStore";
import { useTranslation } from "react-i18next";

const translateStatus = (status: string, t: (key: string) => string) => {
  switch (status.toLowerCase()) {
    case "submitted": return t('status.submitted');
    case "under_review":
    case "reviewed_by_barangay":
    case "reviewed_by_lgu": return t('status.underReview');
    case "forwarded_to_lgu": return t('status.forwarded');
    case "resolved":
      return t('status.resolved');
    case "resolved_by_barangay": return t('status.resolvedByBarangay');
    case "resolved_by_lgu": return t('status.resolvedByLgu');
    case "rejected":
    case "rejected_by_lgu": return t('status.rejected');
    default: return t('status.unknown');
  }
};

interface ArchivedIncidentTableRowProps {
  incident: Incident;
  detailPathBase: string;
}

const ArchivedIncidentTableRow: React.FC<ArchivedIncidentTableRowProps> = ({ incident, detailPathBase }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const userRole = useAuthStore(state => state.userRole);
  const handleView = () => {
    navigate(`${detailPathBase}/${incident.id}`);
  };

  const incidentStatus = incident.complaint_clusters[0]?.complaint?.status || "";

  return (
    <tr className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={handleView}>
      <td className="px-4 py-3 text-xs text-gray-500 font-mono text-center">#{incident.id}</td>
      <td className="px-4 py-3 text-sm font-medium text-gray-900 text-center">{incident.title}</td>
      <td className="px-4 py-3 text-sm text-gray-600 text-center hidden sm:table-cell">{incident.barangay?.barangay_name || "N/A"}</td>
      <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell text-center">{formatCategoryName(incident.category?.category_name)}</td>
      <td className="px-4 py-3 text-center">
        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${getStatusColor(incidentStatus, userRole || undefined)}`}>
          {translateStatus(incidentStatus, t)}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-gray-700 font-semibold hidden sm:table-cell text-center">{incident.complaint_count}</td>
      <td className="px-4 py-3 text-sm text-gray-600 text-center hidden md:table-cell">
        {incident.first_reported_at ? new Date(incident.first_reported_at).toLocaleDateString() : "N/A"}
      </td>
      <td className="px-4 py-3 text-sm text-gray-600 text-center">
        <button
          onClick={handleView}
          className="min-h-9 px-3 py-1 bg-primary-100 text-primary-800 rounded-md text-xs font-medium hover:bg-primary-200 transition-colors"
        >
          {t('incidents.view')}
        </button>
      </td>
    </tr>
  );
};

interface ArchivedIncidentsTableProps {
  incidents: Incident[];
  isLoading: boolean;
  isFetching?: boolean;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  detailPathBase: string;
  emptyMessage?: string;
}

export const ArchivedIncidentsTable: React.FC<ArchivedIncidentsTableProps> = ({
  incidents,
  isLoading,
  isFetching = false,
  currentPage,
  totalPages,
  onPageChange,
  detailPathBase,
  emptyMessage = "No archived incidents found.",
}) => {
  const { t } = useTranslation();
  const TABLE_HEADERS = [
    { label: t('incidents.columns.incidentId'), className: "text-center" },
    { label: t('incidents.columns.title'), className: "text-center" },
    { label: t('table.headers.barangay'), className: "hidden sm:table-cell text-center" },
    { label: t('table.headers.category'), className: "hidden md:table-cell text-center" },
    { label: t('table.headers.status'), className: "text-center" },
    { label: t('table.headers.complaintCounts'), className: "hidden sm:table-cell text-center" },
    { label: t('table.headers.dateReported'), className: "hidden md:table-cell text-center" },
    { label: t('table.headers.action'), className: "text-center" },
  ];

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-3 pt-2 text-[11px] text-gray-500 sm:hidden">
        {t('incidents.swipeHint')}
      </div>
      <div className="overflow-x-auto -mx-2 sm:mx-0">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-center">
              {TABLE_HEADERS.map(({ label, className }) => (
                <th key={label} className={`px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide ${className}`}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {isLoading || isFetching ? (
              <TableSkeleton columns={8} rows={5} />
            ) : incidents.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-16 text-center text-sm text-gray-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              incidents.map((incident) => (
                <ArchivedIncidentTableRow key={incident.id} incident={incident} detailPathBase={detailPathBase} />
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} />
    </div>
  );
};