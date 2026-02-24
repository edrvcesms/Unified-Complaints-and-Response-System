import { useTranslation } from 'react-i18next';
import { Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Incident } from "../../../types/complaints/incident";
import { Pagination } from "./Pagination";
import LoadingIndicator from "../../general/LoadingIndicator";
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

export const IncidentTableRow: React.FC<IncidentTableRowProps> = ({
  incident,
}) => {
  const navigate = useNavigate();

  const handleView = () => {
    navigate(`/dashboard/incidents/${incident.id}`);
  };

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      {/* ID */}
      <td className="px-4 py-3 text-xs text-gray-500 font-mono">
        #{incident.id}
      </td>

      {/* Title */}
      <td className="px-4 py-3 text-sm font-medium text-gray-900">
        {incident.title}
      </td>

      {/* Category — hidden on mobile */}
      <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell">
        {formatCategoryName(incident.category?.category_name)}
      </td>

      {/* Severity Level */}
      <td className="px-4 py-3">
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${getSeverityColor(incident.severity_level)}`}
        >
          {incident.severity_level.replace("_", " ")}
        </span>
      </td>

      {/* Complaint Count — hidden on small screens */}
      <td className="px-4 py-3 text-sm text-gray-700 font-semibold hidden sm:table-cell text-center">
        {incident.complaint_count}
      </td>

      {/* View */}
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
    { label: t('incidents.columns.incidentId'), className: "" },
    { label: t('incidents.columns.title'), className: "" },
    { label: t('incidents.columns.category'), className: "hidden md:table-cell" },
    { label: t('incidents.columns.severity'), className: "" },
    { label: t('incidents.columns.complaintCounts'), className: "hidden sm:table-cell text-center" },
    { label: t('incidents.columns.view'), className: "text-center" },
  ];

  return (
  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200 text-left">
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
            <tr>
              <td colSpan={6} className="px-4 py-16 text-center">
                <LoadingIndicator />
              </td>
            </tr>
          ) : incidents.length === 0 ? (
            <tr>
              <td
                colSpan={6}
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

    <Pagination
      currentPage={currentPage}
      totalPages={totalPages}
      onPageChange={onPageChange}
    />
  </div>
  );
};
