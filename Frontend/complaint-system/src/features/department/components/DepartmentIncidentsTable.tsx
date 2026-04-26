import { Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Incident } from "../../../types/complaints/incident";
import { Pagination } from "../../barangay/components/Pagination";
import { SkeletonRow } from "../../barangay/components/Skeletons";
import { formatCategoryName } from "../../../utils/categoryFormatter";
import { getSeverityColor, getStatusColor, formatStatus } from "../../../utils/incidentHelpers";
import { useAuthStore } from "../../../store/authStore";

interface DepartmentIncidentTableRowProps {
  incident: Incident;
}

const DepartmentIncidentTableRow: React.FC<DepartmentIncidentTableRowProps> = ({ incident }) => {
  const navigate = useNavigate();
  const userRole = useAuthStore(state => state.userRole);

  const handleView = () => {
    navigate(`/department/incidents/${incident.id}`);
  };

  const incidentStatus = incident.complaint_clusters[0]?.complaint?.status || "";

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3 text-xs text-gray-500 font-mono text-center">
        #{incident.id}
      </td>
      <td className="px-4 py-3 text-sm font-medium text-gray-900 text-center">
        <span className="block truncate max-w-[11rem] sm:max-w-sm" title={incident.title}>
          {incident.title}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-gray-600 text-center hidden sm:table-cell">
        {incident.barangay?.barangay_name || "N/A"}
      </td>
      <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell text-center">
        {formatCategoryName(incident.category?.category_name)}
      </td>
      <td className="px-4 py-3 text-center">
        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${getSeverityColor(incident.severity_level)}`}>
          {incident.severity_level.replace("_", " ")}
        </span>
      </td>
      <td className="px-4 py-3 text-center">
        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${getStatusColor(incidentStatus, userRole || undefined)}`}>
          {formatStatus(incidentStatus, userRole || undefined)}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-gray-700 font-semibold hidden sm:table-cell text-center">
        {incident.complaint_count}
      </td>
      <td className="px-4 py-3 text-center">
        <button
          onClick={handleView}
          className="inline-flex items-center justify-center w-9 h-9 rounded-md text-primary-600 hover:bg-primary-50 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <Eye size={16} />
        </button>
      </td>
    </tr>
  );
};

interface DepartmentIncidentsTableProps {
  incidents: Incident[];
  isLoading: boolean;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const DepartmentIncidentsTable: React.FC<DepartmentIncidentsTableProps> = ({
  incidents,
  isLoading,
  currentPage,
  totalPages,
  onPageChange,
}) => {
  const TABLE_HEADERS = [
    { label: "Incident ID", className: "text-center" },
    { label: "Title", className: "text-center" },
    { label: "Barangay", className: "hidden sm:table-cell text-center" },
    { label: "Category", className: "hidden md:table-cell text-center" },
    { label: "Severity", className: "text-center" },
    { label: "Status", className: "text-center" },
    { label: "Complaints", className: "hidden sm:table-cell text-center" },
    { label: "Actions", className: "text-center" },
  ];

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-3 pt-2 text-[11px] text-gray-500 sm:hidden">
        Swipe horizontally to view all columns.
      </div>
      <div className="overflow-x-auto -mx-2 sm:mx-0">
        <table className="w-full min-w-[700px]">
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
                <td colSpan={8} className="px-4 py-16 text-center text-sm text-gray-500">
                  No assigned incidents found.
                </td>
              </tr>
            ) : (
              incidents.map((incident) => (
                <DepartmentIncidentTableRow key={incident.id} incident={incident} />
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
