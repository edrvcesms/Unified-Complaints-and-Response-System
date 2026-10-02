import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { useAllIncidents } from "../../../hooks/useIncidents";
import { SearchInput } from "../SearchInput";
import { ErrorMessage } from "../ErrorMessage";
import { PageHeader } from "../PageHeader";
import { ComplaintStatusFilterDropdown, CategoryFilterDropdown, DateFilter } from "../../barangay/components/Filters";
import { CATEGORY } from "../../../types/general/category";
import { ArchivedIncidentsTable } from "../ArchivedIncidentsTable";
import type { ComplaintStatusFilter } from "../../../types/complaints/complaint";
import type { IncidentQueryParams } from "../../../services/incidents/incidents";
import { COMPLAINT_STATUS_FILTERS } from "../../../types/complaints/complaint";

interface ArchivedIncidentsPageProps {
  title: string;
  description: string;
  detailPathBase: string;
  emptyMessage?: string;
  statusOptions?: { label: string; value: ComplaintStatusFilter }[];
}

const PAGE_SIZE = 8;

export const ArchivedIncidentsPage: React.FC<ArchivedIncidentsPageProps> = ({
  title,
  description,
  detailPathBase,
  emptyMessage,
  statusOptions = COMPLAINT_STATUS_FILTERS,
}) => {
  const { t } = useTranslation();
  const location = useLocation();

  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [filterComplaintStatus, setFilterComplaintStatus] = useState<ComplaintStatusFilter>("all");
  const [filterCategory, setFilterCategory] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const status = new URLSearchParams(location.search).get("complaint_status");
    const isValidStatus = statusOptions.some((option) => option.value === status);
    setFilterComplaintStatus(isValidStatus ? status as ComplaintStatusFilter : "all");
  }, [location.search, statusOptions]);

  useEffect(() => {
    setCurrentPage(1);
  }, [submittedSearch, filterComplaintStatus, filterCategory, dateFrom, dateTo]);

  const queryParams: IncidentQueryParams = useMemo(() => {
    const params: IncidentQueryParams = {
      page: currentPage,
      page_size: PAGE_SIZE,
    };
    if (submittedSearch) params.search = submittedSearch;
    if (filterComplaintStatus !== "all") params.complaint_status = filterComplaintStatus;
    if (filterCategory) params.category_name = filterCategory;
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    return params;
  }, [currentPage, submittedSearch, filterComplaintStatus, filterCategory, dateFrom, dateTo]);

  const { incidents, pagination, isLoading, isFetching, error: isError } = useAllIncidents(queryParams);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);
    if (!value.trim()) setSubmittedSearch("");
  };
  const handleComplaintStatusFilterChange = (status: ComplaintStatusFilter) => setFilterComplaintStatus(status);
  const handleCategoryChange = (category: string) => setFilterCategory(category);
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
        <SearchInput value={search} onChange={handleSearch} onSearch={() => setSubmittedSearch(search.trim())} placeholder={t('search.placeholder')} />
      </div>

      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full lg:w-auto">
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className="text-sm font-medium text-gray-700">{t('table.headers.status')}</label>
            <ComplaintStatusFilterDropdown current={filterComplaintStatus} options={statusOptions} onChange={handleComplaintStatusFilterChange} />
          </div>
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className="text-sm font-medium text-gray-700">{t('table.headers.category')}</label>
            <CategoryFilterDropdown current={filterCategory} categories={Object.keys(CATEGORY)} onChange={handleCategoryChange} />
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
        isFetching={isFetching}
        currentPage={pagination?.page ?? 1}
        totalPages={pagination?.total_pages ?? 1}
        onPageChange={setCurrentPage}
        detailPathBase={detailPathBase}
        emptyMessage={emptyMessage}
      />
    </div>
  );
};