import { useTranslation } from "react-i18next";
import { useAllIncidents } from "../../hooks/useIncidents";
import { useComplaintsFilter } from "../../hooks/useFilter";
import { SearchInput } from "./SearchInput";
import { ErrorMessage } from "./ErrorMessage";
import { PageHeader } from "./PageHeader";
import { ComplaintStatusFilterDropdown, SortDropdown, DateFilter } from "../barangay/components/Filters";
import { ArchivedIncidentsTable } from "./ArchivedIncidentsTable";

interface ArchivedIncidentsPageProps {
  title: string;
  description: string;
  detailPathBase: string;
  emptyMessage?: string;
}

export const ArchivedIncidentsPage: React.FC<ArchivedIncidentsPageProps> = ({
  title,
  description,
  detailPathBase,
  emptyMessage,
}) => {
  const { incidents, isLoading, error: isError } = useAllIncidents();
  const { t } = useTranslation();
  const {
    search,
    filterComplaintStatus,
    sortBy,
    dateFrom,
    dateTo,
    minDate,
    maxDate,
    currentPage,
    paginated,
    totalPages,
    handleSearch,
    handleComplaintStatusFilterChange,
    handleSortChange,
    handleDateFromChange,
    handleDateToChange,
    handleClearDateFilter,
    setCurrentPage,
  } = useComplaintsFilter(incidents || [], true);

  if (isError) {
    return <ErrorMessage message="Failed to load archived incidents. Please refresh." />;
  }

  return (
    <div className="space-y-3">
      <PageHeader title={title} description={description} />

      <div>
        <SearchInput value={search} onChange={handleSearch} placeholder={t('search.placeholder')} />
      </div>

      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full lg:w-auto">
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className="text-sm font-medium text-gray-700">Complaint Status</label>
            <ComplaintStatusFilterDropdown current={filterComplaintStatus} onChange={handleComplaintStatusFilterChange} />
          </div>
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className="text-sm font-medium text-gray-700">Sort By</label>
            <SortDropdown current={sortBy} onChange={handleSortChange} />
          </div>
        </div>

        <div className="w-full lg:w-auto">
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

      <ArchivedIncidentsTable
        incidents={paginated}
        isLoading={isLoading}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        detailPathBase={detailPathBase}
        emptyMessage={emptyMessage}
      />
    </div>
  );
};