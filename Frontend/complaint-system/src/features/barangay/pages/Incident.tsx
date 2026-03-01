import { useTranslation } from 'react-i18next';
import { useIncidents } from "../../../hooks/useIncidents";
import { useComplaintsFilter } from "../../../hooks/useFilter";
import { IncidentsTable } from "../components/IncidentsTable";
import { SearchInput } from "../../general";
import { StatusFilterDropdown, SortDropdown, DateFilter } from "../components/Filters";

export const IncidentPage: React.FC = () => {
  const { t } = useTranslation();
  const { incidents, isLoading, error: isError } = useIncidents();

  const {
    search,
    filterStatus,
    sortBy,
    dateFrom,
    dateTo,
    minDate,
    maxDate,
    currentPage,
    paginated,
    filtered,
    totalPages,
    handleSearch,
    handleFilterChange,
    handleSortChange,
    handleDateFromChange,
    handleDateToChange,
    handleClearDateFilter,
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('incidents.manage')}</h1>
        <p className="text-sm text-gray-600 mt-1">
          {t('incidents.viewInstruction')}
        </p>
      </div>

      <div>
        <SearchInput value={search} onChange={handleSearch} />
      </div>

      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">{t('incidents.severityLevel')}</label>
            <StatusFilterDropdown current={filterStatus} onChange={handleFilterChange} />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Sort By</label>
            <SortDropdown current={sortBy} onChange={handleSortChange} />
          </div>
        </div>

        <div className="shrink-0 w-full lg:w-auto">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Date Range</label>
          <DateFilter
            dateFrom={dateFrom}
            dateTo={dateTo}
            minDate={minDate}
            maxDate={maxDate}
            onDateFromChange={handleDateFromChange}
            onDateToChange={handleDateToChange}
            onClear={handleClearDateFilter}
          />
        </div>
      </div>

      <IncidentsTable
        incidents={paginated}
        isLoading={isLoading}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />

      {!isLoading && (
        <p className="text-xs text-gray-500 text-right">
          Showing {paginated.length} of {filtered.length} incidents
        </p>
      )}
    </div>
  );
};