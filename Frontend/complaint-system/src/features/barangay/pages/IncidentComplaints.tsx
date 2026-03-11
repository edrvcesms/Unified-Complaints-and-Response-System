import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState, useMemo } from "react";
import { useTranslation } from 'react-i18next';
import { useIncidentDetails, useIncidentComplaints, useMarkIncidentAsViewed } from "../../../hooks/useIncidents";
import { ArrowLeft } from "lucide-react";
import LoadingIndicator from "../../general/LoadingIndicator";
import { SkeletonComplaintCard } from "../components/Skeletons";
import { ComplaintCard } from "../components/ComplaintCard";
import { Pagination } from "../components/Pagination";

const ITEMS_PER_PAGE = 9;

export const IncidentComplaints: React.FC = () => {
  const { incidentId } = useParams<{ incidentId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { incident, isLoading: incidentLoading } = useIncidentDetails(Number(incidentId));
  const {
    complaints,
    isLoading: complaintsLoading,
    error: complaintsError,
  } = useIncidentComplaints(Number(incidentId), true);
  
  const markAsViewed = useMarkIncidentAsViewed();
  const hasMarkedAsViewed = useRef(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Calculate pagination
  const totalPages = useMemo(() => {
    return complaints ? Math.ceil(complaints.length / ITEMS_PER_PAGE) : 0;
  }, [complaints]);

  const paginatedComplaints = useMemo(() => {
    if (!complaints) return [];
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return complaints.slice(start, end);
  }, [complaints, currentPage]);

  useEffect(() => {
    if (!hasMarkedAsViewed.current && incident && (incident.has_new_complaints || (incident.new_complaint_count && incident.new_complaint_count > 0))) {
      markAsViewed.mutate(Number(incidentId));
      hasMarkedAsViewed.current = true;
    }
  }, [incident]);

  const handleComplaintClick = (complaintId: number) => {
    navigate(`/dashboard/incidents/complaints/${complaintId}`);
  };

  if (incidentLoading) {
    return <LoadingIndicator />;
  }

  if (!incident) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
        {t('errors.loadIncident')}
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <button
          onClick={() => navigate(`/dashboard/incidents/${incidentId}`)}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 mb-4"
        >
          <ArrowLeft size={16} />
          {t('btn.backIncident')}
        </button>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 break-words">
          {t('complaint.incidentTitle', { id: incident.id })}
        </h1>
        <p className="text-sm text-gray-600 mt-1 break-words">
          {incident.title}
        </p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
        <div className="mb-4 sm:mb-6"><h2 className="text-base sm:text-lg font-semibold text-gray-900">
            {t('complaint.allComplaints')} ({incident.complaint_count})
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {t('complaint.description')}
          </p>
        </div>

        {complaintsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <SkeletonComplaintCard />
            <SkeletonComplaintCard />
            <SkeletonComplaintCard />
            <SkeletonComplaintCard />
            <SkeletonComplaintCard />
            <SkeletonComplaintCard />
          </div>
        ) : complaintsError ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {t('errors.loadComplaints')}
          </div>
        ) : complaints && complaints.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedComplaints.map((complaint) => (
                <ComplaintCard 
                  key={complaint.id} 
                  complaint={complaint} 
                  onClick={handleComplaintClick}
                />
              ))}
            </div>
            {totalPages > 1 && (
              <div className="mt-4">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
            <p className="text-xs text-gray-500 text-right mt-2">
              {t('complaint.showingCount', { count: paginatedComplaints.length, total: complaints.length })}
            </p>
          </>
        ) : (
          <p className="text-sm text-gray-500 text-center py-12">
            {t('complaint.noComplaints')}
          </p>
        )}
      </div>
    </div>
  );
};
