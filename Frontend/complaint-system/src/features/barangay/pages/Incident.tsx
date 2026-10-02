import { useState, useMemo, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { useLocation } from "react-router-dom";
import { useIncidents } from "../../../hooks/useIncidents";
import { IncidentsTable } from "../components/IncidentsTable";
import { SearchInput } from "../../general";
import { ComplaintStatusFilterDropdown, CategoryFilterDropdown, StatusFilterDropdown, DateFilter } from "../components/Filters";
import { BARANGAY_INCIDENT_STATUS_FILTERS } from "../../../types/complaints/complaint";
import type { ComplaintStatusFilter, StatusFilter } from "../../../types/complaints/complaint";
import { CATEGORY } from "../../../types/general/category";
import type { IncidentQueryParams } from "../../../services/incidents/incidents";

const PAGE_SIZE = 8;

export const IncidentPage: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();

  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<ComplaintStatusFilter>("all");
  const [filterCategory, setFilterCategory] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [filterSeverity, setFilterSeverity] = useState<StatusFilter>("all");

  useEffect(() => {
    const status = new URLSearchParams(location.search).get("complaint_status");
    const isValidStatus = BARANGAY_INCIDENT_STATUS_FILTERS.some((option) => option.value === status);
    setFilterStatus(isValidStatus ? status as ComplaintStatusFilter : "all");
  }, [location.search]);

  // Any filter change should reset back to page 1
  useEffect(() => {
    setCurrentPage(1);
  }, [submittedSearch, filterStatus, filterCategory, filterSeverity, dateFrom, dateTo]);

  const queryParams: IncidentQueryParams = useMemo(() => {
    const params: IncidentQueryParams = {
      page: currentPage,
      page_size: PAGE_SIZE,
    };
    if (submittedSearch) params.search = submittedSearch;
    if (filterStatus !== "all") params.complaint_status = filterStatus;
    if (filterCategory) params.category_name = filterCategory;
    if (filterSeverity !== "all") params.severity_level = filterSeverity;
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    return params;
  }, [currentPage, submittedSearch, filterStatus, filterCategory, filterSeverity, dateFrom, dateTo]);

  const { incidents, pagination, isLoading, isFetching, error: isError } = useIncidents(queryParams);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);
    if (!value.trim()) setSubmittedSearch("");
  };
  const handleFilterChange = (status: ComplaintStatusFilter) => setFilterStatus(status);
  const handleDateFromChange = (e: React.ChangeEvent<HTMLInputElement>) => setDateFrom(e.target.value);
  const handleDateToChange = (e: React.ChangeEvent<HTMLInputElement>) => setDateTo(e.target.value);
  const handleClearDateFilter = () => {
    setDateFrom("");
    setDateTo("");
  };

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
        <SearchInput value={search} onChange={handleSearch} onSearch={() => setSubmittedSearch(search.trim())} />
      </div>

      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full lg:w-auto">
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className="text-sm font-medium text-gray-700">Status</label>
            <ComplaintStatusFilterDropdown current={filterStatus} options={BARANGAY_INCIDENT_STATUS_FILTERS} onChange={handleFilterChange} />
          </div>
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className="text-sm font-medium text-gray-700">Category</label>
            <CategoryFilterDropdown current={filterCategory} categories={Object.keys(CATEGORY)} onChange={setFilterCategory} />
          </div>
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className="text-sm font-medium text-gray-700">Severity</label>
            <StatusFilterDropdown current={filterSeverity} onChange={setFilterSeverity} />
          </div>
        </div>

        <div className="w-full lg:w-auto">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Date Range</label>
          <DateFilter
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateFromChange={handleDateFromChange}
            onDateToChange={handleDateToChange}
            onClear={handleClearDateFilter}
          />
        </div>
      </div>

      <IncidentsTable
        incidents={incidents}
        isLoading={isLoading}
        isFetching={isFetching}
        currentPage={pagination?.page ?? 1}
        totalPages={pagination?.total_pages ?? 1}
        onPageChange={setCurrentPage}
      />

      {!isLoading && pagination && (
        <p className="text-xs text-gray-500 text-left sm:text-right">
          Showing {incidents.length} of {pagination.total_items} incidents
        </p>
      )}
    </div>
  );
};