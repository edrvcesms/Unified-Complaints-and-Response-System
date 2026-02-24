import { useParams, useNavigate } from "react-router-dom";
import { useComplaintDetails } from "../../../hooks/useComplaints";
import { ArrowLeft, AlertCircle, MapPin } from "lucide-react";
import { StatusBadge } from '../components/StatusBadge';
import { AttachmentViewer } from '../components/AttachmentViewer';
import { ComplaintInfoGrid } from '../components/ComplaintInfoGrid';
import LoadingIndicator from "../../general/LoadingIndicator";

export const ComplaintDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const { complaint, isLoading, error } = useComplaintDetails(Number(id));

  if (isLoading) {
    return <LoadingIndicator />;
  }

  if (error || !complaint) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => navigate("/dashboard/incidents")}
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
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        <ArrowLeft size={16} />
        Back to Complaints
      </button>

      {/* Complaint Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{complaint.title}</h1>
            <p className="text-sm text-gray-500 mt-1">Complaint #{complaint.id}</p>
          </div>
          <StatusBadge status={complaint.status} />
        </div>

        <ComplaintInfoGrid complaint={complaint} />
      </div>

      {/* Description */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Description</h2>
        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
          {complaint.description}
        </p>
      </div>

      {/* Location Details */}
      {complaint.location_details && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Location Details</h2>
          <div className="flex items-start gap-3">
            <MapPin className="text-gray-400 mt-0.5" size={18} />
            <p className="text-sm text-gray-700 leading-relaxed">
              {complaint.location_details}
            </p>
          </div>
        </div>
      )}

      {/* Attachments */}
      {complaint.attachment && complaint.attachment.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Attachments ({complaint.attachment.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {complaint.attachment.map((attachment) => (
              <AttachmentViewer key={attachment.id} attachment={attachment} />
            ))}
          </div>
        </div>
      )}

      {/* Additional Information */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              {complaint.status.replace("_", " ")}
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
      </div>
    </div>
  );
};
