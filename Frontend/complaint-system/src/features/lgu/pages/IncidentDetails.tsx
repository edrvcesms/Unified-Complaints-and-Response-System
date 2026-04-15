import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from "react-router-dom";
import MapModal from '../../../components/MapModal';
import { useIncidentDetails } from "../../../hooks/useIncidents";
import { ArrowLeft, AlertCircle, MapPin, Users, Send } from "lucide-react";
import { formatCategoryName } from "../../../utils/categoryFormatter";
import { formatDateTime } from "../../../utils/dateUtils";
import LoadingIndicator from "../../general/LoadingIndicator";
import { useState, useEffect } from "react";
import { ActionsTakenModal } from "../../general/ActionsTakenModal";
import { useActionsTakenModal } from "../../../hooks/useActionsTakenModal";
import { useReviewIncident, useResolveIncident, useRejectIncident, useNotifyHearing } from '../../../hooks/useIncidents';
import { useAllDepartments } from "../../../hooks/useDepartment";
import { DepartmentSelectionModal } from "../components/DepartmentSelectionModal";
import { endorseIncidentToDepartment } from "../../../services/endorsement/incidentEndorsement";
import { useToast } from "../../../hooks/useToast";
import { ToastContainer } from "../../../components/Toast";
import { queryClient } from "../../../main";
import type { ComplaintStatus } from '../../../types/complaints/complaint';
import { SuccessModal } from "../../general/SuccessModal";
import { ErrorModal } from "../../general/ErrorModal";

