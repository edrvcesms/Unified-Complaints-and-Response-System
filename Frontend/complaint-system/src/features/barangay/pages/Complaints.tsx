import { useComplaints } from "../../../hooks/useComplaints";
import { useComplaintsFilter } from "../../../hooks/useFilter";
import { ComplaintsTable } from "../components/general/Tables";
import { SearchInput } from "../components/general/SearchInputs";
import { StatusFilterPills } from "../components/general/Filters";

export const ComplaintsPage: React.FC = () => {
  const { data: complaints = [], isLoading, isError } = useComplaints();

  const {
    search,
    filterStatus,
    currentPage,
    paginated,
    filtered,
    totalPages,
    handleSearch,
    handleFilterChange,
    setCurrentPage,
  } = useComplaintsFilter(complaints);

  if (isError) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
        Failed to load complaints. Please refresh.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Heading */}
      <div>
        <h1 className="text-xl font-bold text-gray-800">Manage Complaints</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Click the view icon to review details and manage status.
        </p>
      </div>

      {/* Filters + Search */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4
        flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <StatusFilterPills current={filterStatus} onChange={handleFilterChange} />
        <SearchInput value={search} onChange={handleSearch} />
      </div>

      {/* Table (includes Pagination inside) */}
      <ComplaintsTable
        complaints={paginated}
        isLoading={isLoading}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />

      {/* Result count */}
      {!isLoading && (
        <p className="text-xs text-gray-400 text-right">
          Showing {paginated.length} of {filtered.length} complaints
        </p>
      )}
    </div>
  );
};