import { useNavigate } from "react-router-dom";
import { useState, useMemo, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { useAllBarangays } from "../../../hooks/useBarangays";
import { ErrorMessage, SearchInput } from "../../general";
import LoadingIndicator from "../../general/LoadingIndicator";
import { FileText } from "lucide-react";
import { Pagination } from "../../barangay/components/Pagination";

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
  useEffect(() => {
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
          <FileText className="w-7 h-7 text-primary-600" />
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

      <div className="bg-white rounded-xl overflow-hidden border border-gray-200">
        <div className="px-3 pt-2 text-[11px] text-gray-500 sm:hidden">
          Swipe horizontally to view all columns.
        </div>
        <div className="overflow-x-auto -mx-2 sm:mx-0">
          <table className="w-full min-w-[760px]">
            <thead className="bg-gray-50 border-y border-gray-200">
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
            <tbody className="divide-y divide-gray-100 bg-white">
              {paginatedBarangays && paginatedBarangays.length > 0 ? (
                paginatedBarangays.map((barangay) => (
                  <tr key={barangay.id} className="hover:bg-gray-50 transition-colors">
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
                        className="inline-flex items-center gap-2 min-h-9 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors cursor-pointer"
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

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
};
