import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import MapModal from '../../../components/MapModal';
import { useParams, useNavigate } from "react-router-dom";
import { useIncidentDetails, useRejectionCategories } from "../../../hooks/useIncidents";
import { ArrowLeft, AlertCircle, MapPin, Users, CalendarIcon } from "lucide-react";
import { formatCategoryName } from "../../../utils/categoryFormatter";
import { formatDateTime } from "../../../utils/dateUtils";
import LoadingIndicator from "../../general/LoadingIndicator";
import { useResolveIncident, useReviewIncident, useForwardIncidentToLgu, useNotifyHearing, useRejectIncident } from '../../../hooks/useIncidents';
import { ActionsTakenModal } from "../../general/ActionsTakenModal";
import { useActionsTakenModal } from "../../../hooks/useActionsTakenModal";
import { ConfirmationModal } from "../../general/ConfirmationModal";
import { useConfirmationModal } from "../../../hooks/useConfirmationModal";
import { SuccessModal } from "../../general/SuccessModal";
import { ErrorModal } from "../../general/ErrorModal";
import { isAbortError } from "../../../utils/axiosException";
import { CustomDateTimePicker } from '../../general/CustomDateTimePicker';
import type { ComplaintStatus } from '../../../types/complaints/complaint';
import { validateAttachments } from '../../../utils/attachmentHelper';
import { RejectIncidentModal } from "../components/RejectIncidentModal";

