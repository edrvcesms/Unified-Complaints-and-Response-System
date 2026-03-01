import { useParams, useNavigate } from "react-router-dom";
import { useIncidentDetails, useIncidentComplaints } from "../../../hooks/useIncidents";
import { ArrowLeft } from "lucide-react";
import LoadingIndicator from "../../general/LoadingIndicator";
import { SkeletonComplaintCard } from "../../barangay/components/Skeletons";
import { ComplaintCard } from "../../barangay/components/ComplaintCard";
import { useAuthStore } from "../../../store/authStore";

export const LguIncidentComplaints: React.FC = () => {
  const { incidentId } = useParams<{ incidentId: string }>();
  const navigate = useNavigate();
  const userRole = useAuthStore(state => state.userRole);

  const { incident, isLoading: incidentLoading } = useIncidentDetails(Number(incidentId));
  const {
    complaints,
    isLoading: complaintsLoading,
    error: complaintsError,
  } = useIncidentComplaints(Number(incidentId), true);

  const handleComplaintClick = (complaintId: number) => {
    navigate(`/lgu/incidents/complaints/${complaintId}`);
  };

  if (incidentLoading) {
    return <LoadingIndicator />;
  }

  if (!incident) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
        Failed to load incident details.
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <button
          onClick={() => navigate(`/lgu/incidents/${incidentId}`)}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 mb-4"
        >
          <ArrowLeft size={16} />
          Back to Incident Details
        </button>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 break-words">
          Related Complaints for Incident #{incident.id}
        </h1>
        <p className="text-sm text-gray-600 mt-1 break-words">
          {incident.title}
        </p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
        <div className="mb-4 sm:mb-6">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">
            All Complaints ({incident.complaint_count})
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Here are all the individual complaints that have been grouped together as part of this incident.
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
            Failed to load complaints. Please try again.
          </div>
        ) : complaints && complaints.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {complaints.map((complaint) => (
              <ComplaintCard 
                key={complaint.id} 
                complaint={complaint} 
                onClick={handleComplaintClick}
                userRole={userRole || undefined}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-12">
            No complaints found for this incident.
          </p>
        )}
      </div>
    </div>
  );
};
