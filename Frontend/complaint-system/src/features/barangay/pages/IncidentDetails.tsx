import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useIncidentDetails, useIncidentComplaints } from "../../../hooks/useIncidents";
import { ArrowLeft, AlertCircle, Calendar, MapPin, Users } from "lucide-react";
import { StatusBadge } from '../components/StatusBadge';
import type { Complaint } from "../../../types/complaints/complaint";
import { formatCategoryName } from "../../../utils/categoryFormatter";
import LoadingIndicator from "../../general/LoadingIndicator";

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case "LOW":
      return "bg-green-100 text-green-800 border-green-200";
    case "MEDIUM":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "HIGH":
      return "bg-orange-100 text-orange-800 border-orange-200";
    case "VERY_HIGH":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

const ComplaintCard: React.FC<{ complaint: Complaint }> = ({ complaint }) => (
  <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
    <div className="flex justify-between items-start mb-3">
      <div>
        <h4 className="font-semibold text-gray-900 text-sm">
          #{complaint.id} - {complaint.title}
        </h4>
        <p className="text-xs text-gray-500 mt-1">
          {complaint.user
            ? `${complaint.user.first_name} ${complaint.user.last_name}`
            : "Unknown"}
        </p>
      </div>
      <StatusBadge status={complaint.status} />
    </div>
    <p className="text-xs text-gray-600 mb-3 line-clamp-2">
      {complaint.description}
    </p>
    <div className="flex items-center gap-4 text-xs text-gray-500">
      <div className="flex items-center gap-1">
        <MapPin size={14} />
        <span>{complaint.location_details || "N/A"}</span>
      </div>
      <div className="flex items-center gap-1">
        <Calendar size={14} />
        <span>{new Date(complaint.created_at).toLocaleDateString("en-PH")}</span>
      </div>
    </div>
  </div>
);

export const IncidentDetails: React.FC = () => {
  const { t } = useTranslation();
  const { incidentId } = useParams<{ incidentId: string }>();
  const navigate = useNavigate();
  const [showComplaints, setShowComplaints] = useState(false);

  const { incident, isLoading, error } = useIncidentDetails(Number(incidentId));
  const {
    complaints,
    isLoading: complaintsLoading,
    error: complaintsError,
    refetch: refetchComplaints,
  } = useIncidentComplaints(Number(incidentId), showComplaints);

  const handleViewComplaints = () => {
    setShowComplaints(true);
    refetchComplaints();
  };

  if (isLoading) {
    return (
        <LoadingIndicator />
    );
  }

  if (error || !incident) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
        <AlertCircle className="inline mr-2" size={18} />
        Failed to load incident details. Please try again.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => navigate("/dashboard/incidents")}
        className="flex items-center bg-blue-700 gap-2 text-sm text-white hover:text-black-400 hover:bg-blue-600 transition cursor-pointer rounded-lg px-3 py-2 w-max focus:outline-none focus:ring-2 focus:ring-blue-300"
      >
        <ArrowLeft size={16} />
        {t('incidents.details.backToIncidents')}
      </button>

      {/* Incident Header */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{incident.title}</h1>
            <p className="text-sm text-gray-500 mt-1">Incident #{incident.id}</p>
          </div>
          <span
            className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium border ${getSeverityColor(incident.severity_level)}`}
          >
            {incident.severity_level.replace("_", " ")}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <AlertCircle className="text-blue-600" size={20} />
            </div>
            <div>
              <p className="text-xs text-gray-500">Category</p>
              <p className="text-sm font-semibold text-gray-900">
                {formatCategoryName(incident.category?.category_name)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <MapPin className="text-purple-600" size={20} />
            </div>
            <div>
              <p className="text-xs text-gray-500">Barangay</p>
              <p className="text-sm font-semibold text-gray-900">
                {incident.barangay?.barangay_name || "N/A"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <Users className="text-green-600" size={20} />
            </div>
            <div>
              <p className="text-xs text-gray-500">{t('incidents.details.totalComplaints')}</p>
              <p className="text-sm font-semibold text-gray-900">
                {incident.complaint_count}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">{t('incidents.details.description')}</h2>
        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
          {incident.description}
        </p>
      </div>

      {/* Additional Details */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {t('incidents.details.additionalDetails')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">{t('incidents.details.firstReported')}</p>
            <p className="text-sm font-medium text-gray-900">
              {new Date(incident.first_reported_at).toLocaleDateString("en-PH", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">{t('incidents.details.lastReported')}</p>
            <p className="text-sm font-medium text-gray-900">
              {new Date(incident.last_reported_at).toLocaleDateString("en-PH", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Severity Score</p>
            <p className="text-sm font-medium text-gray-900">
              {incident.severity_score}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Status</p>
            <p className="text-sm font-medium text-gray-900 capitalize">
              {incident.status.replace("_", " ")}
            </p>
          </div>
        </div>
      </div>

      {/* View Complaints Section */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {t('incidents.details.relatedComplaints')} ({incident.complaint_count})
          </h2>
          {!showComplaints && (
            <button
              onClick={handleViewComplaints}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              {t('incidents.details.viewAllComplaints')}
            </button>
          )}
        </div>

        {showComplaints && (
          <div className="space-y-3">
            {complaintsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : complaintsError ? (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                Failed to load complaints. Please try again.
              </div>
            ) : complaints && complaints.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {complaints.map((complaint) => (
                  <ComplaintCard key={complaint.id} complaint={complaint} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-8">
                No complaints found for this incident.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
