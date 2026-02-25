import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from "react-router-dom";
import { useIncidentDetails } from "../../../hooks/useIncidents";
import { ArrowLeft, AlertCircle, MapPin, Users } from "lucide-react";
import { formatCategoryName } from "../../../utils/categoryFormatter";
import LoadingIndicator from "../../general/LoadingIndicator";
import { useResolveIncident, useReviewIncident } from '../../../hooks/useIncidents';
import { ConfirmationModal } from "../../general/ConfirmationModal";
import { useConfirmationModal } from "../../../hooks/useConfirmationModal";
import { SuccessModal } from "../../general/SuccessModal";
import { ErrorModal } from "../../general/ErrorModal";

export const IncidentDetails: React.FC = () => {
  const { t } = useTranslation();
  const { incidentId } = useParams<{ incidentId: string }>();
  const navigate = useNavigate();

  const { incident, isLoading, error } = useIncidentDetails(Number(incidentId));

  const resolveIncidentMutation = useResolveIncident(Number(incidentId));
  const reviewIncidentMutation = useReviewIncident(Number(incidentId));

  const confirmationModal = useConfirmationModal();
  const [successModal, setSuccessModal] = useState<{ isOpen: boolean; title: string; message: string }>({
    isOpen: false,
    title: '',
    message: '',
  });
  const [errorModal, setErrorModal] = useState<{ isOpen: boolean; title: string; message: string }>({
    isOpen: false,
    title: '',
    message: '',
  });

  // Handle successful resolve
  useEffect(() => {
    if (resolveIncidentMutation.isSuccess) {
      confirmationModal.closeModal();
      setSuccessModal({
        isOpen: true,
        title: 'Success!',
        message: 'The incident has been resolved successfully.',
      });
    }
  }, [resolveIncidentMutation.isSuccess]);

  // Handle successful review
  useEffect(() => {
    if (reviewIncidentMutation.isSuccess) {
      confirmationModal.closeModal();
      setSuccessModal({
        isOpen: true,
        title: 'Success!',
        message: 'The incident has been marked for review successfully.',
      });
    }
  }, [reviewIncidentMutation.isSuccess]);

  // Handle resolve error
  useEffect(() => {
    if (resolveIncidentMutation.isError) {
      confirmationModal.closeModal();
      const error = resolveIncidentMutation.error as any;
      const errorMessage = error?.response?.data?.detail || 'Failed to resolve incident. Please try again.';
      setErrorModal({
        isOpen: true,
        title: 'Error',
        message: errorMessage,
      });
    }
  }, [resolveIncidentMutation.isError]);

  // Handle review error
  useEffect(() => {
    if (reviewIncidentMutation.isError) {
      confirmationModal.closeModal();
      const error = reviewIncidentMutation.error as any;
      const errorMessage = error?.response?.data?.detail || 'Failed to mark incident for review. Please try again.';
      setErrorModal({
        isOpen: true,
        title: 'Error',
        message: errorMessage,
      });
    }
  }, [reviewIncidentMutation.isError]);

  const handleViewAllComplaints = () => {
    navigate(`/dashboard/incidents/${incidentId}/complaints`);
  };

  const handleResolve = () => {
    confirmationModal.openModal({
      title: "Resolve Incident",
      message: "Are you sure you want to resolve this incident? This action will mark the incident as resolved.",
      confirmText: "Resolve",
      confirmColor: "green",
      onConfirm: async () => {
        await resolveIncidentMutation.mutateAsync();
      },
    });
  };

  const handleReview = () => {
    confirmationModal.openModal({
      title: "Mark for Review",
      message: "Are you sure you want to mark this incident for review?",
      confirmText: "Confirm",
      confirmColor: "yellow",
      onConfirm: async () => {
        await reviewIncidentMutation.mutateAsync();
      },
    });
  };

  if (isLoading) {
    return (
        <LoadingIndicator />
    );
  }

  if (error || !incident) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
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
        className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        <ArrowLeft size={16} />
        {t('incidents.details.backToIncidents')}
      </button>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT COLUMN */}
        <div className="space-y-6">
          {/* Incident Header */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{incident.title}</h1>
                <p className="text-sm text-gray-500 mt-1">Incident #{incident.id}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0">
                  <AlertCircle className="text-blue-600" size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500">Category</p>
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {formatCategoryName(incident.category?.category_name)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0">
                  <MapPin className="text-purple-600" size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500">Barangay</p>
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {incident.barangay?.barangay_name || "N/A"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg  flex items-center justify-center shrink-0">
                  <AlertCircle className="text-orange-600" size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500">Severity Level</p>
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {incident.severity_level.replace("_", " ")}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0">
                  <Users className="text-green-600" size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500">{t('incidents.details.totalComplaints')}</p>
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {incident.complaint_count}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">{t('incidents.details.description')}</h2>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {incident.description}
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">
          {/* Additional Details */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {t('incidents.details.additionalDetails')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
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
                <p className="text-xs text-gray-500 mb-1">Severity Score</p>
                <p className="text-sm font-medium text-gray-900">
                  {incident.severity_score}
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
                <p className="text-xs text-gray-500 mb-1">Status</p>
                <p className="text-sm font-medium text-gray-900 capitalize">
                  {incident.status.replace("_", " ")}
                </p>
              </div>
            </div>

            {/* Related Complaints Section */}
            <div className="border-t pt-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900">
                  {t('incidents.details.relatedComplaints')} ({incident.complaint_count})
                </h3>
                <button
                  onClick={handleViewAllComplaints}
                  className="px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  {t('incidents.details.viewAllComplaints')}
                </button>
              </div>
              <p className="text-sm text-gray-600">
                View all the related complaints in this incident.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3">
        <button
          onClick={handleReview}
          disabled={reviewIncidentMutation.isPending}
          className="px-4 py-2 bg-yellow-600 text-white text-sm font-medium rounded-md hover:bg-yellow-700 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {reviewIncidentMutation.isPending ? "Reviewing..." : "Mark for Review"}
        </button>
        <button
          onClick={handleResolve}
          disabled={resolveIncidentMutation.isPending}
          className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {resolveIncidentMutation.isPending ? "Resolving..." : "Resolve Incident"}
        </button>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmationModal.isOpen}
        title={confirmationModal.title}
        message={confirmationModal.message}
        confirmText={confirmationModal.confirmText}
        confirmColor={confirmationModal.confirmColor}
        onConfirm={confirmationModal.confirm}
        onCancel={confirmationModal.closeModal}
        isLoading={confirmationModal.isLoading}
      />

      {/* Success Modal */}
      <SuccessModal
        isOpen={successModal.isOpen}
        title={successModal.title}
        message={successModal.message}
        onClose={() => setSuccessModal({ isOpen: false, title: '', message: '' })}
      />

      {/* Error Modal */}
      <ErrorModal
        isOpen={errorModal.isOpen}
        title={errorModal.title}
        message={errorModal.message}
        onClose={() => setErrorModal({ isOpen: false, title: '', message: '' })}
      />
    </div>
  );
};
