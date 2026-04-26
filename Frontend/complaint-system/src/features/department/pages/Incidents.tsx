import { useAssignedIncidents } from "../../../hooks/useDepartment";
import { useTranslation } from "react-i18next";
import { useComplaintsFilter } from "../../../hooks/useFilter";
import { DepartmentIncidentsTable } from "../components/DepartmentIncidentsTable";
import { SearchInput } from "../../general";
import { StatusFilterDropdown, SortDropdown, DateFilter } from "../../barangay/components/Filters";
import { ErrorMessage, PageHeader } from "../../general";

export const DepartmentIncidents: React.FC = () => {
  const { t } = useTranslation();
  const { incidents, isLoading, error: isError } = useAssignedIncidents();
  const manageIncidents = (incidents || []).filter((incident) => {
    const incidentStatus = incident.complaint_clusters[0]?.complaint?.status || incident.status;
    return incidentStatus !== "forwarded_to_lgu";
  });

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
  } = useComplaintsFilter(manageIncidents);

  if (isError) {
    return <ErrorMessage message={t('frontend.incidents.loadAssignedFailed')} />;
  }

  return (
    <div className="space-y-3">
      <PageHeader 
        title={t('frontend.incidents.assignedTitle')}
        description={t('frontend.incidents.assignedDescription')}
      />

      {/* Search */}
      <div>
        <SearchInput value={search} onChange={handleSearch} />
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full lg:w-auto">
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className="text-sm font-medium text-gray-700">{t('frontend.filters.severityLevel')}</label>
            <StatusFilterDropdown current={filterStatus} onChange={handleFilterChange} />
          </div>
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className="text-sm font-medium text-gray-700">{t('frontend.filters.sortBy')}</label>
            <SortDropdown current={sortBy} onChange={handleSortChange} />
          </div>
        </div>

        <div className="w-full lg:w-auto">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('frontend.filters.dateRange')}</label>
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

      <DepartmentIncidentsTable
        incidents={paginated}
        isLoading={isLoading}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
    </div>
  );
};

export default DepartmentIncidents;
