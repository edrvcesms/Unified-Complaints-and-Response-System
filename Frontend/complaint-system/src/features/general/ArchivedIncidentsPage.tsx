import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAllIncidents } from "../../hooks/useIncidents";
import { SearchInput } from "./SearchInput";
import { ErrorMessage } from "./ErrorMessage";
import { PageHeader } from "./PageHeader";
import { ComplaintStatusFilterDropdown, SortDropdown, DateFilter } from "../barangay/components/Filters";
import { ArchivedIncidentsTable } from "./ArchivedIncidentsTable";
import type { ComplaintStatusFilter } from "../../types/complaints/complaint";
import type { SortOption } from "../../hooks/useFilter";
import type { IncidentQueryParams } from "../../services/incidents/incidents";

interface ArchivedIncidentsPageProps {
  title: string;
  description: string;
  detailPathBase: string;
  emptyMessage?: string;
}

const SORT_MAP: Record<Exclude<SortOption, "none">, Pick<IncidentQueryParams, "sort" | "order">> = {
  priority_high_to_low: { sort: "priority", order: "desc" },
  priority_low_to_high: { sort: "priority", order: "asc" },
  date_newest_first: { sort: "first_reported_at", order: "desc" },
  date_oldest_first: { sort: "first_reported_at", order: "asc" },
  date_newest_last: { sort: "last_reported_at", order: "desc" },
  date_oldest_last: { sort: "last_reported_at", order: "asc" },
};

const PAGE_SIZE = 8;

export const ArchivedIncidentsPage: React.FC<ArchivedIncidentsPageProps> = ({
  title,
  description,
  detailPathBase,
  emptyMessage,
}) => {
  const { t } = useTranslation();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterComplaintStatus, setFilterComplaintStatus] = useState<ComplaintStatusFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("none");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(id);
  }, [search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, filterComplaintStatus, sortBy, dateFrom, dateTo]);

  const queryParams: IncidentQueryParams = useMemo(() => {
    const params: IncidentQueryParams = {
      page: currentPage,
      page_size: PAGE_SIZE,
    };
    if (debouncedSearch) params.search = debouncedSearch;
    if (filterComplaintStatus !== "all") params.complaint_status = filterComplaintStatus;
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    if (sortBy !== "none") Object.assign(params, SORT_MAP[sortBy]);
    return params;
  }, [currentPage, debouncedSearch, filterComplaintStatus, dateFrom, dateTo, sortBy]);

  const { incidents, pagination, isLoading, error: isError } = useAllIncidents(queryParams);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value);
  const handleComplaintStatusFilterChange = (status: ComplaintStatusFilter) => setFilterComplaintStatus(status);
  const handleSortChange = (sort: SortOption) => setSortBy(sort);
  const handleDateFromChange = (e: React.ChangeEvent<HTMLInputElement>) => setDateFrom(e.target.value);
  const handleDateToChange = (e: React.ChangeEvent<HTMLInputElement>) => setDateTo(e.target.value);
  const handleClearDateFilter = () => {
    setDateFrom("");
    setDateTo("");
  };

  if (isError) {
    return <ErrorMessage message={t('frontend.incidents.loadIncidentsFailed')} />;
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
            <label className="text-sm font-medium text-gray-700">{t('frontend.filters.complaintStatus')}</label>
            <ComplaintStatusFilterDropdown current={filterComplaintStatus} onChange={handleComplaintStatusFilterChange} />
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
            onDateFromChange={handleDateFromChange}
            onDateToChange={handleDateToChange}
            onClear={handleClearDateFilter}
          />
        </div>
      </div>

      <ArchivedIncidentsTable
        incidents={incidents}
        isLoading={isLoading}
        currentPage={pagination?.page ?? 1}
        totalPages={pagination?.total_pages ?? 1}
        onPageChange={setCurrentPage}
        detailPathBase={detailPathBase}
        emptyMessage={emptyMessage}
      />
    </div>
  );
};