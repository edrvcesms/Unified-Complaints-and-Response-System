import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from "react-router-dom";
import MapModal from '../../../components/MapModal';
import { useIncidentDetails } from "../../../hooks/useIncidents";
import { ArrowLeft, AlertCircle, MapPin, Users} from "lucide-react";
import { formatCategoryName } from "../../../utils/categoryFormatter";
import { formatDateTime } from "../../../utils/dateUtils";
import LoadingIndicator from "../../general/LoadingIndicator";
import { useState, useEffect } from "react";
import { ActionsTakenModal } from "../../general/ActionsTakenModal";
import { useActionsTakenModal } from "../../../hooks/useActionsTakenModal";
import { useReviewIncident, useResolveIncident, useRejectIncident } from '../../../hooks/useIncidents';
import { useToast } from "../../../hooks/useToast";
import { ToastContainer } from "../../../components/Toast";
import { isAbortError } from "../../../utils/axiosException";
import { SuccessModal } from "../../general/SuccessModal";
import { ErrorModal } from "../../general/ErrorModal";
import { validateAttachments } from '../../../utils/attachmentHelper';

export const LguIncidentDetails: React.FC = () => {
  const actionsTakenModal = useActionsTakenModal();
  const { t } = useTranslation();
  const { incidentId } = useParams<{ incidentId: string }>();
  const navigate = useNavigate();

  const { incident, isLoading, error } = useIncidentDetails(Number(incidentId));
  const { toasts } = useToast();

  const reviewIncidentMutation = useReviewIncident(Number(incidentId));
  const resolveIncidentMutation = useResolveIncident(Number(incidentId));
  const rejectIncidentMutation = useRejectIncident(Number(incidentId));
  const [successModal, setSuccessModal] = useState<{ isOpen: boolean; title: string; message: string }>(
    { isOpen: false, title: '', message: '' }
  );
  const [errorModal, setErrorModal] = useState<{ isOpen: boolean; title: string; message: string }>(
    { isOpen: false, title: '', message: '' }
  );

  // Map modal state
  const [isMapOpen, setIsMapOpen] = useState(false);


  useEffect(() => {
    if (resolveIncidentMutation.isSuccess) {
      actionsTakenModal.closeModal();
      setErrorModal({ isOpen: false, title: '', message: '' });
      setSuccessModal({
        isOpen: true,
        title: 'Success!',
        message: 'The incident has been resolved successfully.',
      });
    }
  }, [resolveIncidentMutation.isSuccess]);

  useEffect(() => {
    if (reviewIncidentMutation.isSuccess) {
      actionsTakenModal.closeModal();
      setErrorModal({ isOpen: false, title: '', message: '' });
      setSuccessModal({
        isOpen: true,
        title: 'Success!',
        message: 'The incident has been marked for review successfully.',
      });
    }
  }, [reviewIncidentMutation.isSuccess]);

  useEffect(() => {
    if (rejectIncidentMutation.isSuccess) {
      actionsTakenModal.closeModal();
      setErrorModal({ isOpen: false, title: '', message: '' });
      setSuccessModal({
        isOpen: true,
        title: 'Success!',
        message: 'The incident has been rejected successfully.',
      });
    }
  }, [rejectIncidentMutation.isSuccess]);

  useEffect(() => {
    if (resolveIncidentMutation.isError) {
      actionsTakenModal.closeModal();
      setSuccessModal({ isOpen: false, title: '', message: '' });
      const error = resolveIncidentMutation.error as any;
      const errorMessage = error?.response?.data?.detail || 'Failed to resolve incident. Please try again.';
      setErrorModal({
        isOpen: true,
        title: 'Error',
        message: errorMessage,
      });
    }
  }, [resolveIncidentMutation.isError]);

  useEffect(() => {
    if (reviewIncidentMutation.isError) {
      actionsTakenModal.closeModal();
      const error = reviewIncidentMutation.error as any;
      if (isAbortError(error)) {
        return;
      }
      setSuccessModal({ isOpen: false, title: '', message: '' });
      const errorMessage = error?.response?.data?.detail || 'Failed to mark incident for review. Please try again.';
      setErrorModal({
        isOpen: true,
        title: 'Error',
        message: errorMessage,
      });
    }
  }, [reviewIncidentMutation.error, reviewIncidentMutation.isError]);

  useEffect(() => {
    if (rejectIncidentMutation.isError) {
      actionsTakenModal.closeModal();
      setSuccessModal({ isOpen: false, title: '', message: '' });
      const error = rejectIncidentMutation.error as any;
      const errorMessage = error?.response?.data?.detail || 'Failed to reject incident. Please try again.';
      setErrorModal({
        isOpen: true,
        title: 'Error',
        message: errorMessage,
      });
    }
  }, [rejectIncidentMutation.isError]);


  const handleViewAllComplaints = () => {
    navigate(`/lgu/incidents/${incidentId}/complaints`);
  };

  // Add actions taken modal logic for resolve/review
  const handleResolve = () => {
    actionsTakenModal.openModal({
      title: "Resolve Incident",
      description: "Please describe the actions taken to resolve this incident. This will be recorded and visible to complainants.",
      confirmText: "Resolve",
      confirmColor: "green",
      onConfirm: async (actionsTaken: string, attachments: File[]) => {
        try {
          const validationError = validateAttachments(attachments);
          if (validationError) {
            return;
          }
          actionsTakenModal.setIsLoading(true);
          await resolveIncidentMutation.mutateAsync({ actions_taken: actionsTaken, attachments });
        } catch (err) {
          console.error(err);
        } finally {
          actionsTakenModal.setIsLoading(false);
        }
      },
    });
  };

  const handleReview = () => {
    const abortController = new AbortController();
    actionsTakenModal.openModal({
      title: "Mark for Review",
      description: "Please describe the actions taken or the reason this incident is being flagged for further review.",
      confirmText: "Confirm",
      confirmColor: "yellow",
      onConfirm: async (actionsTaken: string, attachments: File[]) => {
        try {
          const validationError = validateAttachments(attachments);
          if (validationError) {
            return;
          }
          actionsTakenModal.setIsLoading(true);
          await reviewIncidentMutation.mutateAsync({
            actions_taken: actionsTaken,
            attachments,
            signal: abortController.signal,
          });
        } catch (err) {
          if (!isAbortError(err)) {
            console.error(err);
          }
        } finally { actionsTakenModal.setIsLoading(false); }
      },
      onCancel: () => {
        abortController.abort();
        reviewIncidentMutation.reset();
      },
    });
  };

  const handleReject = () => {
    actionsTakenModal.openModal({
      title: "Reject Incident",
      description: "Please provide the reason for rejecting this incident. This will be recorded and visible to complainants.",
      confirmText: "Reject",
      confirmColor: "red",
      onConfirm: async (actionsTaken: string, attachments: File[]) => {
        const validationError = validateAttachments(attachments);
        if (validationError) {
          return;
        }

        try {
          actionsTakenModal.setIsLoading(true);
          await rejectIncidentMutation.mutateAsync({ actions_taken: actionsTaken, attachments });
        } catch (err) {
          console.error(err);
        } finally {
          actionsTakenModal.setIsLoading(false);
        }
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
  
  const incidentStatus = incident.complaint_clusters[0]?.complaint?.status ?? "submitted";
  const isSubmitted = incidentStatus === "submitted";
  const isUnderReviewByBarangay = incidentStatus === "reviewed_by_barangay";
  const isUnderReviewByLgu = incidentStatus === "reviewed_by_lgu";
  const isResolved = incidentStatus === "resolved_by_barangay" || incidentStatus === "resolved_by_lgu";
  const isRejectedByLgu = incident.complaint_clusters[0]?.complaint?.is_rejected_by_lgu === true;
  const isRejected = incidentStatus === "rejected" || incidentStatus === "rejected_by_lgu" || isRejectedByLgu;
  const isForwardedToLgu = incidentStatus === "forwarded_to_lgu";

  const titleStatusBadge = isResolved
    ? { label: 'Resolved', className: 'bg-green-50 text-green-700 border-green-200', dotClassName: 'bg-green-600' }
    : isRejected || isRejectedByLgu
      ? { label: 'Rejected', className: 'bg-red-50 text-red-700 border-red-200', dotClassName: 'bg-red-600' }
      : isUnderReviewByBarangay || isUnderReviewByLgu
        ? { label: 'Under Review', className: 'bg-yellow-50 text-yellow-700 border-yellow-200', dotClassName: 'bg-yellow-600' }
        : isForwardedToLgu
          ? { label: 'Forwarded', className: 'bg-blue-50 text-blue-700 border-blue-200', dotClassName: 'bg-blue-600' }
          : null;

  const responses = incident.responses ?? [];
  const sortedResponses = [...responses].sort((a, b) => {
    const aTime = new Date(a.response_date).getTime();
    const bTime = new Date(b.response_date).getTime();
    return bTime - aTime;
  });

  // formatHearingDate removed — not used in this view


  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate("/lgu/incidents")}
        className="flex items-center gap-2 px-3 py-2 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
      >
        <ArrowLeft size={16} />
        {t('incidents.details.backToIncidents')}
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="space-y-4 sm:space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900 break-words">{incident.title}</h1>
                  {titleStatusBadge && (
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-semibold ${titleStatusBadge.className}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${titleStatusBadge.dotClassName}`} />
                      {titleStatusBadge.label}
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-1">Incident #{incident.id}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0">
                  <AlertCircle className="text-primary-600" size={20} />
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
                  {incident.latitude !== null && incident.longitude !== null && (
                    <button
                      className="mt-2 px-3 py-1 bg-primary-600 text-white text-xs rounded hover:bg-primary-700 transition-colors"
                      onClick={() => setIsMapOpen(true)}
                    >
                      View Incident Location
                    </button>
                  )}
                </div>
              </div>
      {/* Map Modal */}
      {incident.latitude !== null && incident.longitude !== null && (
        <MapModal
          open={isMapOpen}
          onClose={() => setIsMapOpen(false)}
          latitude={incident.latitude}
          longitude={incident.longitude}
          incidentTitle={incident.title}
        />
      )}

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

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0">
                  <AlertCircle className="text-slate-600" size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500">{t('incidents.details.firstReported')}</p>
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {formatDateTime(incident.first_reported_at)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0">
                  <AlertCircle className="text-slate-600" size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500">{t('incidents.details.lastReported')}</p>
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {formatDateTime(incident.last_reported_at)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">{t('incidents.details.description')}</h2>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {incident.description}
            </p>
          </div>

        </div>

        <div className="space-y-4 sm:space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {t('incidents.details.remarks')}
            </h2>
            {sortedResponses.length === 0 ? (
              <p className="text-sm text-gray-600 mb-6">No responses yet.</p>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-4 mb-6 pr-1">
                {sortedResponses.map((response) => (
                  <div key={response.id} className="rounded-md border border-gray-200 p-3">

                    <p className="text-sm text-gray-800 whitespace-pre-wrap">
                      {response.actions_taken}
                    </p>
                    {response.user && (
                      <p className="text-xs font-semibold text-gray-500 mt-2">
                        - {response.user?.role === "lgu_official" ? "Local Government Unit" : "Barangay " + incident.barangay?.barangay_name}{" "}
                      </p>
                      
                    )}
                    <p className="text-xs text-gray-500 mb-1 mt-1 text-right">
                      {formatDateTime(response.response_date)}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t pt-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                  {t('incidents.details.relatedComplaints')} ({incident.complaint_count})
                </h3>
                <button
                  onClick={handleViewAllComplaints}
                  className="px-3 py-2 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
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

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
        {isForwardedToLgu && (
          <>
            <button
              onClick={handleReview}
              disabled={reviewIncidentMutation.isPending || isSubmitted || isUnderReviewByLgu || isResolved || isUnderReviewByBarangay}
              className="px-4 py-2 bg-yellow-600 text-white text-sm font-medium rounded-md hover:bg-yellow-700 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {reviewIncidentMutation.isPending ? "Reviewing..." : "Mark for Review"}
            </button>
            <button
              onClick={handleReject}
              disabled={rejectIncidentMutation.isPending || isSubmitted || isResolved || isUnderReviewByBarangay}
              className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {rejectIncidentMutation.isPending ? "Rejecting..." : "Reject Incident"}
            </button>
            <button
              onClick={handleResolve}
              disabled={resolveIncidentMutation.isPending || isSubmitted || isResolved || isUnderReviewByBarangay}
              className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resolveIncidentMutation.isPending ? "Resolving..." : "Resolve Incident"}
            </button>
          </>
        )}
      </div>

      <ActionsTakenModal
        isOpen={actionsTakenModal.isOpen}
        title={actionsTakenModal.title}
        description={actionsTakenModal.description}
        confirmText={actionsTakenModal.confirmText}
        confirmColor={actionsTakenModal.confirmColor as any}
        onConfirm={actionsTakenModal.onConfirm}
        onCancel={actionsTakenModal.cancelModal}
        isLoading={actionsTakenModal.isLoading}
      />

      <ToastContainer toasts={toasts} />

      <SuccessModal
        isOpen={successModal.isOpen}
        title={successModal.title}
        message={successModal.message}
        onClose={() => {
          navigate("/lgu/incidents");
          setSuccessModal({ isOpen: false, title: '', message: '' });
        }}
      />

      <ErrorModal
        isOpen={errorModal.isOpen}
        title={errorModal.title}
        message={errorModal.message}
        onClose={() => setErrorModal({ isOpen: false, title: '', message: '' })}
      />
    </div>
  );
};
