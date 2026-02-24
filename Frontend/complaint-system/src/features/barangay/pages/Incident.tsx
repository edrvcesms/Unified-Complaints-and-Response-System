import { useTranslation } from 'react-i18next';
import { useIncidents } from "../../../hooks/useIncidents";
import { useComplaintsFilter } from "../../../hooks/useFilter";
import { IncidentsTable } from "../components/IncidentsTable";
import { SearchInput } from "../components/SearchInputs";
import { StatusFilterDropdown, SeverityScoreFilterDropdown } from "../components/Filters";

export const IncidentPage: React.FC = () => {
  const { t } = useTranslation();
  const { incidents, isLoading, error: isError } = useIncidents();

  const {
    search,
    filterStatus,
    filterSeverityScore,
    currentPage,
    paginated,
    filtered,
    totalPages,
    handleSearch,
    handleFilterChange,
    handleSeverityScoreFilterChange,
    setCurrentPage,
  } = useComplaintsFilter(incidents || []);

  if (isError) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
        Failed to load incidents. Please refresh.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Heading */}
      <div>
        <h1 className="text-xl font-bold text-gray-800">{t('incidents.manage')}</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {t('incidents.viewInstruction')}
        </p>
      </div>

      {/* Filters + Search */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <SearchInput value={search} onChange={handleSearch} />
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700">{t('incidents.severityLevel')}</label>
            <StatusFilterDropdown current={filterStatus} onChange={handleFilterChange} />
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
        <p className="text-xs text-gray-400 text-right">
          Showing {paginated.length} of {filtered.length} incidents
        </p>
      )}
    </div>
  );
};