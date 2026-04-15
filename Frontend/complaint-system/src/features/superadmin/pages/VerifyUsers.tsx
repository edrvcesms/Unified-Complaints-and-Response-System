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

type VerificationFilter = "all" | "verified" | "unverified";

export const SuperAdminVerifyUsers: React.FC = () => {
  const [selectedUser, setSelectedUser] = useState<UnverifiedUser | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [successModal, setSuccessModal] = useState({ isOpen: false, title: "", message: "" });
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: "", message: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const [verificationFilter, setVerificationFilter] = useState<VerificationFilter>("all");
  const itemsPerPage = 8;

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["superadmin", "users", verificationFilter, currentPage, itemsPerPage],
    queryFn: async () => {
      const params: { page: number; page_size: number; is_verified?: boolean } = {
          page: currentPage,
          page_size: itemsPerPage,
      };

      if (verificationFilter === "verified") {
        params.is_verified = true;
      }

      if (verificationFilter === "unverified") {
        params.is_verified = false;
      }

      const response = await superAdminInstance.get<PaginatedResponse>("/users", {
        params,
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
        message: "The user account has been verified.",
      });
      setCurrentPage((prev) => (
        verificationFilter === "unverified" && users.length === 1
          ? Math.max(1, prev - 1)
          : prev
      ));
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
              <h2 className="text-base font-semibold text-gray-900">Users</h2>
              <p className="text-xs text-gray-500">{total} users found</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setCurrentPage(1);
                  setVerificationFilter("all");
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                  verificationFilter === "all"
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => {
                  setCurrentPage(1);
                  setVerificationFilter("unverified");
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                  verificationFilter === "unverified"
                    ? "bg-amber-100 text-amber-900 border-amber-300"
                    : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                }`}
              >
                Unverified
              </button>
              <button
                type="button"
                onClick={() => {
                  setCurrentPage(1);
                  setVerificationFilter("verified");
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                  verificationFilter === "verified"
                    ? "bg-green-100 text-green-900 border-green-300"
                    : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                }`}
              >
                Verified
              </button>
            </div>
          </div>

          {users.length === 0 ? (
            <div className="px-6 py-10 text-sm text-gray-500">
              {verificationFilter === "unverified" && "No unverified users found."}
              {verificationFilter === "verified" && "No verified users found."}
              {verificationFilter === "all" && "No users found."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Joined At</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50/70">
                      <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">{user.id}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">{buildDisplayName(user)}</td>
                      <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">{user.email}</td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex flex-col gap-2">
                          <span
                            className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${
                              user.is_verified
                                ? "bg-green-50 text-green-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {user.is_verified ? "Verified" : "Not Verified"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString() : "-"}
                      </td>
                      <td className="px-6 py-4 text-sm whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleVerifyClick(user)}
                          disabled={user.is_verified}
                          className="inline-flex items-center justify-center rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {user.is_verified ? "Verified" : "Verify"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
