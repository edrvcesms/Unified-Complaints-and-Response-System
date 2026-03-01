import { useParams, useNavigate } from "react-router-dom";
import { MapPin } from "lucide-react";
import { useForwardedIncidents } from "../../../hooks/useIncidents";
import { useBarangayById } from "../../../hooks/useBarangays";
import { useComplaintsFilter } from "../../../hooks/useFilter";
import { LguIncidentsTable } from "../components/LguIncidentsTable";
import { useTranslation } from "react-i18next";
import { StatusFilterDropdown, SeverityScoreFilterDropdown, SortDropdown, DateFilter } from "../../barangay/components/Filters";
import { ErrorMessage, BackButton } from "../../general";

export const BarangayIncidents: React.FC = () => {
  const { barangayId } = useParams<{ barangayId: string }>();
  const navigate = useNavigate();
  const barangayIdNum = Number(barangayId);

  const { incidents, isLoading: incidentsLoading, error: incidentsError } = useForwardedIncidents(barangayIdNum);
  const { barangay, isLoading: barangayLoading } = useBarangayById(barangayIdNum);
  const { t } = useTranslation();

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
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">{t('incidents.severityLevel')}</label>
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
