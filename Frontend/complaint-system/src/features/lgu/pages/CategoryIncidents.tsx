import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useState, useMemo } from "react";
import { useMonthlyIncidentReport } from "../../../hooks/useReports";
import { ErrorMessage } from "../../general";
import LoadingIndicator from "../../general/LoadingIndicator";
import { ArrowLeft, FileText, AlertCircle } from "lucide-react";
import { formatCategoryName } from "../../../utils/categoryFormatter";
import { Pagination } from "../../barangay/components/Pagination";

export const CategoryIncidents: React.FC = () => {
  const { barangayId, categoryName } = useParams<{ barangayId: string; categoryName: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const month = Number(searchParams.get("month"));
  const year = Number(searchParams.get("year"));
  
  const [currentPage, setCurrentPage] = useState(1);
  const incidentsPerPage = 10;

  const { report, isLoading, error } = useMonthlyIncidentReport(
    Number(barangayId),
    month,
    year,
    !!barangayId && !!month && !!year
  );

  // Find the specific category data
  const categoryData = useMemo(() => {
    if (!report?.data || !categoryName) return null;
    return report.data.find(cat => cat.category === decodeURIComponent(categoryName));
  }, [report, categoryName]);

  // Paginate incidents
  const paginatedIncidents = useMemo(() => {
    if (!categoryData?.incidents) return [];
    const startIndex = (currentPage - 1) * incidentsPerPage;
    const endIndex = startIndex + incidentsPerPage;
    return categoryData.incidents.slice(startIndex, endIndex);
  }, [categoryData, currentPage]);

  const totalPages = Math.ceil((categoryData?.incidents.length || 0) / incidentsPerPage);

  if (error) {
    return <ErrorMessage message="Failed to load incident data. Please try again." />;
  }

  if (isLoading) {
    return <LoadingIndicator />;
  }

  if (!categoryData) {
    return <ErrorMessage message="Category not found." />;
  }

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(`/lgu/monthly-reports/${barangayId}?month=${month}&year=${year}`)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <FileText className="w-7 h-7 text-primary-600" />
            <h1 className="text-2xl font-bold text-gray-900">
              {formatCategoryName(categoryData.category)} Incidents
            </h1>
          </div>
          <p className="text-sm text-gray-600">
            {report?.barangay.name} • {months[month - 1]} {year}
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <p className="text-xs text-gray-500 uppercase font-medium mb-2">Total Incidents</p>
          <p className="text-3xl font-bold text-primary-600">{categoryData.total_incidents}</p>
          <p className="text-xs text-gray-500 mt-1">In this category</p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <p className="text-xs text-gray-500 uppercase font-medium mb-2">Total Complaints</p>
          <p className="text-3xl font-bold text-orange-600">{categoryData.total_complaint_count}</p>
          <p className="text-xs text-gray-500 mt-1">Filed for these incidents</p>
        </div>
      </div>

      {/* Incidents Table */}
      <div className="bg-white rounded-xl overflow-hidden border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-primary-600" />
              <h2 className="text-lg font-semibold text-gray-900">All Incidents</h2>
            </div>
            <div className="text-sm text-gray-600">
              Total: <span className="font-semibold">{categoryData.incidents.length}</span> incidents
            </div>
          </div>
        </div>

        <div className="px-3 pt-2 text-[11px] text-gray-500 sm:hidden">
          Swipe horizontally to view all columns.
        </div>
        <div className="overflow-x-auto -mx-2 sm:mx-0">
          <table className="w-full min-w-[680px]">
            <thead className="bg-gray-50 border-y border-gray-200">
              <tr>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  #
                </th>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Incident Title
                </th>
                <th scope="col" className="px-6 py-3.5 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Complaints
                </th>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  First Reported
                </th>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Last Reported
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {paginatedIncidents.length > 0 ? (
                paginatedIncidents.map((incident, index) => (
                  <tr key={incident.incident_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-500">
                        {((currentPage - 1) * incidentsPerPage) + index + 1}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {incident.incident_title}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center px-3 py-1 rounded-md text-sm font-semibold bg-primary-50 text-primary-700 border border-primary-100">
                        {incident.complaint_count}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        {incident.first_reported_at
                          ? new Date(incident.first_reported_at).toLocaleDateString("en-PH", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "N/A"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        {incident.last_reported_at
                          ? new Date(incident.last_reported_at).toLocaleDateString("en-PH", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "N/A"}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p className="text-lg font-medium">No incidents found</p>
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
