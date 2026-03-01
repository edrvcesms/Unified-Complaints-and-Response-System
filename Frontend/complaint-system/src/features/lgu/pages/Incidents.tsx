import { useAllForwardedIncidents } from "../../../hooks/useIncidents";
import { useComplaintsFilter } from "../../../hooks/useFilter";
import { LguIncidentsTable } from "../components/LguIncidentsTable";
import { SearchInput } from "../../general";
import { StatusFilterDropdown, SortDropdown, DateFilter } from "../../barangay/components/Filters";
import { useTranslation } from "react-i18next";
import { ErrorMessage, PageHeader } from "../../general";

export const LguIncidents: React.FC = () => {
  const { incidents, isLoading, error: isError } = useAllForwardedIncidents();
  const { t } = useTranslation();
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
    return <ErrorMessage message="Failed to load forwarded incidents. Please refresh." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Forwarded Incidents"
        description="Review and manage incidents forwarded from barangays"
      />

      {/* Filters */}
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
