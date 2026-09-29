import { useEffect, useMemo, useState } from "react";
import { useScheduledHearings } from "../../../hooks/useIncidents";
import type { IncidentQueryParams } from "../../../services/incidents/incidents";
import { SearchInput } from "../../general/SearchInput";
import { ErrorMessage } from "../../general/ErrorMessage";
import { PageHeader } from "../../general/PageHeader";
import { DateFilter } from "../components/Filters";
import { ScheduledHearingsTable } from "../components/ScheduledHearingsTable";

const PAGE_SIZE = 8;

export const ScheduledHearings: React.FC = () => {
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [submittedSearch, dateFrom, dateTo]);

  const queryParams: IncidentQueryParams = useMemo(() => ({
    page: currentPage,
    page_size: PAGE_SIZE,
    order: "asc",
    ...(submittedSearch ? { search: submittedSearch } : {}),
    ...(dateFrom ? { date_from: dateFrom } : {}),
    ...(dateTo ? { date_to: dateTo } : {}),
  }), [currentPage, submittedSearch, dateFrom, dateTo]);

  const { incidents, pagination, isLoading, isFetching, error } = useScheduledHearings(queryParams);

  if (error) {
    return <ErrorMessage message="Failed to load scheduled hearings. Please refresh." />;
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Scheduled Hearings"
        description="Review upcoming hearings for incidents in your barangay."
      />

      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <SearchInput value={search} onChange={(event) => setSearch(event.target.value)} onSearch={() => setSubmittedSearch(search.trim())} placeholder="Search incidents" />

      <div className="w-full lg:w-auto">
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Hearing date range</label>
        <DateFilter
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={(event) => setDateFrom(event.target.value)}
          onDateToChange={(event) => setDateTo(event.target.value)}
          onClear={() => {
            setDateFrom("");
            setDateTo("");
          }}
        />
      </div>
      </div>

      <ScheduledHearingsTable
        incidents={incidents}
        isLoading={isLoading}
        isFetching={isFetching}
        currentPage={pagination?.page ?? 1}
        totalPages={pagination?.total_pages ?? 1}
        onPageChange={setCurrentPage}
      />
    </div>
  );
};