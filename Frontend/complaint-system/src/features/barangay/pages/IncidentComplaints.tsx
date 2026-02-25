import { useParams, useNavigate } from "react-router-dom";
import { useIncidentDetails, useIncidentComplaints } from "../../../hooks/useIncidents";
import { ArrowLeft } from "lucide-react";
import LoadingIndicator from "../../general/LoadingIndicator";
import { SkeletonComplaintCard } from "../components/Skeletons";
import { ComplaintCard } from "../components/ComplaintCard";

export const IncidentComplaints: React.FC = () => {
  const { incidentId } = useParams<{ incidentId: string }>();
  const navigate = useNavigate();

  const { incident, isLoading: incidentLoading } = useIncidentDetails(Number(incidentId));
  const {
    complaints,
    isLoading: complaintsLoading,
    error: complaintsError,
  } = useIncidentComplaints(Number(incidentId), true);

  const handleComplaintClick = (complaintId: number) => {
    navigate(`/dashboard/incidents/complaints/${complaintId}`);
  };

  if (incidentLoading) {
    return (
      
        <LoadingIndicator />
      
    );
  }

  if (!incident) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
        Failed to load incident details.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate(`/dashboard/incidents/${incidentId}`)}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 mb-4"
          >
            <ArrowLeft size={16} />
            Back to Incident Details
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            Related Complaints for Incident #{incident.id}
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {incident.title}
          </p>
        </div>
      </div>

      {/* Complaints List */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            All Complaints ({incident.complaint_count})
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Here are all the individual complaints that have been grouped together as part of this incident.
          </p>
        </div>

        {complaintsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {complaints.map((complaint) => (
              <ComplaintCard 
                key={complaint.id} 
                complaint={complaint} 
                onClick={handleComplaintClick}
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
