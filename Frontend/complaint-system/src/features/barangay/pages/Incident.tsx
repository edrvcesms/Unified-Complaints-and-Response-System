import { useTranslation } from 'react-i18next';
import { useIncidents } from "../../../hooks/useIncidents";
import { useComplaintsFilter } from "../../../hooks/useFilter";
import { IncidentsTable } from "../components/IncidentsTable";
import { SearchInput } from "../components/SearchInputs";
import { StatusFilterDropdown, SeverityScoreFilterDropdown, SortDropdown } from "../components/Filters";

export const IncidentPage: React.FC = () => {
  const { t } = useTranslation();
  const { incidents, isLoading, error: isError } = useIncidents();

  const {
    search,
    filterStatus,
    filterSeverityScore,
    sortBy,
    currentPage,
    paginated,
    filtered,
    totalPages,
    handleSearch,
    handleFilterChange,
    handleSeverityScoreFilterChange,
    handleSortChange,
    setCurrentPage,
  } = useComplaintsFilter(incidents || []);

  if (isError) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
        Failed to load incidents. Please refresh.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Heading */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('incidents.manage')}</h1>
        <p className="text-sm text-gray-600 mt-1">
          {t('incidents.viewInstruction')}
        </p>
      </div>

      {/* Filters + Search */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col gap-3">
          <SearchInput value={search} onChange={handleSearch} />
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">{t('incidents.severityLevel')}</label>
              <StatusFilterDropdown current={filterStatus} onChange={handleFilterChange} />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Sort By</label>
              <SortDropdown current={sortBy} onChange={handleSortChange} />
            </div>
            {/* Hidden severity score filter - logic still applies */}
            <div className="hidden">
              <SeverityScoreFilterDropdown 
                current={filterSeverityScore} 
                onChange={handleSeverityScoreFilterChange} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* Table (includes Pagination inside) */}
      <IncidentsTable
        incidents={paginated}
        isLoading={isLoading}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />

      {/* Result count */}
      {!isLoading && (
        <p className="text-xs text-gray-500 text-right">
          Showing {paginated.length} of {filtered.length} incidents
        </p>
      )}
    </div>
  );
};