import { useNavigate } from "react-router-dom";
import { useState, useMemo } from "react";
import { useTranslation } from 'react-i18next';
import { useAllBarangays } from "../../../hooks/useBarangays";
import { ErrorMessage, SearchInput } from "../../general";
import LoadingIndicator from "../../general/LoadingIndicator";
import { FileText, ChevronLeft, ChevronRight } from "lucide-react";

export const MonthlyBarangayReports: React.FC = () => {
  const { barangays, isLoading, error } = useAllBarangays();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filteredBarangays = useMemo(() => {
    if (!barangays) return [];
    if (!searchTerm.trim()) return barangays;
    
    return barangays.filter((barangay) =>
      barangay.barangay_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      barangay.barangay_address?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [barangays, searchTerm]);

  const totalPages = Math.ceil((filteredBarangays?.length || 0) / itemsPerPage);
  
  const paginatedBarangays = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredBarangays.slice(startIndex, endIndex);
  }, [filteredBarangays, currentPage, itemsPerPage]);

  // Reset to page 1 when search term changes
  useMemo(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  if (error) {
    return <ErrorMessage message="Failed to load barangays. Please refresh." />;
  }

  if (isLoading) {
    return <LoadingIndicator />;
  }

  const handleViewReport = (barangayId: number) => {
    navigate(`/lgu/monthly-reports/${barangayId}`);
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <div className="flex items-center gap-3 mb-2">
          <FileText className="w-7 h-7 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">{t('page.monthlyReports.title')}</h1>
        </div>
        <p className="text-sm text-gray-600">{t('page.monthlyReports.description')}</p>
      </div>

      <div className="flex justify-between items-center">
        <div className="flex-1 max-w-md">
          <SearchInput
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search barangays..."
          />
        </div>
        <div className="text-sm text-gray-600">
          {t('stats.total')}: <span className="font-semibold">{filteredBarangays?.length || 0}</span> {t('stats.barangays')}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  {t('table.headers.barangayName')}
                </th>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  {t('table.headers.address')}
                </th>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  {t('table.headers.contact')}
                </th>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  {t('table.headers.email')}
                </th>
                <th scope="col" className="px-6 py-3.5 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  {t('table.headers.action')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedBarangays && paginatedBarangays.length > 0 ? (
                paginatedBarangays.map((barangay) => (
                  <tr key={barangay.id} className="hover:bg-blue-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">{barangay.barangay_name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600 line-clamp-2">{barangay.barangay_address || t('common.na')}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">{barangay.barangay_contact_number || t('common.na')}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">{barangay.barangay_email || t('common.na')}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleViewReport(barangay.id)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all shadow-sm hover:shadow cursor-pointer"
                      >
                        <FileText className="w-4 h-4" />
                        {t('monthlyReports.viewReport')}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    {searchTerm ? t('empty.noMatch') : t('empty.noBarangays')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="text-sm text-gray-700">
              {t('common.showing')} <span className="font-semibold text-gray-900">{((currentPage - 1) * itemsPerPage) + 1}</span> to{' '}
              <span className="font-semibold text-gray-900">
                {Math.min(currentPage * itemsPerPage, filteredBarangays.length)}
              </span>{' '}
              of <span className="font-semibold text-gray-900">{filteredBarangays.length}</span> results
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="inline-flex items-center justify-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                <span className="text-sm font-medium text-blue-900">
                  Page {currentPage} of {totalPages}
                </span>
              </div>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="inline-flex items-center justify-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
