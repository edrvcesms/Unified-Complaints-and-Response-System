import { useState, useMemo, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { useIncidents } from "../../../hooks/useIncidents";
import { IncidentsTable } from "../components/IncidentsTable";
import { SearchInput } from "../../general";
import { StatusFilterDropdown, SortDropdown, DateFilter } from "../components/Filters";
import type { StatusFilter } from "../../../types/complaints/complaint";
import type { SortOption } from "../../../hooks/useFilter";
import type { IncidentQueryParams } from "../../../services/incidents/incidents";

const SORT_MAP: Record<Exclude<SortOption, "none">, Pick<IncidentQueryParams, "sort" | "order">> = {
  priority_high_to_low: { sort: "priority", order: "desc" },
  priority_low_to_high: { sort: "priority", order: "asc" },
  date_newest_first: { sort: "first_reported_at", order: "desc" },
  date_oldest_first: { sort: "first_reported_at", order: "asc" },
  date_newest_last: { sort: "last_reported_at", order: "desc" },
  date_oldest_last: { sort: "last_reported_at", order: "asc" },
};

const PAGE_SIZE = 8;

export const IncidentPage: React.FC = () => {
  const { t } = useTranslation();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<StatusFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("none");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Debounce search so we don't fire a request per keystroke
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(id);
  }, [search]);

  // Any filter change should reset back to page 1
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, filterStatus, sortBy, dateFrom, dateTo]);

  const queryParams: IncidentQueryParams = useMemo(() => {
    const params: IncidentQueryParams = {
      page: currentPage,
      page_size: PAGE_SIZE,
    };
    if (debouncedSearch) params.search = debouncedSearch;
    if (filterStatus !== "all") params.severity_level = filterStatus;
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    if (sortBy !== "none") Object.assign(params, SORT_MAP[sortBy]);
    return params;
  }, [currentPage, debouncedSearch, filterStatus, dateFrom, dateTo, sortBy]);

  const { incidents, pagination, isLoading, isFetching, error: isError } = useIncidents(queryParams);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value);
  const handleFilterChange = (status: StatusFilter) => setFilterStatus(status);
  const handleSortChange = (sort: SortOption) => setSortBy(sort);
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
        <SearchInput value={search} onChange={handleSearch} />
      </div>

      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full lg:w-auto">
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className="text-sm font-medium text-gray-700">{t('incidents.severityLevel')}</label>
            <StatusFilterDropdown current={filterStatus} onChange={handleFilterChange} />
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