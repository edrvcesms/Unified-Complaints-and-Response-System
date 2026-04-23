import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { useMonthlyIncidentReport } from "../../../hooks/useReports";
import { ErrorMessage } from "../../general";
import LoadingIndicator from "../../general/LoadingIndicator";
import { ArrowLeft, FileText, Filter, X, AlertCircle, Calendar, MapPin, Phone, Mail, TrendingUp, MessageSquare, Building2, Info } from "lucide-react";
import { formatCategoryName } from "../../../utils/categoryFormatter";

export const MonthlyReportDetails: React.FC = () => {
  const { barangayId } = useParams<{ barangayId: string }>();
  const navigate = useNavigate();
  
  // Initialize with current month and year
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  
  const { report, isLoading, error } = useMonthlyIncidentReport(
    Number(barangayId),
    selectedMonth,
    selectedYear,
    !!barangayId
  );
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);

  // Filter categories based on selection
  const filteredCategories = useMemo(() => {
    if (!report?.data) return [];
    return report.data.filter(category => 
      category.total_incidents > 0 && selectedCategories.includes(category.category)
    );
  }, [report?.data, selectedCategories]);

  // Available categories for filter (only those with incidents)
  const availableCategories = useMemo(() => {
    if (!report?.data) return [];
    return report.data.filter(cat => cat.total_incidents > 0);
  }, [report?.data]);

  // Initialize selected categories with categories that have incidents
  useEffect(() => {
    if (report?.data) {
      const categoriesWithIncidents = report.data
        .filter(cat => cat.total_incidents > 0)
        .map(cat => cat.category);
      setSelectedCategories(categoriesWithIncidents);
    }
  }, [report?.data]);

  // React Query automatically refetches when queryKey changes (month/year),
  // so manual refetch is not needed here

  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showCategoryFilter && !target.closest('.category-filter-container')) {
        setShowCategoryFilter(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCategoryFilter]);

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Generate year options (current year - 5 to current year + 1)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 7 }, (_, i) => currentYear - 5 + i);

  if (error) {
    return <ErrorMessage message="Failed to load monthly report. Please try again." />;
  }

  if (isLoading) {
    return <LoadingIndicator />;
  }

  if (!report) {
    return <ErrorMessage message="Report not found." />;
  }

  const totalIncidents = report.data.reduce((sum, category) => sum + category.total_incidents, 0);
  const totalComplaints = report.data.reduce((sum, category) => sum + category.total_complaint_count, 0);

  const handleViewAllIncidents = (categoryName: string) => {
    navigate(`/lgu/monthly-reports/${barangayId}/category/${encodeURIComponent(categoryName)}?month=${selectedMonth}&year=${selectedYear}`);
  };

  const toggleCategory = (categoryName: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryName)
        ? prev.filter(c => c !== categoryName)
        : [...prev, categoryName]
    );
  };

  const selectAllCategories = () => {
    setSelectedCategories(availableCategories.map(cat => cat.category));
  };

  const deselectAllCategories = () => {
    setSelectedCategories([]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        <div className="flex items-center gap-4 flex-1">
          <button
            onClick={() => navigate("/lgu/monthly-reports")}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 bg-primary-100 rounded-lg">
                <FileText className="w-5 h-5 text-primary-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Monthly Incident Report</h1>
            </div>
            <p className="text-sm text-gray-600">
              {report ? `${report.report_period.month_name} ${report.report_period.year}` : 'Select a month and year'}
            </p>
          </div>
        </div>
        
        {/* Month and Year Selector */}
        <div className="flex items-center gap-2 bg-white rounded-lg p-4 border border-primary-200">
          <Calendar className="w-5 h-5 text-primary-600" />
          <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors cursor-pointer"
            >
              {months.map((month, index) => (
                <option key={index} value={index + 1}>
                  {month}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors cursor-pointer"
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
        </div>
      </div>

      {/* Barangay Information */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Info className="w-5 h-5 text-primary-600" />
          <h2 className="text-lg font-semibold text-gray-900">Barangay Information</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <Building2 className="w-4 h-4 text-gray-400 mt-1" />
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium">Barangay</p>
              <p className="text-sm font-medium text-gray-900">{report.barangay.name}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <MapPin className="w-4 h-4 text-gray-400 mt-1" />
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium">Address</p>
              <p className="text-sm text-gray-900">{report.barangay.address}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Phone className="w-4 h-4 text-gray-400 mt-1" />
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium">Contact Number</p>
              <p className="text-sm text-gray-900">{report.barangay.contact_number || "N/A"}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Mail className="w-4 h-4 text-gray-400 mt-1" />
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium">Email</p>
              <p className="text-sm text-gray-900">{report.barangay.email}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Report Period & Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-primary-50 to-white rounded-lg border border-primary-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-primary-600" />
            </div>
            <p className="text-xs text-primary-700 uppercase font-semibold">Total Incidents</p>
          </div>
          <p className="text-3xl font-bold text-primary-900">{totalIncidents}</p>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-white rounded-lg border border-orange-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-100 rounded-lg">
              <MessageSquare className="w-5 h-5 text-orange-600" />
            </div>
            <p className="text-xs text-orange-700 uppercase font-semibold">Total Complaints</p>
          </div>
          <p className="text-3xl font-bold text-orange-900">{totalComplaints}</p>
        </div>
      </div>

      {/* Category-wise Report Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-purple-100 rounded-lg">
            <AlertCircle className="w-5 h-5 text-purple-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Incidents by Category</h2>
        </div>
        
        {/* Category Filter Button */}
        <div className="relative category-filter-container">
          <button
                onClick={() => setShowCategoryFilter(!showCategoryFilter)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 cursor-pointer"
              >
                <Filter className="w-4 h-4" />
                Filter Categories
                {selectedCategories.length < availableCategories.length && (
                  <span className="ml-1 px-2 py-0.5 bg-primary-800 rounded-full text-xs font-semibold">
                    {selectedCategories.length}
                  </span>
                )}
              </button>
              
              {/* Category Filter Dropdown */}
              {showCategoryFilter && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded border border-gray-300 shadow-lg z-50">
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-gray-900">Select Categories</h3>
                      <button
                        onClick={() => setShowCategoryFilter(false)}
                        className="p-1 hover:bg-gray-100 rounded transition-colors cursor-pointer"
                      >
                        <X className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>
                    
                    <div className="flex gap-2 mb-3">
                      <button
                        onClick={selectAllCategories}
                        className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-primary-600 hover:bg-primary-700 rounded transition-colors cursor-pointer"
                      >
                        Select All
                      </button>
                      <button
                        onClick={deselectAllCategories}
                        className="flex-1 px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-300 hover:bg-gray-50 rounded transition-colors cursor-pointer"
                      >
                        Clear All
                      </button>
                    </div>
                    
                    <div className="max-h-96 overflow-y-auto space-y-2">
                      {availableCategories.map((category) => (
                        <label
                          key={category.category}
                          className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={selectedCategories.includes(category.category)}
                            onChange={() => toggleCategory(category.category)}
                            className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-2 focus:ring-primary-500 cursor-pointer"
                          />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">
                              {formatCategoryName(category.category)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {category.total_incidents} incident{category.total_incidents !== 1 ? 's' : ''} • {category.total_complaint_count} complaint{category.total_complaint_count !== 1 ? 's' : ''}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
        </div>
      </div>
        
      {/* Categories Grid */}
      {filteredCategories.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredCategories.map((category, index) => (
              <div key={index} className="bg-white rounded-lg border border-gray-200 p-4 hover:border-primary-300 hover:shadow-md transition-all">
                <div className="flex items-start gap-2 mb-3">
                  <div className="p-2 bg-gradient-to-br from-purple-100 to-primary-100 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-purple-600" />
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 line-clamp-2 flex-1">
                    {formatCategoryName(category.category)}
                  </h3>
                </div>

                <div className="flex gap-2 mb-3">
                  <div className="flex-1 bg-gradient-to-br from-primary-50 to-white border border-primary-200 rounded px-3 py-2">
                    <div className="flex justify-center items-center gap-1 mb-1">
                      <TrendingUp className="w-3 h-3 text-primary-600" />
                      <p className="text-xs text-center text-primary-700 font-medium">Incidents</p>
                    </div>
                    <p className="text-xl text-center font-semibold text-primary-900">{category.total_incidents}</p>
                  </div>
                  <div className="flex-1 bg-gradient-to-br from-orange-50 to-white border border-orange-200 rounded px-3 py-2">
                    <div className="flex items-center gap-1 mb-1">
                      <MessageSquare className="w-3 h-3 text-orange-600" />
                      <p className="text-xs text-center text-orange-700 font-medium">Complaints</p>
                    </div>
                    <p className="text-xl text-center font-semibold text-orange-900">{category.total_complaint_count}</p>
                  </div>
                </div>

                {/* View All Incidents Button */}
                <button
                  onClick={() => handleViewAllIncidents(category.category)}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded hover:from-primary-700 hover:to-primary-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-all shadow-sm hover:shadow text-sm font-medium cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  View Details
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg border border-gray-200 p-12 text-center">
            {availableCategories.length === 0 ? (
              <div className="text-gray-500">
                <div className="inline-flex p-4 bg-gray-100 rounded-full mb-4">
                  <AlertCircle className="w-12 h-12 text-gray-400" />
                </div>
                <p className="text-lg font-semibold text-gray-900">No incidents reported</p>
                <p className="text-sm mt-1 text-gray-600">There are no incidents for this period.</p>
              </div>
            ) : (
              <div className="text-gray-500">
                <div className="inline-flex p-4 bg-primary-100 rounded-full mb-4">
                  <Filter className="w-12 h-12 text-primary-600" />
                </div>
                <p className="text-lg font-semibold text-gray-900">No categories selected</p>
                <p className="text-sm mt-1 text-gray-600">Please select at least one category to view incidents.</p>
                <button
                  onClick={selectAllCategories}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded hover:from-primary-700 hover:to-primary-800 transition-all shadow-sm hover:shadow text-sm font-medium cursor-pointer"
                >
                  <AlertCircle className="w-4 h-4" />
                  Show All Categories
                </button>
              </div>
            )}
          </div>
        )}
    </div>
  );
};
