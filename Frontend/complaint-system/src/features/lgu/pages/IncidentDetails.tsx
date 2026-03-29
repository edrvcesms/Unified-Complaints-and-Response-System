import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from "react-router-dom";
import MapModal from '../../../components/MapModal';
import { useIncidentDetails } from "../../../hooks/useIncidents";
import { ArrowLeft, AlertCircle, MapPin, Users, Send } from "lucide-react";
import { formatCategoryName } from "../../../utils/categoryFormatter";
import { formatDateTime } from "../../../utils/dateUtils";
import LoadingIndicator from "../../general/LoadingIndicator";
import { useState } from "react";
import { ActionsTakenModal } from "../../general/ActionsTakenModal";
import { useActionsTakenModal } from "../../../hooks/useActionsTakenModal";
import { useReviewIncident, useResolveIncident } from '../../../hooks/useIncidents';
import { useAllDepartments } from "../../../hooks/useDepartment";
import { DepartmentSelectionModal } from "../components/DepartmentSelectionModal";
import { ConfirmationModal } from "../../general/ConfirmationModal";
import { useConfirmationModal } from "../../../hooks/useConfirmationModal";
import { delegateIncidentToDepartment } from "../../../services/delegation/incidentDelegation";
import { useToast } from "../../../hooks/useToast";
import { ToastContainer } from "../../../components/Toast";
import { queryClient } from "../../../main";

export const LguIncidentDetails: React.FC = () => {
  const actionsTakenModal = useActionsTakenModal();
  const { t } = useTranslation();
  const { incidentId } = useParams<{ incidentId: string }>();
  const navigate = useNavigate();

  const { incident, isLoading, error } = useIncidentDetails(Number(incidentId));
  const { departments, isLoading: isDepartmentsLoading } = useAllDepartments();
  const { toasts, showToast } = useToast();
  const confirmationModal = useConfirmationModal();

  const [isDepartmentModalOpen, setIsDepartmentModalOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<{ id: number; name: string } | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const reviewIncidentMutation = useReviewIncident(Number(incidentId));
  const resolveIncidentMutation = useResolveIncident(Number(incidentId));

  // Map modal state
  const [isMapOpen, setIsMapOpen] = useState(false);


  const handleViewAllComplaints = () => {
    navigate(`/lgu/incidents/${incidentId}/complaints`);
  };

  const handleOpenDepartmentModal = () => {
    setIsDepartmentModalOpen(true);
  };

  const handleDepartmentSelect = (departmentAccountId: number) => {
    const department = departments?.find(d => d.department_account?.id === departmentAccountId);
    if (department) {
      setSelectedDepartment({
        id: departmentAccountId,
        name: department.department_name,
      });
      setIsDepartmentModalOpen(false);
      // Open confirmation modal
      confirmationModal.openModal({
        title: 'Confirm Assignment',
        message: `Are you sure you want to assign this incident to ${department.department_name}?`,
        confirmText: 'Confirm',
        confirmColor: 'blue',
        onConfirm: async () => {
          await handleConfirmAssignment(departmentAccountId);
        },
      });
    }
  };

  // Add actions taken modal logic for resolve/review
  const handleResolve = () => {
    actionsTakenModal.openModal({
      title: "Resolve Incident",
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

  const handleConfirmAssignment = async (departmentAccountId: number) => {
    setIsAssigning(true);
    try {
      await delegateIncidentToDepartment(Number(incidentId), departmentAccountId);

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["incidentDetails", Number(incidentId)] });
      queryClient.invalidateQueries({ queryKey: ["allForwardedIncidents"] });

      showToast({
        type: 'success',
        message: 'Incident successfully assigned to department.',
        title: ''
      });

      confirmationModal.closeModal();

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
      confirmationModal.closeModal();
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
                  className="px-3 py-2 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                >
                  {t('incidents.details.viewAllComplaints')}
                </button>
              </div>
              <p className="text-sm text-gray-600">
                View all the related complaints in this incident.
              </p>
            </div>

            {isForwardedIncident && (
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
                  Delegate this incident to a specific department for handling.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

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
        confirmText={actionsTakenModal.confirmText}
        confirmColor={actionsTakenModal.confirmColor as any}
        onConfirm={actionsTakenModal.onConfirm}
        onCancel={actionsTakenModal.closeModal}
        isLoading={actionsTakenModal.isLoading}
      />

      <ConfirmationModal
        isOpen={confirmationModal.isOpen}
        title={confirmationModal.title}
        message={confirmationModal.message}
        confirmText={confirmationModal.confirmText}
        confirmColor={confirmationModal.confirmColor}
        onConfirm={confirmationModal.confirm}
        onCancel={confirmationModal.closeModal}
        isLoading={confirmationModal.isLoading || isAssigning}
      />

      <ToastContainer toasts={toasts} />
    </div>
  );
};
