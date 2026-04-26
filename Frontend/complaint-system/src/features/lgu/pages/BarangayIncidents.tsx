import { useParams, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { MapPin } from "lucide-react";
import { useForwardedIncidents } from "../../../hooks/useIncidents";
import { useBarangayById, useMarkBarangayViewed } from "../../../hooks/useBarangays";
import { useComplaintsFilter } from "../../../hooks/useFilter";
import { LguIncidentsTable } from "../components/LguIncidentsTable";
import { useTranslation } from "react-i18next";
import { StatusFilterDropdown, SortDropdown, DateFilter } from "../../barangay/components/Filters";
import { ErrorMessage, BackButton } from "../../general";

export const BarangayIncidents: React.FC = () => {
  const { barangayId } = useParams<{ barangayId: string }>();
  const navigate = useNavigate();
  const barangayIdNum = Number(barangayId);

  const { incidents, isLoading: incidentsLoading, error: incidentsError } = useForwardedIncidents(barangayIdNum);
  const { barangay, isLoading: barangayLoading } = useBarangayById(barangayIdNum);
  const markViewedMutation = useMarkBarangayViewed();
  const { t } = useTranslation();

  // Mark incidents as viewed when page loads
  useEffect(() => {
    if (barangayIdNum && !isNaN(barangayIdNum)) {
      markViewedMutation.mutate(barangayIdNum);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barangayIdNum]);

  const {
    filterStatus,
    sortBy,
    dateFrom,
    dateTo,
    minDate,
    maxDate,
    currentPage,
    paginated,
    totalPages,
    handleFilterChange,
    handleSortChange,
    handleDateFromChange,
    handleDateToChange,
    handleClearDateFilter,
    setCurrentPage,
  } = useComplaintsFilter(incidents || []);
  if (incidentsError) {
    return <ErrorMessage message={t('frontend.incidents.loadIncidentsFailed')} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <BackButton 
          label={t('frontend.incidents.backToBarangayList')}
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
            {t('frontend.incidents.forwardedFromBarangay')}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full lg:w-auto">
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className="text-sm font-medium text-gray-700">{t('incidents.severityLevel')}</label>
            <StatusFilterDropdown current={filterStatus} onChange={handleFilterChange} />
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
