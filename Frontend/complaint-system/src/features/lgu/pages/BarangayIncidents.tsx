import { useParams, useNavigate } from "react-router-dom";
import { MapPin } from "lucide-react";
import { useForwardedIncidents } from "../../../hooks/useIncidents";
import { useBarangayById } from "../../../hooks/useBarangays";
import { useComplaintsFilter } from "../../../hooks/useFilter";
import { LguIncidentsTable } from "../components/LguIncidentsTable";
import { SearchInput } from "../../barangay/components/SearchInputs";
import { StatusFilterDropdown, SeverityScoreFilterDropdown, SortDropdown, DateFilter } from "../../barangay/components/Filters";
import { ErrorMessage, BackButton } from "../../general";

export const BarangayIncidents: React.FC = () => {
  const { barangayId } = useParams<{ barangayId: string }>();
  const navigate = useNavigate();
  const barangayIdNum = Number(barangayId);

  const { incidents, isLoading: incidentsLoading, error: incidentsError } = useForwardedIncidents(barangayIdNum);
  const { barangay, isLoading: barangayLoading } = useBarangayById(barangayIdNum);

  const {
    search,
    filterStatus,
    filterSeverityScore,
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
    handleSeverityScoreFilterChange,
    handleSortChange,
    handleDateFromChange,
    handleDateToChange,
    handleClearDateFilter,
    setCurrentPage,
  } = useComplaintsFilter(incidents || []);

  if (incidentsError) {
    return <ErrorMessage message="Failed to load incidents. Please refresh." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <BackButton 
          label="Back to Barangay List"
          onClick={() => navigate("/lgu/barangay-incidents")}
        />

        <div className="border-b border-gray-200 pb-4">
          <h1 className="text-2xl font-bold text-gray-900">
            {barangayLoading ? "Loading..." : barangay?.barangay_name || "Barangay"}
          </h1>
          <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
            <MapPin className="w-4 h-4" />
            <span>{barangay?.barangay_address || "Loading address..."}</span>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Incidents forwarded from this barangay
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {/* Severity Filter */}
        <div className="flex-1 min-w-[200px]">
          <StatusFilterDropdown current={filterStatus} onChange={handleFilterChange} />
        </div>
        {/* Date Range */}
        <div className="flex-1 min-w-[140px]">
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
        {/* Sort Filter */}
        <div className="flex-1 min-w-[200px]">
          <SortDropdown current={sortBy} onChange={handleSortChange} />
        </div>

        {/* Hidden severity score filter - logic still applies */}
        <div className="hidden">
          <SeverityScoreFilterDropdown 
            current={filterSeverityScore} 
            onChange={handleSeverityScoreFilterChange} 
          />
        </div>
      </div>


      <LguIncidentsTable
        incidents={paginated}
        isLoading={incidentsLoading}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
    </div>
  );
};
