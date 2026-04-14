import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { PageHeader } from "../../general";
import { superAdminInstance } from "../../../services/axios/apiServices";
import { SuccessModal } from "../../general/SuccessModal";
import { ErrorModal } from "../../general/ErrorModal";
import { handleApiError } from "../../../utils/apiErrorHandler";
import { ConfirmationModal } from "../../general/ConfirmationModal";
import { ErrorMessage } from "../../general/ErrorMessage";
import LoadingIndicator from "../../general/LoadingIndicator";

interface UnverifiedUser {
  id: number;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  role?: string | null;
  created_at?: string | null;
  is_verified: boolean;
}

interface PaginatedResponse {
  items: UnverifiedUser[];
  total: number;
  page: number;
  page_size: number;
}

export const SuperAdminVerifyUsers: React.FC = () => {
  const [selectedUser, setSelectedUser] = useState<UnverifiedUser | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [successModal, setSuccessModal] = useState({ isOpen: false, title: "", message: "" });
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: "", message: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["superadmin", "unverified-users", currentPage, itemsPerPage],
    queryFn: async () => {
      const response = await superAdminInstance.get<PaginatedResponse>("/unverified-users", {
        params: {
          page: currentPage,
          page_size: itemsPerPage,
        },
      });
      return response.data;
    },
  });

  const users = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / itemsPerPage));
  const startIndex = total === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(currentPage * itemsPerPage, total);

  const verifyMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await superAdminInstance.post(`/verify-user-account/${id}`);
      return response.data;
    },
    onSuccess: () => {
      setConfirmOpen(false);
      setSelectedUser(null);
      setSuccessModal({
        isOpen: true,
        title: "User verified",
        message: "The user account has been marked as verified.",
      });
      setCurrentPage((prev) => (users.length === 1 ? Math.max(1, prev - 1) : prev));
      refetch();
    },
    onError: (err) => {
      const apiError = handleApiError(err);
      setConfirmOpen(false);
      setErrorModal({
        isOpen: true,
        title: "Unable to verify user",
        message: apiError.message,
      });
    },
  });

  const handleVerifyClick = (user: UnverifiedUser) => {
    setSelectedUser(user);
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    if (!selectedUser) return;
    await verifyMutation.mutateAsync(selectedUser.id);
  };

  const buildDisplayName = (user: UnverifiedUser) => {
    const name = `${user.first_name || ""} ${user.last_name || ""}`.trim();
    return name || user.email;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Verify Users"
        description="Approve access by verifying user accounts."
      />

      {isLoading && <LoadingIndicator />}

      {error && (
        <ErrorMessage message="Failed to load unverified users. Please refresh." />
      )}

      {!isLoading && !error && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Unverified Users</h2>
              <p className="text-xs text-gray-500">{total} pending verification</p>
            </div>
            <button
              type="button"
              onClick={() => refetch()}
              className="text-xs font-semibold text-green-700 hover:text-green-800"
            >
              Refresh
            </button>
          </div>

          {users.length === 0 ? (
            <div className="px-6 py-10 text-sm text-gray-500">All users are verified.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {users.map((user) => (
                <div key={user.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{buildDisplayName(user)}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-gray-500">
                      <span className="px-2 py-0.5 rounded-full bg-gray-100">ID: {user.id}</span>
                      {user.role && (
                        <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">{user.role}</span>
                      )}
                      {user.created_at && (
                        <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-700">
                          Joined {new Date(user.created_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleVerifyClick(user)}
                    className="inline-flex items-center justify-center rounded-lg bg-green-600 px-4 py-2 text-xs font-semibold text-white hover:bg-green-700 transition disabled:opacity-60"
                  >
                    Verify
                  </button>
                </div>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-gray-100">
              <div className="text-xs text-gray-600">
                Showing <span className="font-semibold text-gray-900">{startIndex}</span> to{' '}
                <span className="font-semibold text-gray-900">{endIndex}</span> of{' '}
                <span className="font-semibold text-gray-900">{total}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="inline-flex items-center justify-center px-3 py-2 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Prev
                </button>
                <div className="px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-xs font-medium text-green-900">
                  Page {currentPage} of {totalPages}
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center justify-center px-3 py-2 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <ConfirmationModal
        isOpen={confirmOpen}
        title="Verify user"
        message={selectedUser ? `Verify ${buildDisplayName(selectedUser)}? This will grant access to the system.` : "Verify this user?"}
        confirmText="Confirm"
        confirmColor="green"
        onConfirm={handleConfirm}
        onCancel={() => {
          if (!verifyMutation.isPending) {
            setConfirmOpen(false);
            setSelectedUser(null);
          }
        }}
        isLoading={verifyMutation.isPending}
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

export default SuperAdminVerifyUsers;
