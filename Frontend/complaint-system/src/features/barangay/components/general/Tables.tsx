import { Eye } from "lucide-react";
import { StatusBadge } from "../complaints/StatusBadge";
import type { Complaint } from "../../../../types/complaints/complaint";
import { Pagination } from "../complaints/Pagination";
import { SkeletonRow } from "./Skeletons";

interface ComplaintTableRowProps {
  complaint: Complaint;
  onView: (id: number) => void;
}

export const ComplaintTableRow: React.FC<ComplaintTableRowProps> = ({
  complaint,
  onView,
}) => (
  <tr className="hover:bg-blue-50/30 transition">
    {/* ID */}
    <td className="px-4 py-3 text-xs text-gray-400 font-mono">
      #{complaint.id}
    </td>

    {/* Title */}
    <td className="px-4 py-3 text-xs font-medium text-gray-800 truncate">
      {complaint.title}
    </td>

    {/* Complainant — hidden on mobile */}
    <td className="px-4 py-3 text-xs text-gray-600 hidden md:table-cell">
      {complaint.user
        ? `${complaint.user.first_name} ${complaint.user.last_name}`
        : "—"}
    </td>

    {/* Status */}
    <td className="px-4 py-3">
      <StatusBadge status={complaint.status} />
    </td>

    {/* Date — hidden on small screens */}
    <td className="px-4 py-3 text-xs text-gray-500 hidden sm:table-cell">
      {new Date(complaint.created_at).toLocaleDateString("en-PH")}
    </td>

    {/* View */}
    <td className="px-4 py-3 text-center">
      <button
        className="inline-flex items-center justify-center w-8 h-8 rounded-lg
          text-blue-600 hover:bg-blue-100 transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 focus:ring-offset-white"
      >
        <Eye size={18} />
      </button>
    </td>
  </tr>
);


interface ComplaintsTableProps {
  complaints: Complaint[];
  isLoading: boolean;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onView: (id: number) => void;
}

const TABLE_HEADERS = [
  { label: "ID", className: "" },
  { label: "Title", className: "" },
  { label: "Complainant", className: "hidden md:table-cell" },
  { label: "Status", className: "" },
  { label: "Date", className: "hidden sm:table-cell" },
  { label: "View", className: "text-center" },
];

export const ComplaintsTable: React.FC<ComplaintsTableProps> = ({
  complaints,
  isLoading,
  currentPage,
  totalPages,
  onPageChange,
}) => (
  <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100 text-left">
            {TABLE_HEADERS.map(({ label, className }) => (
              <th
                key={label}
                className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase ${className}`}
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-50">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
          ) : complaints.length === 0 ? (
            <tr>
              <td
                colSpan={6}
                className="px-4 py-12 text-center text-sm text-gray-400"
              >
                No complaints found.
              </td>
            </tr>
          ) : (
            complaints.map((complaint) => (
              <ComplaintTableRow
                key={complaint.id}
                complaint={complaint}
              />
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