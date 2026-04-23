import { useNavigate } from "react-router-dom";
import { useState, useMemo, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { useAllBarangays } from "../../../hooks/useBarangays";
import { BarangayCard } from "../components/BarangayCard";
import { StatCard, ErrorMessage, SearchInput } from "../../general";
import LoadingIndicator from "../../general/LoadingIndicator";
import { Bell, ChevronLeft, ChevronRight } from "lucide-react";

export const BarangayList: React.FC = () => {
  const { barangays, isLoading, error } = useAllBarangays();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  const filteredBarangays = useMemo(() => {
    if (!barangays) return [];
    if (!searchTerm.trim()) return barangays;
    
    return barangays.filter((barangay) =>
      barangay.barangay_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [barangays, searchTerm]);

  const totalPages = Math.ceil((filteredBarangays?.length || 0) / itemsPerPage);
  
  const paginatedBarangays = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredBarangays.slice(startIndex, endIndex);
  }, [filteredBarangays, currentPage, itemsPerPage]);

  // Reset to page 1 when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const barangaysWithNewIncidents = useMemo(() => {
    if (!barangays) return 0;
    return barangays.filter(b => (b.new_forwarded_incident_count ?? 0) > 0).length;
  }, [barangays]);

  const totalNewIncidents = useMemo(() => {
    if (!barangays) return 0;
    return barangays.reduce((sum, b) => sum + (b.new_forwarded_incident_count ?? 0), 0);
  }, [barangays]);

  if (error) {
    return <ErrorMessage message="Failed to load barangays. Please refresh." />;
  }

  if (isLoading) {
    return <LoadingIndicator />;
  }

  const handleViewIncidents = (barangayId: number) => {
    navigate(`/lgu/barangay-incidents/${barangayId}`);
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('page.barangayIncidents.title')}</h1>
          <p className="text-sm text-gray-600 mt-1">{t('page.barangayIncidents.description')}</p>
        </div>
        <div className="flex gap-3">
          <StatCard label={t('stats.totalBarangays')} value={barangays?.length || 0} />
          {barangaysWithNewIncidents > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 min-w-35">
              <div className="flex items-center gap-2 mb-1">
                <Bell className="w-4 h-4 text-orange-600" />
                <p className="text-xs font-medium text-orange-700 uppercase tracking-wide">{t('stats.newReports')}</p>
              </div>
              <p className="text-2xl font-bold text-orange-900">{barangaysWithNewIncidents}</p>
              <p className="text-xs text-orange-600 mt-0.5">{totalNewIncidents} {t('barangayList.newIncidents').toLowerCase()}</p>
            </div>
          )}
        </div>
      </div>

      <SearchInput
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search barangays..."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paginatedBarangays && paginatedBarangays.length > 0 ? (
          paginatedBarangays.map((barangay) => (
            <BarangayCard 
              key={barangay.id}
              barangay={barangay}
              onViewIncidents={handleViewIncidents}
            />
          ))
        ) : (
          <div className="col-span-full text-center py-12 text-gray-500">
            {searchTerm ? t('empty.noMatch') : t('empty.noBarangays')}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-700">
            {t('common.showing')} <span className="font-semibold text-gray-900">{((currentPage - 1) * itemsPerPage) + 1}</span> to{' '}
            <span className="font-semibold text-gray-900">
              {Math.min(currentPage * itemsPerPage, filteredBarangays.length)}
            </span>{' '}
            of <span className="font-semibold text-gray-900">{filteredBarangays.length}</span> {t('stats.barangays')}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="inline-flex items-center justify-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="px-3 py-2 bg-primary-50 border border-primary-200 rounded-lg">
              <span className="text-sm font-medium text-primary-900">
                Page {currentPage} of {totalPages}
              </span>
            </div>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="inline-flex items-center justify-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
