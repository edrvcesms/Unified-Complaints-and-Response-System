import { useTranslation } from 'react-i18next';
import { useAssignedIncidents } from "../../../hooks/useDepartment";
import { useComplaintsFilter } from "../../../hooks/useFilter";
import { DepartmentIncidentsTable } from "../components/DepartmentIncidentsTable";
import { SearchInput } from "../../general";
import { StatusFilterDropdown, SortDropdown, DateFilter } from "../../barangay/components/Filters";
import { ErrorMessage, PageHeader } from "../../general";

export const DepartmentIncidents: React.FC = () => {
  const { incidents, isLoading, error: isError } = useAssignedIncidents();
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
    return <ErrorMessage message="Failed to load assigned incidents. Please refresh." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Assigned Incidents"
        description="Review and manage incidents assigned to your department"
      />

      {/* Search */}
      <div>
        <SearchInput value={search} onChange={handleSearch} />
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Severity Level</label>
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
