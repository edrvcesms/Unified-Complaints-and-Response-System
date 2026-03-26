import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from "react-router-dom";
import { useIncidentDetails } from "../../../hooks/useIncidents";
import { ArrowLeft, AlertCircle, MapPin, Users } from "lucide-react";
import { formatCategoryName } from "../../../utils/categoryFormatter";
import { formatDateTime } from "../../../utils/dateUtils";
import LoadingIndicator from "../../general/LoadingIndicator";
import { useResolveIncident, useReviewIncident, useForwardIncidentToLgu, useNotifyHearing } from '../../../hooks/useIncidents';
import { ActionsTakenModal } from "../../general/ActionsTakenModal";
import { useActionsTakenModal } from "../../../hooks/useActionsTakenModal";
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
  const forwardToLguMutation = useForwardIncidentToLgu(Number(incidentId));
  const notifyHearingMutation = useNotifyHearing();
  const [hearingDate, setHearingDate] = useState('');
  const [isHearingModalOpen, setIsHearingModalOpen] = useState(false);

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

  // Handle successful forward to LGU
  useEffect(() => {
    if (forwardToLguMutation.isSuccess) {
      confirmationModal.closeModal();
      setSuccessModal({
        isOpen: true,
        title: 'Success!',
        message: 'The incident has been delegated to LGU successfully.',
      });
    }
  }, [forwardToLguMutation.isSuccess]);

  // Handle successful hearing notification
  useEffect(() => {
    if (notifyHearingMutation.isSuccess) {
      confirmationModal.closeModal();
      setIsHearingModalOpen(false);
      setHearingDate('');
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

  // Handle forward to LGU error
  useEffect(() => {
    if (forwardToLguMutation.isError) {
      confirmationModal.closeModal();
      const error = forwardToLguMutation.error as any;
      const errorMessage = error?.response?.data?.detail || 'Failed to delegate incident to LGU. Please try again.';
      setErrorModal({
        isOpen: true,
        title: 'Error',
        message: errorMessage,
      });
    }
  }, [forwardToLguMutation.isError]);

  // Handle hearing notification error
  useEffect(() => {
    if (notifyHearingMutation.isError) {
      confirmationModal.closeModal();
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
      onConfirm: async (actionsTaken: string) => {
        actionsTakenModal.setIsLoading(true);
        await resolveIncidentMutation.mutateAsync({ actions_taken: actionsTaken });
        actionsTakenModal.setIsLoading(false);
      },
    });
  };

  const handleReview = () => {
    actionsTakenModal.openModal({
      title: "Mark for Review",
      description: "Please describe the actions taken or the reason this incident is being flagged for further review.",
      confirmText: "Confirm",
      confirmColor: "yellow",
      onConfirm: async (actionsTaken: string) => {
        try{
          actionsTakenModal.setIsLoading(true);
          await reviewIncidentMutation.mutateAsync({ actions_taken: actionsTaken });
        } catch (err) {
          console.error(err);
        } finally {
          actionsTakenModal.setIsLoading(false);
        }
      },
    });
  };

  const handleForwardToLgu = () => {
    actionsTakenModal.openModal({
      title: "Delegate to LGU",
      description: "Please provide any relevant notes or instructions for the LGU when delegating this incident.",
      confirmText: "Delegate",
      confirmColor: "blue",
      onConfirm: async (actionsTaken: string) => {
        actionsTakenModal.setIsLoading(true);
        try {
          await forwardToLguMutation.mutateAsync({ actions_taken: actionsTaken });
        } catch (err) {
          console.error(err);
          actionsTakenModal.setIsLoading(false);
        } finally {
          actionsTakenModal.setIsLoading(false); // ✅ always runs
        }
      }
    });
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

  const incidentHearingDateRaw = (incident as any)?.hearing_date ?? (incident as any)?.hearingDate ?? null;
  const incidentHearingDate =
    typeof incidentHearingDateRaw === "string"
      ? incidentHearingDateRaw.trim() || null
      : incidentHearingDateRaw;
  const hasScheduledHearingDate = Boolean(incidentHearingDate);

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
          className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
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
              {t('incidents.details.additionalDetails')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-xs text-gray-500 mb-1">{t('incidents.details.firstReported')}</p>
                <p className="text-sm font-medium text-gray-900">
                  {formatDateTime(incident.first_reported_at)}
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
                  {formatDateTime(incident.last_reported_at)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Status</p>
                <p className="text-sm font-medium text-gray-900 capitalize">
                  {incident.status.replace("_", " ")}
                </p>
              </div>
            </div>

            <div className="border-t pt-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">
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

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
        <button
          onClick={handleReview}
          disabled={reviewIncidentMutation.isPending}
          className="px-4 py-2 bg-yellow-600 text-white text-sm font-medium rounded-md hover:bg-yellow-700 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {reviewIncidentMutation.isPending ? "Reviewing..." : "Mark for Review"}
        </button>
        <button
          onClick={handleForwardToLgu}
          disabled={forwardToLguMutation.isPending}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {forwardToLguMutation.isPending ? "Forwarding..." : "Delegate to LGU"}
        </button>
        <button
          onClick={handleResolve}
          disabled={resolveIncidentMutation.isPending}
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
        onCancel={actionsTakenModal.closeModal}
        isLoading={actionsTakenModal.isLoading}
      />

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
        {hasScheduledHearingDate && (
          <p className="text-sm text-gray-700 sm:mr-2 sm:text-right">
            Hearing Date: <span className="font-semibold">{formatHearingDate(incidentHearingDate as string)}</span>
          </p>
        )}

        {hasScheduledHearingDate ? (
          <button
            onClick={handleOpenHearingModal}
            disabled={notifyHearingMutation.isPending}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {notifyHearingMutation.isPending ? "Notifying..." : "Reschedule Hearing Date"}
          </button>
        ) : (
          <button
            onClick={handleOpenHearingModal}
            disabled={notifyHearingMutation.isPending}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {notifyHearingMutation.isPending ? "Notifying..." : "Notify Complainants for Hearing"}
          </button>
        )}
      </div>

      {isHearingModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-sm w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {hasScheduledHearingDate ? "Reschedule Hearing Date" : "Notify Complainants for Hearing"}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Select the hearing date and time, then confirm to notify all complainants.
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Hearing Date & Time</label>
              <input
                type="datetime-local"
                value={hearingDate}
                onChange={(event) => setHearingDate(event.target.value)}
                className="w-full px-3 py-2 border border-gray-300 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsHearingModalOpen(false)}
                disabled={notifyHearingMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleNotifyHearing}
                disabled={notifyHearingMutation.isPending || !hearingDate}
                className="px-4 py-2 text-sm font-medium text-white rounded-md transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
              >
                {notifyHearingMutation.isPending
                  ? "Notifying..."
                  : hasScheduledHearingDate
                    ? "Confirm & Reschedule"
                    : "Confirm & Notify"}
              </button>
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