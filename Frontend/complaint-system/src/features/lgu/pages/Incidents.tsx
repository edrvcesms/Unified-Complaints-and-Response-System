import { useAllForwardedIncidents } from "../../../hooks/useIncidents";
import { useComplaintsFilter } from "../../../hooks/useFilter";
import { LguIncidentsTable } from "../components/LguIncidentsTable";
import { SearchInput } from "../../general";
import { ComplaintStatusFilterDropdown, CategoryFilterDropdown, DateFilter } from "../../barangay/components/Filters";
import { StatusFilterDropdown } from "../../barangay/components/Filters";
import { CATEGORY } from "../../../types/general/category";
import { LGU_INCIDENT_STATUS_FILTERS } from "../../../types/complaints/complaint";
import { useTranslation } from "react-i18next";
import { ErrorMessage, PageHeader } from "../../general";
import type { IncidentQueryParams } from "../../../services/incidents/incidents";
import { useEffect, useState } from "react";

export const LguIncidents: React.FC = () => {
  const [metaData, setMetaData] = useState<IncidentQueryParams>({ page: 1, page_size: 10 });
  const { incidents, isLoading, isFetching, error: isError, pagination } = useAllForwardedIncidents(metaData);
  const { t } = useTranslation();
  const handlePageChange = (page: number) => {
    setMetaData((prev) => ({ ...prev, page }));
  }
  const manageIncidents = (incidents || []).filter((incident) => {
    return Boolean(incident);
  });
  const {
    searchInput,
    search,
    filterStatus,
    filterCategory,
    filterSeverity,
    dateFrom,
    dateTo,
    minDate,
    maxDate,
    paginated,
    filtered,
    handleSearch,
    handleSearchSubmit,
    handleFilterChange,
    handleCategoryChange,
    handleSeverityChange,
    handleDateFromChange,
    handleDateToChange,
    handleClearDateFilter,
  } = useComplaintsFilter(manageIncidents);

  useEffect(() => {
    setMetaData((prev) => ({
      ...prev,
      page: 1,
      search: search || undefined,
      complaint_status: filterStatus === "all" ? undefined : filterStatus,
      category_name: filterCategory || undefined,
      severity_level: filterSeverity === "all" ? undefined : filterSeverity,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
    }));
  }, [search, filterStatus, filterCategory, filterSeverity, dateFrom, dateTo]);

  if (isError) {
    return <ErrorMessage message={t('frontend.incidents.loadForwardedFailed')} />;
  }

  return (
    <div className="space-y-3">
      <PageHeader 
        title={t('frontend.incidents.forwardedTitle')}
        description={t('frontend.incidents.forwardedDescription')}
      />

      <div className="text-sm text-gray-600">
        {t('frontend.incidents.showingCounts', { filtered: filtered.length, total: manageIncidents.length })}
      </div>

      <div>
        <SearchInput value={searchInput} onChange={handleSearch} onSearch={handleSearchSubmit} placeholder={t('search.placeholder')} />
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full lg:w-auto">
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className="text-sm font-medium text-gray-700">Status</label>
            <ComplaintStatusFilterDropdown current={filterStatus} options={LGU_INCIDENT_STATUS_FILTERS} onChange={handleFilterChange} />
          </div>
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className="text-sm font-medium text-gray-700">Severity</label>
            <StatusFilterDropdown current={filterSeverity} onChange={handleSeverityChange} />
          </div>
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className="text-sm font-medium text-gray-700">Category</label>
            <CategoryFilterDropdown current={filterCategory} categories={Object.keys(CATEGORY)} onChange={handleCategoryChange} />
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

      <LguIncidentsTable
        incidents={paginated}
        isLoading={isLoading}
        isFetching={isFetching}
        currentPage={pagination?.page ?? 1}
        totalPages={pagination?.total_pages ?? 1}
        onPageChange={handlePageChange}
      />
    </div>
  );
};
