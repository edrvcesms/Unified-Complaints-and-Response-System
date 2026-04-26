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
import { Pagination } from "../../barangay/components/Pagination";

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
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
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
            <>
              <div className="px-3 pt-2 text-[11px] text-gray-500 sm:hidden">
                Swipe horizontally to view all columns.
              </div>
              <div className="overflow-x-auto -mx-2 sm:mx-0">
                <table className="w-full min-w-[740px]">
                <thead className="bg-gray-50 border-y border-gray-200">
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
                    <tr key={user.id} className="hover:bg-gray-50">
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
                          className="inline-flex items-center justify-center min-h-9 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {user.is_verified ? "Verified" : "Verify"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </>
          )}

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
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
