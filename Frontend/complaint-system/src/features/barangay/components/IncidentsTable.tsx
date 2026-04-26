import { useTranslation } from 'react-i18next';
import { useNavigate } from "react-router-dom";
import type { Incident } from "../../../types/complaints/incident";
import { Pagination } from "./Pagination";
import { SkeletonRow } from "./Skeletons";
import { formatCategoryName } from "../../../utils/categoryFormatter";

interface IncidentTableRowProps {
  incident: Incident;
}

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case "LOW":
      return "bg-green-100 text-green-800";
    case "MEDIUM":
      return "bg-yellow-100 text-yellow-800";
    case "HIGH":
      return "bg-orange-100 text-orange-800";
    case "VERY_HIGH":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case "resolved":
    case "resolved_by_department":
    case "resolved_by_barangay":
      return "bg-green-100 text-green-800";
    case "under_review":
    case "reviewed_by_department":
    case "reviewed_by_barangay":
      return "bg-primary-100 text-primary-800";
    case "submitted":
      return "bg-yellow-100 text-yellow-800";
    case "in_progress":
      return "bg-orange-100 text-orange-800";
    case "pending":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const formatStatus = (status: string) => {
  if (!status) return "N/A";
  const lowerStatus = status.toLowerCase();

  if (lowerStatus === 'forwarded_to_lgu' || lowerStatus === 'forwarded_to_department') {
    return "FORWARDED";
  }

  if (lowerStatus === 'resolved_by_department' || lowerStatus === 'resolved_by_barangay') {
    return "RESOLVED";
  }

  if (lowerStatus === 'reviewed_by_department' || lowerStatus === 'reviewed_by_barangay') {
    return "UNDER REVIEW";
  }

  return status.replace("_", " ").toUpperCase();
};

export const IncidentTableRow: React.FC<IncidentTableRowProps> = ({
  incident,
}) => {
  const navigate = useNavigate();

  const handleView = () => {
    navigate(`/dashboard/incidents/${incident.id}`);
  };

  const hasNewComplaints = incident.has_new_complaints || (incident.new_complaint_count ?? 0) > 0;

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3 text-xs text-gray-500 font-mono text-center">
        #{incident.id}
      </td>

      <td className="px-4 py-3 text-sm font-medium text-gray-900 text-center">
        <div className="flex items-center justify-center gap-2">
          <div className="truncate max-w-[11rem] sm:max-w-sm md:max-w-md" title={incident.title}>
            {incident.title}
          </div>
    {hasNewComplaints && incident.new_complaint_count && incident.new_complaint_count > 0 && (
  <div className="relative flex items-center justify-center shrink-0" title={`${incident.new_complaint_count} new complaint${incident.new_complaint_count > 1 ? 's' : ''}`}>
    <span className="animate-ping absolute inline-flex h-6 w-6 rounded-full bg-orange-400 opacity-50" />
    <span className="relative flex items-center justify-center w-5 h-5 rounded-full bg-orange-500 text-white text-xs font-bold">
      {incident.new_complaint_count}
    </span>
  </div>
)}
        </div>
      </td>

      <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell text-center">
        {formatCategoryName(incident.category?.category_name)}
      </td>

      <td className="px-4 py-3 text-center">
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${getSeverityColor(incident.severity_level)}`}
        >
          {incident.severity_level.replace("_", " ")}
        </span>
      </td>

      <td className="px-4 py-3 text-center">
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${getStatusColor(incident.complaint_clusters[0]?.complaint?.status || "")}`}
        >
          {formatStatus(incident.complaint_clusters[0]?.complaint?.status || "")}
        </span>
      </td>

      <td className="px-4 py-3 text-sm text-gray-700 font-semibold hidden sm:table-cell text-center">
        {incident.complaint_count}
      </td>

      <td className="px-4 py-3 text-center">
        <button
          onClick={handleView}
          className="min-h-9 px-3 py-1 bg-primary-100 text-primary-800 rounded-md text-xs font-medium hover:bg-primary-200 transition-colors"
        >
          View
        </button>
      </td>
    </tr>
  );
};

interface IncidentsTableProps {
  incidents: Incident[];
  isLoading: boolean;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const IncidentsTable: React.FC<IncidentsTableProps> = ({
  incidents,
  isLoading,
  currentPage,
  totalPages,
  onPageChange,
}) => {
  const { t } = useTranslation();

  const TABLE_HEADERS = [
    { label: t('incidents.columns.incidentId'), className: "text-center" },
    { label: t('incidents.columns.title'), className: "text-center" },
    { label: t('incidents.columns.category'), className: "hidden md:table-cell text-center" },
    { label: t('incidents.columns.severity'), className: "text-center" },
    { label: t('incidents.columns.status'), className: "text-center" },
    { label: t('incidents.columns.complaintCounts'), className: "hidden sm:table-cell text-center" },
    { label: t('incidents.columns.view'), className: "text-center" },
  ];

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-3 pt-2 text-[11px] text-gray-500 sm:hidden">
        Swipe horizontally to view all columns.
      </div>
      <div className="overflow-x-auto -mx-2 sm:mx-0">
        <div className="inline-block min-w-full align-middle">
          <div className="overflow-hidden">
            <table className="w-full min-w-[680px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-center">
                  {TABLE_HEADERS.map(({ label, className }) => (
                    <th
                      key={label}
                      className={`px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide ${className}`}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  <>
                    <SkeletonRow columns={7} />
                    <SkeletonRow columns={7} />
                    <SkeletonRow columns={7} />
                    <SkeletonRow columns={7} />
                    <SkeletonRow columns={7} />
                  </>
                ) : incidents.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-16 text-center text-sm text-gray-500"
                    >
                      No incidents found.
                    </td>
                  </tr>
                ) : (
                  incidents.map((incident) => (
                    <IncidentTableRow key={incident.id} incident={incident} />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />
    </div>
  );
};
