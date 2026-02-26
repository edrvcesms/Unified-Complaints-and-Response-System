import { useAllForwardedIncidents } from "../../../hooks/useIncidents";
import { useComplaintsFilter } from "../../../hooks/useFilter";
import { LguIncidentsTable } from "../components/LguIncidentsTable";
import { SearchInput } from "../../barangay/components/SearchInputs";
import { StatusFilterDropdown, SortDropdown } from "../../barangay/components/Filters";
import { ErrorMessage, PageHeader } from "../../general";

export const LguIncidents: React.FC = () => {
  const { incidents, isLoading, error: isError } = useAllForwardedIncidents();

  const {
    search,
    filterStatus,
    sortBy,
    currentPage,
    paginated,
    totalPages,
    handleSearch,
    handleFilterChange,
    handleSortChange,
    setCurrentPage,
  } = useComplaintsFilter(incidents || []);

  if (isError) {
    return <ErrorMessage message="Failed to load forwarded incidents. Please refresh." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Forwarded Incidents"
        description="Review and manage incidents forwarded from barangays"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <SearchInput value={search} onChange={handleSearch} />
        <StatusFilterDropdown current={filterStatus} onChange={handleFilterChange} />
        <SortDropdown current={sortBy} onChange={handleSortChange} />
      </div>

      {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Total Forwarded" value={incidents?.length || 0} />
        <StatCard label="Filtered Results" value={filtered.length} />
        <StatCard label="Current Page" value={`${currentPage} / ${totalPages || 1}`} />
      </div> */}

      <LguIncidentsTable
        incidents={paginated}
        isLoading={isLoading}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
    </div>
  );
};
