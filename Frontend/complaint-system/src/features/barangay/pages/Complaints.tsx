// ─── pages/ComplaintsPage.tsx ─────────────────────────────────────────────────

import { useState, useMemo } from "react";
import type { Complaint } from "../../../types/complaints/complaint";
import { Pagination } from "../components/Pagination";
import { StatusBadge } from "../components/StatusBadge";
import { useReviewComplaint, useResolveComplaint } from "../../../hooks/useComplaints";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ComplaintsPageProps {
  complaints: Complaint[];
  isLoading: boolean;
}

type StatusFilter = "all" | "submitted" | "under_review" | "resolved";

const ITEMS_PER_PAGE = 8;

// ── Action Buttons ────────────────────────────────────────────────────────────
// Shows contextual action buttons based on the complaint's current status

interface ActionButtonsProps {
  complaint: Complaint;
  onReview: (id: number) => void;
  onResolve: (id: number) => void;
  isPending: boolean;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
  complaint,
  onReview,
  onResolve,
  isPending,
}) => {
  if (complaint.status === "resolved") {
    return <span className="text-xs text-gray-400 italic">No actions</span>;
  }

  return (
    <div className="flex items-center gap-1.5">
      {/* Mark as Under Review — available when submitted */}
      {complaint.status === "submitted" && (
        <button
          onClick={() => onReview(complaint.id)}
          disabled={isPending}
          className="px-2.5 py-1 text-xs font-medium rounded-lg bg-blue-50 text-blue-700
            border border-blue-200 hover:bg-blue-100 disabled:opacity-50
            disabled:cursor-not-allowed transition"
        >
          Review
        </button>
      )}

      {/* Mark as Resolved — available when under review */}
      {complaint.status === "under_review" && (
        <button
          onClick={() => onResolve(complaint.id)}
          disabled={isPending}
          className="px-2.5 py-1 text-xs font-medium rounded-lg bg-green-50 text-green-700
            border border-green-200 hover:bg-green-100 disabled:opacity-50
            disabled:cursor-not-allowed transition"
        >
          Resolve
        </button>
      )}
    </div>
  );
};

// ── Loading skeleton row ──────────────────────────────────────────────────────
const SkeletonRow = () => (
  <tr className="animate-pulse">
    {Array.from({ length: 7 }).map((_, i) => (
      <td key={i} className="px-4 py-3">
        <div className="h-4 bg-gray-100 rounded w-full" />
      </td>
    ))}
  </tr>
);

// ── Component ─────────────────────────────────────────────────────────────────

export const ComplaintsPage: React.FC<ComplaintsPageProps> = ({
  complaints,
  isLoading,
}) => {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [filterStatus, setFilterStatus] = useState<StatusFilter>("all");
  const [search, setSearch] = useState<string>("");

  // ── Mutations from React Query ────────────────────────────────────────────
  const { mutate: markAsReview,   isPending: isReviewing  } = useReviewComplaint();
  const { mutate: markAsResolved, isPending: isResolving  } = useResolveComplaint();
  const isActionPending = isReviewing || isResolving;

  // ── Filter + search ───────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return complaints.filter((c) => {
      const matchesStatus = filterStatus === "all" || c.status === filterStatus;
      const q = search.toLowerCase();
      const matchesSearch =
        c.title.toLowerCase().includes(q) ||
        c.user?.first_name?.toLowerCase().includes(q) ||
        c.user?.last_name?.toLowerCase().includes(q)  ||
        c.category?.category_name?.toLowerCase().includes(q)   ||
        c.barangay?.barangay_name?.toLowerCase().includes(q) ||
        String(c.id).includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [complaints, filterStatus, search]);

  const handleFilterChange = (status: StatusFilter) => {
    setFilterStatus(status);
    setCurrentPage(1);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  };

  // ── Pagination ────────────────────────────────────────────────────────────
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated  = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const FILTERS: { label: string; value: StatusFilter }[] = [
    { label: "All",          value: "all"         },
    { label: "Submitted",    value: "submitted"    },
    { label: "Under Review", value: "under_review" },
    { label: "Resolved",     value: "resolved"     },
  ];

  return (
    <div className="space-y-5">
      {/* Heading */}
      <div>
        <h1 className="text-xl font-bold text-gray-800">Manage Complaints</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Review and resolve complaints filed by residents of Sta. Maria, Laguna.
        </p>
      </div>

      {/* ── Filters + Search ── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4
        flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">

        {/* Status filter pills */}
        <div className="flex flex-wrap gap-2">
          {FILTERS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => handleFilterChange(value)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition
                ${filterStatus === value
                  ? "bg-blue-700 text-white shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-60">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400"
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={handleSearch}
            placeholder="Search by name, category, barangay..."
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg
              focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400
              placeholder-gray-400 text-gray-700 bg-gray-50"
          />
        </div>
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-left">
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Title</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Complainant</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Category</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Barangay</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Date</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-gray-400">
                    No complaints match your filters.
                  </td>
                </tr>
              ) : (
                paginated.map((complaint) => (
                  <tr key={complaint.id} className="hover:bg-blue-50/30 transition">

                    {/* ID */}
                    <td className="px-4 py-3 font-mono text-xs text-gray-400 font-medium">
                      #{complaint.id}
                    </td>

                    {/* Title */}
                    <td className="px-4 py-3 max-w-[160px]">
                      <p className="text-xs font-medium text-gray-800 truncate" title={complaint.title}>
                        {complaint.title}
                      </p>
                      {/* Show barangay inline on small screens */}
                      <p className="text-[10px] text-gray-400 lg:hidden">
                        {complaint.barangay?.barangay_name ?? "—"}
                      </p>
                    </td>

                    {/* Complainant — first + last name from user relation */}
                    <td className="px-4 py-3 text-xs text-gray-600 hidden md:table-cell">
                      {complaint.user
                        ? `${complaint.user.first_name} ${complaint.user.last_name}`
                        : "—"
                      }
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3 text-xs text-gray-500 hidden lg:table-cell">
                      {complaint.category?.category_name ?? "—"}
                    </td>

                    {/* Barangay */}
                    <td className="px-4 py-3 text-xs text-gray-500 hidden lg:table-cell">
                      {complaint.barangay?.barangay_name ?? "—"}
                    </td>

                    {/* Status badge */}
                    <td className="px-4 py-3">
                      <StatusBadge status={complaint.status} />
                    </td>

                    {/* Date submitted */}
                    <td className="px-4 py-3 text-xs text-gray-500 hidden sm:table-cell">
                      {new Date(complaint.created_at).toLocaleDateString("en-PH", {
                        year: "numeric", month: "short", day: "numeric",
                      })}
                    </td>

                    {/* Action buttons */}
                    <td className="px-4 py-3">
                      <ActionButtons
                        complaint={complaint}
                        onReview={markAsReview}
                        onResolve={markAsResolved}
                        isPending={isActionPending}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Result count */}
      {!isLoading && (
        <p className="text-xs text-gray-400 text-right">
          Showing {paginated.length} of {filtered.length} complaints
        </p>
      )}
    </div>
  );
};