import { useTranslation } from 'react-i18next';
import { Eye } from "lucide-react";
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
      return "bg-green-100 text-green-800";
    case "under_review":
      return "bg-blue-100 text-blue-800";
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
  return status.replace("_", " ").toUpperCase();
};

export const IncidentTableRow: React.FC<IncidentTableRowProps> = ({
  incident,
}) => {
  const navigate = useNavigate();

  const handleView = () => {
    navigate(`/dashboard/incidents/${incident.id}`);
  };

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3 text-xs text-gray-500 font-mono text-center">
        #{incident.id}
      </td>

      <td className="px-4 py-3 text-sm font-medium text-gray-900 text-center">
        <div className="truncate max-w-[150px] sm:max-w-xs md:max-w-sm mx-auto" title={incident.title}>
          {incident.title}
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
          className="inline-flex items-center justify-center w-8 h-8 rounded-md text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <Eye size={16} />
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
    <div className="overflow-x-auto -mx-4 sm:mx-0">
      <div className="inline-block min-w-full align-middle">
        <div className="overflow-hidden">
      <table className="w-full">
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
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
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
