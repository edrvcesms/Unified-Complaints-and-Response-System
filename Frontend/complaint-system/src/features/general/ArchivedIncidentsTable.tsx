
import { useNavigate } from "react-router-dom";
import type { Incident } from "../../types/complaints/incident";
import { Pagination } from "../barangay/components/Pagination";
import { SkeletonRow } from "../barangay/components/Skeletons";
import { formatCategoryName } from "../../utils/categoryFormatter";
import { getSeverityColor, getStatusColor, formatStatus } from "../../utils/incidentHelpers";
import { useAuthStore } from "../../store/authStore";

interface ArchivedIncidentTableRowProps {
  incident: Incident;
  detailPathBase: string;
}

const ArchivedIncidentTableRow: React.FC<ArchivedIncidentTableRowProps> = ({ incident, detailPathBase }) => {
  const navigate = useNavigate();
  const userRole = useAuthStore(state => state.userRole);

  const handleView = () => {
    navigate(`${detailPathBase}/${incident.id}`);
  };

  const incidentStatus = incident.complaint_clusters[0]?.complaint?.status || "";

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3 text-xs text-gray-500 font-mono text-center">#{incident.id}</td>
      <td className="px-4 py-3 text-sm font-medium text-gray-900 text-center">{incident.title}</td>
      <td className="px-4 py-3 text-sm text-gray-600 text-center">{incident.barangay?.barangay_name || "N/A"}</td>
      <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell text-center">{formatCategoryName(incident.category?.category_name)}</td>
      <td className="px-4 py-3 text-center">
        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${getStatusColor(incidentStatus, userRole || undefined)}`}>
          {formatStatus(incidentStatus, userRole || undefined)}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-gray-700 font-semibold hidden sm:table-cell text-center">{incident.complaint_count}</td>
      <td className="px-4 py-3 text-sm text-gray-600 text-center">
        {incident.first_reported_at ? new Date(incident.first_reported_at).toLocaleDateString() : "N/A"}
      </td>
    </tr>
  );
};

interface ArchivedIncidentsTableProps {
  incidents: Incident[];
  isLoading: boolean;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  detailPathBase: string;
  emptyMessage?: string;
}

export const ArchivedIncidentsTable: React.FC<ArchivedIncidentsTableProps> = ({
  incidents,
  isLoading,
  currentPage,
  totalPages,
  onPageChange,
  detailPathBase,
  emptyMessage = "No archived incidents found.",
}) => {
  const TABLE_HEADERS = [
    { label: "Incident ID", className: "text-center" },
    { label: "Title", className: "text-center" },
    { label: "Barangay", className: "text-center" },
    { label: "Category", className: "hidden md:table-cell text-center" },
    { label: "Status", className: "text-center" },
    { label: "Complaints", className: "hidden sm:table-cell text-center" },
    { label: "Date Reported", className: "text-center" },
  ];

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
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
                <td colSpan={7} className="px-4 py-16 text-center text-sm text-gray-500">
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