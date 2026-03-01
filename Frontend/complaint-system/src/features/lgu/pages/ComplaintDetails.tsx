import { useParams, useNavigate } from "react-router-dom";
import { useComplaintDetails } from "../../../hooks/useComplaints";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { StatusBadge } from '../../barangay/components/StatusBadge';
import { ComplaintInfoGrid } from '../../barangay/components/ComplaintInfoGrid';
import { AttachmentButton } from '../../barangay/components/AttachmentButton';
import LoadingIndicator from "../../general/LoadingIndicator";
import { useAuthStore } from "../../../store/authStore";
import { formatStatus } from "../../../utils/incidentHelpers";

export const LguComplaintDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const userRole = useAuthStore(state => state.userRole);
  
  const { complaint, isLoading, error } = useComplaintDetails(Number(id));

  if (isLoading) {
    return <LoadingIndicator />;
  }

  if (error || !complaint) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => navigate("/lgu/incidents")}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <ArrowLeft size={16} />
          Back to Incidents
        </button>
        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
          <AlertCircle className="inline mr-2" size={18} />
          {error ? "Failed to load complaint details. Please try again." : "Complaint not found."}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        <ArrowLeft size={16} />
        Back to Complaints
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="space-y-4 sm:space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-0 mb-4">
              <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 break-words">{complaint.title}</h1>
                <p className="text-sm text-gray-500 mt-1">Complaint #{complaint.id}</p>
              </div>
              <div className="shrink-0">
                <StatusBadge status={complaint.status} userRole={userRole || undefined} />
              </div>
            </div>

            <ComplaintInfoGrid complaint={complaint} />
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Description</h2>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {complaint.description}
            </p>
          </div>

        </div>

        <div className="space-y-4 sm:space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-xs text-gray-500 mb-1">Submitted</p>
                <p className="text-sm font-medium text-gray-900">
                  {new Date(complaint.created_at).toLocaleDateString("en-PH", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Status</p>
                <p className="text-sm font-medium text-gray-900 capitalize">
                  {formatStatus(complaint.status, userRole || undefined)}
                </p>
              </div>
              {complaint.user && (
                <>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Reporter Email</p>
                    <p className="text-sm font-medium text-gray-900">
                      {complaint.user.email}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Reporter Phone</p>
                    <p className="text-sm font-medium text-gray-900">
                      {complaint.user.phone_number || "N/A"}
                    </p>
                  </div>
                </>
              )}
            </div>

            {complaint.attachment && complaint.attachment.length > 0 && (
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Attachments ({complaint.attachment.length})
                </h3>
                <div className="space-y-3">
                  {complaint.attachment.map((attachment) => (
                    <AttachmentButton key={attachment.id} attachment={attachment} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
