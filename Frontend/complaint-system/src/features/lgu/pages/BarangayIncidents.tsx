import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { useForwardedIncidents } from "../../../hooks/useIncidents";
import { useBarangayById, useMarkBarangayViewed } from "../../../hooks/useBarangays";
import { LguIncidentsTable } from "../components/LguIncidentsTable";
import { useComplaintsFilter } from "../../../hooks/useFilter";
import { useTranslation } from "react-i18next";
import { ComplaintStatusFilterDropdown, CategoryFilterDropdown, StatusFilterDropdown, DateFilter } from "../../barangay/components/Filters";
import { CATEGORY } from "../../../types/general/category";
import { LGU_INCIDENT_STATUS_FILTERS } from "../../../types/complaints/complaint";
import { ErrorMessage, BackButton } from "../../general";
import { SearchInput } from "../../general";
import type { IncidentQueryParams } from "../../../services/incidents/incidents";

export const BarangayIncidents: React.FC = () => {
  const { barangayId } = useParams<{ barangayId: string }>();
  const navigate = useNavigate();
  const barangayIdNum = Number(barangayId);
  const [metaData, setMetaData] = useState<IncidentQueryParams>({ page: 1, page_size: 10 });

  const { incidents, isLoading: incidentsLoading, error: incidentsError, pagination } = useForwardedIncidents(barangayIdNum, metaData);
  const { barangay, isLoading: barangayLoading } = useBarangayById(barangayIdNum);
  const markViewedMutation = useMarkBarangayViewed();
  const handlePageChange = (page: number) => {
    setMetaData((prev) => ({ ...prev, page }));
  }
  const { t } = useTranslation();

  // Mark incidents as viewed when page loads
  useEffect(() => {
    if (barangayIdNum && !isNaN(barangayIdNum)) {
      markViewedMutation.mutate(barangayIdNum);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barangayIdNum]);

  const {
    searchInput, search, filterStatus, filterCategory, filterSeverity, dateFrom, dateTo,
    minDate, maxDate, paginated, handleSearch, handleSearchSubmit,
    handleFilterChange, handleCategoryChange, handleSeverityChange,
    handleDateFromChange, handleDateToChange, handleClearDateFilter,
  } = useComplaintsFilter(incidents || []);

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
      <SearchInput value={searchInput} onChange={handleSearch} onSearch={handleSearchSubmit} placeholder={t('search.placeholder')} />
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full lg:w-auto">
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className="text-sm font-medium text-gray-700">Status</label>
            <ComplaintStatusFilterDropdown current={filterStatus} options={LGU_INCIDENT_STATUS_FILTERS} onChange={handleFilterChange} />
          </div>
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className="text-sm font-medium text-gray-700">Category</label>
            <CategoryFilterDropdown current={filterCategory} categories={Object.keys(CATEGORY)} onChange={handleCategoryChange} />
          </div>
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className="text-sm font-medium text-gray-700">Severity</label>
            <StatusFilterDropdown current={filterSeverity} onChange={handleSeverityChange} />
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
        currentPage={pagination?.page || 1}
        totalPages={pagination?.total_pages || 1}
        onPageChange={handlePageChange}
      />
    </div>
  );
};