export const IncidentDetails: React.FC = () => {
  const { t } = useTranslation();
  const { incidentId } = useParams<{ incidentId: string }>();
  const navigate = useNavigate();

  const { incident, isLoading, error } = useIncidentDetails(Number(incidentId));

  const resolveIncidentMutation = useResolveIncident(Number(incidentId));
  const reviewIncidentMutation = useReviewIncident(Number(incidentId));
  const forwardToLguMutation = useForwardIncidentToLgu(Number(incidentId));
  const rejectIncidentMutation = useRejectIncident(Number(incidentId));
  const { rejectionCategories, isLoading: isLoadingRejectionCategories, error: rejectionCategoriesError } = useRejectionCategories();
  const notifyHearingMutation = useNotifyHearing();
  const [hearingDate, setHearingDate] = useState('');
  const [isHearingModalOpen, setIsHearingModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [attachmentError, setAttachmentError] = useState('');

  const confirmationModal = useConfirmationModal();
  const actionsTakenModal = useActionsTakenModal();
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

  useEffect(() => {
    if (!actionsTakenModal.isOpen) {
      setAttachmentError('');
    }
  }, [actionsTakenModal.isOpen]);

  useEffect(() => {
    if (!isRejectModalOpen) {
      setAttachmentError('');
    }
  }, [isRejectModalOpen]);

  // Map modal state
  const [isMapOpen, setIsMapOpen] = useState(false);

  // Handle successful resolve
  useEffect(() => {
    if (resolveIncidentMutation.isSuccess) {
      confirmationModal.closeModal();
      actionsTakenModal.closeModal();
      setErrorModal({ isOpen: false, title: '', message: '' });
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
      actionsTakenModal.closeModal();
      setErrorModal({ isOpen: false, title: '', message: '' });
      setSuccessModal({
        isOpen: true,
        title: 'Success!',
        message: 'The incident has been marked for review successfully.',
      });
    }
  }, [reviewIncidentMutation.isSuccess]);

  // Handle successful forward to LGU
  useEffect(() => {
    if (forwardToLguMutation.isSuccess) {
      confirmationModal.closeModal();
      actionsTakenModal.closeModal();
      setErrorModal({ isOpen: false, title: '', message: '' });
      setSuccessModal({
        isOpen: true,
        title: 'Success!',
        message: 'The incident has been endorsed to LGU successfully.',
      });
    }
  }, [forwardToLguMutation.isSuccess]);

  // Handle successful reject
  useEffect(() => {
    if (rejectIncidentMutation.isSuccess) {
      setIsRejectModalOpen(false);
      setErrorModal({ isOpen: false, title: '', message: '' });
      setSuccessModal({
        isOpen: true,
        title: 'Success!',
        message: 'The incident has been rejected successfully.',
      });
      rejectIncidentMutation.reset();
    }
  }, [rejectIncidentMutation.isSuccess]);

  // Handle successful hearing notification
  useEffect(() => {
    if (notifyHearingMutation.isSuccess) {
      confirmationModal.closeModal();
      setIsHearingModalOpen(false);
      setHearingDate('');
      setErrorModal({ isOpen: false, title: '', message: '' });
      setSuccessModal({
        isOpen: true,
        title: 'Success!',
        message: 'Users have been notified for the hearing successfully.',
      });
    }
  }, [notifyHearingMutation.isSuccess]);

  // Handle resolve error
  useEffect(() => {
    if (resolveIncidentMutation.isError) {
      confirmationModal.closeModal();
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

  // Handle review error
  useEffect(() => {
    if (reviewIncidentMutation.isError) {
      confirmationModal.closeModal();
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

  // Handle forward to LGU error
  useEffect(() => {
    if (forwardToLguMutation.isError) {
      confirmationModal.closeModal();
      actionsTakenModal.closeModal();
      setSuccessModal({ isOpen: false, title: '', message: '' });
      const error = forwardToLguMutation.error as any;
      const errorMessage = error?.response?.data?.detail || 'Failed to endorse incident to LGU. Please try again.';
      setErrorModal({
        isOpen: true,
        title: 'Error',
        message: errorMessage,
      });
    }
  }, [forwardToLguMutation.isError]);

  // Handle reject error
  useEffect(() => {
    if (rejectIncidentMutation.isError) {
      setIsRejectModalOpen(false);
      setSuccessModal({ isOpen: false, title: '', message: '' });
      const error = rejectIncidentMutation.error as any;
      const errorMessage = error?.response?.data?.detail || 'Failed to reject incident. Please try again.';
      setErrorModal({
        isOpen: true,
        title: 'Error',
        message: errorMessage,
      });
      rejectIncidentMutation.reset();
    }
  }, [rejectIncidentMutation.isError]);

  // Handle hearing notification error
  useEffect(() => {
    if (notifyHearingMutation.isError) {
      confirmationModal.closeModal();
      setSuccessModal({ isOpen: false, title: '', message: '' });
      const error = notifyHearingMutation.error as any;
      const errorMessage = error?.response?.data?.detail || 'Failed to notify users for hearing. Please try again.';
      setErrorModal({
        isOpen: true,
        title: 'Error',
        message: errorMessage,
      });
    }
  }, [notifyHearingMutation.isError]);

  const handleViewAllComplaints = () => {
    navigate(`/dashboard/incidents/${incidentId}/complaints`);
  };

  const handleResolve = () => {
    actionsTakenModal.openModal({
      title: "Resolve Incident",
      description: "Please describe the actions taken to resolve this incident. This will be recorded and visible to complainants.",
      confirmText: "Resolve",
      confirmColor: "green",
      onConfirm: async (actionsTaken: string, attachments: File[]) => {
        const validationError = validateAttachments(attachments);
        if (validationError) {
          setAttachmentError(validationError);
          return;
        }

        actionsTakenModal.setIsLoading(true);
        await resolveIncidentMutation.mutateAsync({ actions_taken: actionsTaken, attachments });
        actionsTakenModal.setIsLoading(false);
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
            setAttachmentError(validationError);
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
        } finally {
          actionsTakenModal.setIsLoading(false);
        }
      },
      onCancel: () => {
        abortController.abort();
        reviewIncidentMutation.reset();
      },
    });
  };

  const handleForwardToLgu = () => {
    actionsTakenModal.openModal({
      title: "Escalate to LGU",
      description: "Please provide any relevant notes or instructions for the LGU when endorsing this incident.",
      confirmText: "Escalate",
      confirmColor: "blue",
      onConfirm: async (actionsTaken: string, attachments: File[]) => {
        actionsTakenModal.setIsLoading(true);
        try {
          const validationError = validateAttachments(attachments);
          if (validationError) {
            setAttachmentError(validationError);
            return;
          }
          await forwardToLguMutation.mutateAsync({ actions_taken: actionsTaken, attachments });
        } catch (err) {
          console.error(err);
          actionsTakenModal.setIsLoading(false);
        } finally {
          actionsTakenModal.setIsLoading(false); // ✅ always runs
        }
      }
    });
  };

  const handleReject = () => {
    setIsRejectModalOpen(true);
  };

  const handleOpenHearingModal = () => {
    if (incidentHearingDate) {
      const existingDate = new Date(incidentHearingDate);
      if (!Number.isNaN(existingDate.getTime())) {
        const localDateTime = new Date(existingDate.getTime() - existingDate.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16);
        setHearingDate(localDateTime);
      }
    }
    setIsHearingModalOpen(true);
  };

  const handleNotifyHearing = async () => {
    if (!hearingDate) {
      setSuccessModal({ isOpen: false, title: '', message: '' });
      setErrorModal({
        isOpen: true,
        title: 'Missing Hearing Date',
        message: 'Please select a hearing date and time before notifying users.',
      });
      return;
    }

    const hearingDateFormData = new FormData();
    hearingDateFormData.append("hearing_date", hearingDate);
    await notifyHearingMutation.mutateAsync({
      incidentId: Number(incidentId),
      hearingDate: hearingDateFormData,
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

  // Check for valid coordinates
  const hasLocation =
    typeof incident.latitude === 'number' &&
    typeof incident.longitude === 'number' &&
    !isNaN(incident.latitude) &&
    !isNaN(incident.longitude);

  const incidentStatus = incident.complaint_clusters[0]?.complaint.status as ComplaintStatus;
  const isSubmitted = incidentStatus === "submitted";
  const isUnderReviewByBarangay = incidentStatus === "reviewed_by_barangay";
  const isUnderReviewByDepartment = incidentStatus === "reviewed_by_department";
  const isUnderReviewByLgu = incidentStatus === "reviewed_by_lgu";
  const isResolved = incidentStatus === "resolved_by_barangay" || incidentStatus === "resolved_by_department" || incidentStatus === "resolved_by_lgu";
  const isForwardedToLgu = incidentStatus === "forwarded_to_lgu";
  const isForwardedToDepartment = incidentStatus === "forwarded_to_department";
  const isRejectedByLgu = incident.complaint_clusters[0]?.complaint?.is_rejected_by_lgu === true;
  const isRejected = incident.complaint_clusters[0]?.complaint?.status === "rejected"

  const incidentHearingDateRaw = (incident as any)?.hearing_date ?? (incident as any)?.hearingDate ?? null;
  const incidentHearingDate =
    typeof incidentHearingDateRaw === "string"
      ? incidentHearingDateRaw.trim() || null
      : incidentHearingDateRaw;
  const hasScheduledHearingDate = Boolean(incidentHearingDate);
  const showNewComplaintBadge = Boolean(incident.has_new_complaints) || Number(incident.new_complaint_count ?? 0) > 0;

  const responses = incident.responses ?? [];
  const sortedResponses = [...responses].sort((a, b) => {
    const aTime = new Date(a.response_date).getTime();
    const bTime = new Date(b.response_date).getTime();
    return bTime - aTime;
  });

  // Helper to format hearing date as 'Month day, Year at Time'
  const formatHearingDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return dateString;
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    };
    // e.g. March 22, 2026, 03:30 PM
    const formatted = date.toLocaleString(undefined, options);
    // Convert ", " before time to " at "
    return formatted.replace(/, (\d{2}:\d{2} [AP]M)$/i, ' at $1');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          onClick={() => navigate("/dashboard/incidents")}
          className="inline-flex items-center gap-2 px-3 py-2 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        >
          <ArrowLeft size={16} />
          {t('incidents.details.backToIncidents')}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="space-y-4 sm:space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 wrap-break-word">{incident.title}</h1>
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
                  {hasLocation && (
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
              {hasLocation && (
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
                  className="relative px-3 py-2 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                >
                  {t('incidents.details.viewAllComplaints')}
                 {showNewComplaintBadge && (
  <span className="absolute -top-2.5 -right-2.5 flex items-center justify-center">
    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-50" />
    <span className="relative flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-orange-500 text-white text-[15px] font-bold">
      {incident.complaint_count}
    </span>
  </span>
)}
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
        <button
          onClick={handleReview}
          disabled={isUnderReviewByBarangay || isUnderReviewByDepartment || isUnderReviewByLgu || reviewIncidentMutation.isPending || isForwardedToDepartment || isForwardedToLgu || isResolved || isRejectedByLgu}
          className="px-4 py-2 bg-yellow-600 text-white text-sm font-medium rounded-md hover:bg-yellow-700 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {reviewIncidentMutation.isPending ? "Reviewing..." : "Mark for Review"}
        </button>
        <button
          onClick={handleForwardToLgu}
          disabled={forwardToLguMutation.isPending || isSubmitted || isResolved || isUnderReviewByDepartment || isUnderReviewByLgu || isForwardedToDepartment || isForwardedToLgu || isRejectedByLgu || isRejected}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {forwardToLguMutation.isPending ? "Forwarding..." : "Escalate to LGU"}
        </button>
        <button
          onClick={handleReject}
          disabled={isForwardedToDepartment || isForwardedToLgu || rejectIncidentMutation.isPending || isResolved || isRejected}
          className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {rejectIncidentMutation.isPending ? "Rejecting..." : "Reject Incident"}
        </button>
        <button
          onClick={handleResolve}
          disabled={isUnderReviewByDepartment || isUnderReviewByLgu || resolveIncidentMutation.isPending || isSubmitted || isResolved || isForwardedToDepartment || isForwardedToLgu || isRejected}
          className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {resolveIncidentMutation.isPending ? "Resolving..." : "Resolve Incident"}
        </button>
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
        externalError={attachmentError}
      />

      <RejectIncidentModal
        isOpen={isRejectModalOpen}
        title="Reject Incident"
        description="Please choose a rejection reason and explain why this incident is being rejected. This will be recorded and visible to complainants."
        confirmText="Reject"
        confirmColor="red"
        onCancel={() => {
          setIsRejectModalOpen(false);
          rejectIncidentMutation.reset();
        }}
        isLoading={rejectIncidentMutation.isPending}
        rejectionCategories={rejectionCategories ?? []}
        isLoadingCategories={isLoadingRejectionCategories}
        categoryError={rejectionCategoriesError ? 'Failed to load rejection reasons. Please try again.' : undefined}
        onConfirm={async (actionsTaken: string, rejectionCategoryId: number, attachments: File[]) => {
          await rejectIncidentMutation.mutateAsync({
            actions_taken: actionsTaken,
            rejection_category_id: rejectionCategoryId,
            attachments,
          });
        }}
      />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-end gap-3">
        {hasScheduledHearingDate && (
          <div className="flex items-center gap-2 px-4 py-1.5 bg-primary-50 rounded-full text-sm text-primary-800">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-500 shrink-0" />
            Hearing Date: <span className="font-medium">{formatHearingDate(incidentHearingDate as string)}</span>
          </div>
        )}

        <button
          onClick={handleOpenHearingModal}
          disabled={notifyHearingMutation.isPending || isSubmitted || isResolved || isUnderReviewByDepartment || isUnderReviewByLgu || isForwardedToDepartment || isForwardedToLgu || isRejected}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-700 text-white text-sm font-medium rounded-xl hover:bg-primary-800 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <CalendarIcon className="w-4 h-4 text-primary-200" />
          {notifyHearingMutation.isPending
            ? "Notifying..."
            : hasScheduledHearingDate
              ? "Reschedule Hearing Date"
              : "Notify Complainants for Hearing"}
        </button>
      </div>

      {/* Modal */}
      {isHearingModalOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-black bg-opacity-50"
          onClick={(e) => e.target === e.currentTarget && setIsHearingModalOpen(false)}
        >
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm w-full max-w-sm overflow-hidden">

            {/* Header */}
            <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-medium text-gray-900">
                  {hasScheduledHearingDate ? "Reschedule Hearing Date" : "Notify Complainants for Hearing"}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                  Select a date and time to notify all complainants.
                </p>
              </div>
              <button
                onClick={() => setIsHearingModalOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 transition-colors text-sm"
              >
                ✕
              </button>
            </div>

            <div className="px-6 pt-5 pb-6">
              <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-primary-700 mb-2.5">
                <CalendarIcon className="w-3.5 h-3.5" />
                Date &amp; Time
              </label>

              <div className="mb-4">
                <CustomDateTimePicker
                  value={hearingDate ? new Date(hearingDate) : null}
                  onChange={(date) => setHearingDate(date.toISOString())}
                />
              </div>

              {hearingDate && (
                <div className="inline-flex items-center justify-center gap-2 px-3 py-1.5 bg-primary-50 rounded-full text-xs text-primary-800 mb-5">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-400 shrink-0" />
                  {new Date(hearingDate).toLocaleDateString("en-US", {
                    weekday: "short", month: "short", day: "numeric", year: "numeric"
                  }) + " · " + new Date(hearingDate).toLocaleTimeString("en-US", {
                    hour: "numeric", minute: "2-digit"
                  })}
                </div>
              )}

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsHearingModalOpen(false)}
                  disabled={notifyHearingMutation.isPending}
                  className="px-4 py-2.5 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 hover:text-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleNotifyHearing}
                  disabled={notifyHearingMutation.isPending || !hearingDate}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className="w-4 h-4 rounded-full border border-primary-300 flex items-center justify-center text-[9px]">✓</span>
                  {notifyHearingMutation.isPending
                    ? "Notifying..."
                    : hasScheduledHearingDate
                      ? "Confirm & Reschedule"
                      : "Confirm & Notify"}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

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

      <SuccessModal
        isOpen={successModal.isOpen}
        title={successModal.title}
        message={successModal.message}
        onClose={() => {
          navigate(`/dashboard/incidents`);
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