export const LguIncidentDetails: React.FC = () => {
  const actionsTakenModal = useActionsTakenModal();
  const { t } = useTranslation();
  const { incidentId } = useParams<{ incidentId: string }>();
  const navigate = useNavigate();

  const { incident, isLoading, error } = useIncidentDetails(Number(incidentId));
  const { departments, isLoading: isDepartmentsLoading } = useAllDepartments();
  const { toasts, showToast } = useToast();

  const [isDepartmentModalOpen, setIsDepartmentModalOpen] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const reviewIncidentMutation = useReviewIncident(Number(incidentId));
  const resolveIncidentMutation = useResolveIncident(Number(incidentId));
  const rejectIncidentMutation = useRejectIncident(Number(incidentId));
  const notifyHearingMutation = useNotifyHearing();
  const [hearingDate, setHearingDate] = useState('');
  const [isHearingModalOpen, setIsHearingModalOpen] = useState(false);
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
      const errorMessage = error?.response?.data?.detail || 'Failed to mark incident for review. Please try again.';
      setErrorModal({
        isOpen: true,
        title: 'Error',
        message: errorMessage,
      });
    }
  }, [reviewIncidentMutation.isError]);

  useEffect(() => {
    if (rejectIncidentMutation.isError) {
      actionsTakenModal.closeModal();
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

  const handleOpenDepartmentModal = () => {
    setIsDepartmentModalOpen(true);
  };

  const handleDepartmentSelect = (departmentAccountId: number) => {
    const department = departments?.find(d => d.department_account?.id === departmentAccountId);
    if (department) {
      setIsDepartmentModalOpen(false);

      actionsTakenModal.openModal({
        title: `Assign to ${department.department_name}`,
        description: "Please provide any relevant notes or instructions for the department when assigning this incident.",
        confirmText: "Assign",
        confirmColor: "blue",
        onConfirm: async (actionsTaken: string) => {
          try {
            actionsTakenModal.setIsLoading(true);
            await handleConfirmAssignment(departmentAccountId, actionsTaken);
          } catch (err) {
            console.error(err);
          } finally {
            actionsTakenModal.setIsLoading(false);
          }
        },
      });
    }
  };

  // Add actions taken modal logic for resolve/review
  const handleResolve = () => {
    actionsTakenModal.openModal({
      title: "Resolve Incident",
      description: "Please describe the actions taken to resolve this incident. This will be recorded and visible to complainants.",
      confirmText: "Resolve",
      confirmColor: "green",
      onConfirm: async (actionsTaken: string) => {
        try {
          actionsTakenModal.setIsLoading(true);
          await resolveIncidentMutation.mutateAsync({ actions_taken: actionsTaken });
        } catch (err) {
          console.error(err);
        } finally {
          actionsTakenModal.setIsLoading(false);
        }
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
        try {
          actionsTakenModal.setIsLoading(true);
          await reviewIncidentMutation.mutateAsync({ actions_taken: actionsTaken });
        } catch (err) {
          console.error(err);
        } finally { actionsTakenModal.setIsLoading(false); }
      },
    });
  };

  const handleReject = () => {
    actionsTakenModal.openModal({
      title: "Reject Incident",
      description: "Please provide the reason for rejecting this incident. This will be recorded and visible to complainants.",
      confirmText: "Reject",
      confirmColor: "red",
      onConfirm: async (actionsTaken: string) => {
        try {
          actionsTakenModal.setIsLoading(true);
          await rejectIncidentMutation.mutateAsync({ actions_taken: actionsTaken });
        } catch (err) {
          console.error(err);
        } finally {
          actionsTakenModal.setIsLoading(false);
        }
      },
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
      showToast({
        type: 'error',
        message: 'Please select a hearing date and time before notifying users.',
        title: 'Missing Hearing Date'
      });
      return;
    }

    const hearingDateFormData = new FormData();
    hearingDateFormData.append("hearing_date", hearingDate);

    try {
      await notifyHearingMutation.mutateAsync({
        incidentId: Number(incidentId),
        hearingDate: hearingDateFormData,
      });
      setIsHearingModalOpen(false);
      setHearingDate('');
      showToast({
        type: 'success',
        message: 'Users have been notified for the hearing successfully.',
        title: ''
      });
    } catch (err) {
      console.error(err);
      showToast({
        type: 'error',
        message: 'Failed to notify users for hearing. Please try again.',
        title: ''
      });
    }
  };

  const handleConfirmAssignment = async (departmentAccountId: number, actionsTaken: string) => {
    setIsAssigning(true);
    try {
      await endorseIncidentToDepartment(Number(incidentId), departmentAccountId, { actions_taken: actionsTaken });

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["incidentDetails", Number(incidentId)] });
      queryClient.invalidateQueries({ queryKey: ["allForwardedIncidents"] });

      showToast({
        type: 'success',
        message: 'Incident successfully assigned to department.',
        title: ''
      });

      actionsTakenModal.closeModal();

      // Navigate back to incidents list after a short delay
      setTimeout(() => {
        navigate("/lgu/incidents");
      }, 1500);

    } catch (error) {
      console.error("Error assigning incident:", error);
      showToast({
        type: 'error',
        message: 'Failed to assign incident. Please try again.',
        title: ''
      });
      actionsTakenModal.closeModal();
    } finally {
      setIsAssigning(false);
    }
  };

  const isForwardedIncident = incident?.complaint_clusters?.some(
    cluster => cluster.complaint.status === "forwarded_to_lgu"
  );

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

  const incidentStatus = incident.complaint_clusters[0]?.complaint.status as ComplaintStatus;
  const isSubmitted = incidentStatus === "submitted";
  const isUnderReview =
    incidentStatus === "reviewed_by_barangay" || incidentStatus === "reviewed_by_department" || incidentStatus === "reviewed_by_lgu";

  const incidentHearingDateRaw = (incident as any)?.hearing_date ?? (incident as any)?.hearingDate ?? null;
  const incidentHearingDate =
    typeof incidentHearingDateRaw === "string"
      ? incidentHearingDateRaw.trim() || null
      : incidentHearingDateRaw;
  const hasScheduledHearingDate = Boolean(incidentHearingDate);

  const responses = incident.responses ?? [];
  const sortedResponses = [...responses].sort((a, b) => {
    const aTime = new Date(a.response_date).getTime();
    const bTime = new Date(b.response_date).getTime();
    return bTime - aTime;
  });

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
    const formatted = date.toLocaleString(undefined, options);
    return formatted.replace(/, (\d{2}:\d{2} [AP]M)$/i, ' at $1');
  };


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
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 break-words">{incident.title}</h1>
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

            {isForwardedIncident || isUnderReview && (
              <div className="border-t pt-6 mt-6">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3">
                  Assignment Actions
                </h3>
                <button
                  onClick={handleOpenDepartmentModal}
                  disabled={isDepartmentsLoading || isAssigning}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={16} />
                  Assign to Designated Department
                </button>
                <p className="text-sm text-gray-600 mt-2">
                  Endorse this incident to a specific department for handling.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
        <button
          onClick={handleReview}
          disabled={reviewIncidentMutation.isPending || isUnderReview}
          className="px-4 py-2 bg-yellow-600 text-white text-sm font-medium rounded-md hover:bg-yellow-700 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {reviewIncidentMutation.isPending ? "Reviewing..." : "Mark for Review"}
        </button>
        <button
          onClick={handleReject}
          disabled={rejectIncidentMutation.isPending}
          className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {rejectIncidentMutation.isPending ? "Rejecting..." : "Reject Incident"}
        </button>
        <button
          onClick={handleResolve}
          disabled={resolveIncidentMutation.isPending || isSubmitted}
          className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {resolveIncidentMutation.isPending ? "Resolving..." : "Resolve Incident"}
        </button>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
        {hasScheduledHearingDate && (
          <p className="text-sm text-gray-700 sm:mr-2 sm:text-right">
            Hearing Date: <span className="font-semibold">{formatHearingDate(incidentHearingDate as string)}</span>
          </p>
        )}

        {hasScheduledHearingDate ? (
          <button
            onClick={handleOpenHearingModal}
            disabled={notifyHearingMutation.isPending || isSubmitted}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {notifyHearingMutation.isPending ? "Notifying..." : "Reschedule Hearing Date"}
          </button>
        ) : (
          <button
            onClick={handleOpenHearingModal}
            disabled={notifyHearingMutation.isPending || isSubmitted}
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
                className="w-full px-3 py-2 border border-gray-300 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
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

      <DepartmentSelectionModal
        isOpen={isDepartmentModalOpen}
        departments={departments || []}
        onSelect={handleDepartmentSelect}
        onCancel={() => setIsDepartmentModalOpen(false)}
        isLoading={isAssigning}
      />

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
