import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../general";
import { superAdminInstance } from "../../../services/axios/apiServices";
import { ErrorMessage } from "../../general/ErrorMessage";
import LoadingIndicator from "../../general/LoadingIndicator";
import { ConfirmationModal } from "../../general/ConfirmationModal";
import { SuccessModal } from "../../general/SuccessModal";
import { ErrorModal } from "../../general/ErrorModal";
import { handleApiError } from "../../../utils/apiErrorHandler";

interface ManagedUser {
  id: number;
  first_name?: string | null;
  last_name?: string | null;
  email: string;
  reject_counter?: number | null;
  is_suspended?: boolean | null;
  can_submit_complaints?: boolean | null;
}

type LiftAction = "suspension" | "restriction";

interface ConfirmState {
  isOpen: boolean;
  action: LiftAction;
  user: ManagedUser | null;
}

const defaultConfirmState: ConfirmState = {
  isOpen: false,
  action: "restriction",
  user: null,
};

const buildDisplayName = (user: ManagedUser) => {
  const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim();
  return fullName || user.email;
};

export const SuperAdminResidentAccountManagement: React.FC = () => {
  const navigate = useNavigate();
  const [confirmState, setConfirmState] = useState<ConfirmState>(defaultConfirmState);
  const [successModal, setSuccessModal] = useState({ isOpen: false, title: "", message: "" });
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: "", message: "" });

  const {
    data: restrictedUsers = [],
    isLoading: isRestrictedLoading,
    error: restrictedError,
    refetch: refetchRestrictedUsers,
  } = useQuery({
    queryKey: ["superadmin", "submission-restricted-users"],
    queryFn: async () => {
      const response = await superAdminInstance.get<ManagedUser[]>("/submission-restricted-users");
      return response.data || [];
    },
  });

  const {
    data: suspendedUsers = [],
    isLoading: isSuspendedLoading,
    error: suspendedError,
    refetch: refetchSuspendedUsers,
  } = useQuery({
    queryKey: ["superadmin", "suspended-users"],
    queryFn: async () => {
      const response = await superAdminInstance.get<ManagedUser[]>("/suspended-users");
      return response.data || [];
    },
  });

  const liftSuspensionMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await superAdminInstance.post(`/lift-suspension/${userId}`);
      return response.data;
    },
    onSuccess: (_, userId) => {
      setSuccessModal({
        isOpen: true,
        title: "Suspension lifted",
        message: `User ID ${userId} can now access their account again.`,
      });
      refetchSuspendedUsers();
    },
    onError: (error) => {
      const apiError = handleApiError(error);
      setErrorModal({
        isOpen: true,
        title: "Unable to lift suspension",
        message: apiError.message,
      });
    },
  });

  const removeRestrictionMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await superAdminInstance.post(`/remove-submission-restriction/${userId}`);
      return response.data;
    },
    onSuccess: (_, userId) => {
      setSuccessModal({
        isOpen: true,
        title: "Restriction lifted",
        message: `Submission restriction for user ID ${userId} has been removed.`,
      });
      refetchRestrictedUsers();
    },
    onError: (error) => {
      const apiError = handleApiError(error);
      setErrorModal({
        isOpen: true,
        title: "Unable to lift restriction",
        message: apiError.message,
      });
    },
  });

  const isActionPending = liftSuspensionMutation.isPending || removeRestrictionMutation.isPending;

  const openConfirm = (action: LiftAction, user: ManagedUser) => {
    setConfirmState({ isOpen: true, action, user });
  };

  const handleConfirm = async () => {
    if (!confirmState.user) return;

    if (confirmState.action === "suspension") {
      await liftSuspensionMutation.mutateAsync(confirmState.user.id);
    }

    if (confirmState.action === "restriction") {
      await removeRestrictionMutation.mutateAsync(confirmState.user.id);
    }

    setConfirmState(defaultConfirmState);
  };

  const closeConfirm = () => {
    if (isActionPending) return;
    setConfirmState(defaultConfirmState);
  };

  const renderUsersTable = (
    users: ManagedUser[],
    type: LiftAction,
  ) => {
    if (users.length === 0) {
      return (
        <div className="px-6 py-8 text-sm text-gray-500">
          {type === "restriction"
            ? "No submission-restricted users found."
            : "No suspended users found."}
        </div>
      );
    }

    return (
      <div className="overflow-x-auto -mx-2 sm:mx-0">
        <table className="w-full min-w-[780px]">
          <thead className="bg-gray-50 border-y border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">ID</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Name</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Email</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Reject Counter</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {users.map((user) => (
              <tr key={`${type}-${user.id}`} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">{user.id}</td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">{buildDisplayName(user)}</td>
                <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">{user.email}</td>
                <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">{user.reject_counter ?? 0}</td>
                <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                  {type === "restriction" ? (
                    <span className="inline-flex w-fit items-center rounded-full px-2.5 py-1 text-[11px] font-medium bg-amber-50 text-amber-700">
                      Restricted
                    </span>
                  ) : (
                    <span className="inline-flex w-fit items-center rounded-full px-2.5 py-1 text-[11px] font-medium bg-red-50 text-red-700">
                      Suspended
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        navigate(`/superadmin/resident-account-management/rejected-complaints/${user.id}`, {
                          state: { user },
                        });
                      }}
                      className="inline-flex items-center justify-center min-h-9 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      View
                    </button>
                    <button
                      type="button"
                      onClick={() => openConfirm(type, user)}
                      disabled={isActionPending}
                      className="inline-flex items-center justify-center min-h-9 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {type === "restriction" ? "Lift Restriction" : "Lift Suspension"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Resident Account Management"
        description="Review restricted and suspended users, view rejected complaints, and restore account access."
      />

      {(isRestrictedLoading || isSuspendedLoading) && <LoadingIndicator />}

      {restrictedError && (
        <ErrorMessage message="Failed to load submission-restricted users. Please refresh." />
      )}

      {suspendedError && (
        <ErrorMessage message="Failed to load suspended users. Please refresh." />
      )}

      {!isRestrictedLoading && !isSuspendedLoading && !restrictedError && !suspendedError && (
        <>
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Submission-Restricted Users</h2>
                <p className="text-xs text-gray-500">{restrictedUsers.length} users found</p>
              </div>
              <button
                type="button"
                onClick={() => refetchRestrictedUsers()}
                className="text-xs font-semibold text-green-700 hover:text-green-800"
              >
                Refresh
              </button>
            </div>
            {renderUsersTable(restrictedUsers, "restriction")}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Suspended Users</h2>
                <p className="text-xs text-gray-500">{suspendedUsers.length} users found</p>
              </div>
              <button
                type="button"
                onClick={() => refetchSuspendedUsers()}
                className="text-xs font-semibold text-green-700 hover:text-green-800"
              >
                Refresh
              </button>
            </div>
            {renderUsersTable(suspendedUsers, "suspension")}
          </div>
        </>
      )}

      <ConfirmationModal
        isOpen={confirmState.isOpen}
        title={confirmState.action === "suspension" ? "Lift suspension" : "Lift restriction"}
        message={
          confirmState.user
            ? confirmState.action === "suspension"
              ? `Lift suspension for ${buildDisplayName(confirmState.user)}?`
              : `Lift submission restriction for ${buildDisplayName(confirmState.user)}?`
            : "Confirm this action?"
        }
        confirmText={confirmState.action === "suspension" ? "Lift Suspension" : "Lift Restriction"}
        confirmColor="green"
        onConfirm={handleConfirm}
        onCancel={closeConfirm}
        isLoading={isActionPending}
      />

      <SuccessModal
        isOpen={successModal.isOpen}
        title={successModal.title}
        message={successModal.message}
        onClose={() => setSuccessModal({ isOpen: false, title: "", message: "" })}
      />
      <ErrorModal
        isOpen={errorModal.isOpen}
        title={errorModal.title}
        message={errorModal.message}
        onClose={() => setErrorModal({ isOpen: false, title: "", message: "" })}
      />
    </div>
  );
};

export default SuperAdminResidentAccountManagement;
