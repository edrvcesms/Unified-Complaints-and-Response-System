import { useQuery } from "@tanstack/react-query";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../../general";
import { superAdminInstance } from "../../../services/axios/apiServices";
import LoadingIndicator from "../../general/LoadingIndicator";
import { ErrorMessage } from "../../general/ErrorMessage";

interface ManagedUser {
  id: number;
  first_name?: string | null;
  last_name?: string | null;
  email: string;
}

interface RejectedComplaint {
  id: number;
  title: string;
  description?: string | null;
  status: string;
  created_at?: string | null;
  rejection_category_id?: number | null;
}

interface UserLocationState {
  user?: ManagedUser;
}

const buildDisplayName = (user?: ManagedUser) => {
  if (!user) return "Selected User";
  const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim();
  return fullName || user.email;
};

export const SuperAdminUserRejectedComplaints: React.FC = () => {
  const navigate = useNavigate();
  const { userId } = useParams();
  const location = useLocation();
  const locationState = (location.state || {}) as UserLocationState;
  const selectedUser = locationState.user;

  const {
    data: rejectedComplaints = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["superadmin", "rejected-complaints", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const response = await superAdminInstance.get<RejectedComplaint[]>(`/rejected-complaints/${userId}`);
      return response.data || [];
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rejected Complaints"
        description={`Showing rejected complaints for ${buildDisplayName(selectedUser)}${userId ? ` (ID: ${userId})` : ""}.`}
      />

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate("/superadmin/resident-account-management")}
          className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Back to Resident Account Management
        </button>
        <button
          type="button"
          onClick={() => {
            void refetch();
          }}
          className="inline-flex items-center rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700"
        >
          Refresh
        </button>
      </div>

      {isLoading && <LoadingIndicator />}

      {error && (
        <ErrorMessage message="Failed to load rejected complaints for this user." />
      )}

      {!isLoading && !error && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">Complaints</h2>
            <p className="text-xs text-gray-500">{rejectedComplaints.length} rejected complaints found</p>
          </div>

          {rejectedComplaints.length === 0 ? (
            <div className="px-6 py-8 text-sm text-gray-500">This user has no rejected complaints.</div>
          ) : (
            <div className="overflow-x-auto -mx-2 sm:mx-0">
              <table className="w-full min-w-[980px]">
                <thead className="bg-gray-50 border-y border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Complaint ID</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Title</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Rejection Category</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Created At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {rejectedComplaints.map((complaint) => (
                    <tr key={complaint.id} className="hover:bg-gray-50 align-top">
                      <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">{complaint.id}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">{complaint.title}</td>
                      <td className="px-6 py-4 text-sm text-gray-700 max-w-[380px] whitespace-normal break-words">{complaint.description?.trim() || "-"}</td>
                      <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                        <span className="inline-flex w-fit items-center rounded-full px-2.5 py-1 text-[11px] font-medium bg-red-50 text-red-700">
                          Rejected
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">{complaint.rejection_category_id ?? "-"}</td>
                      <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                        {complaint.created_at ? new Date(complaint.created_at).toLocaleDateString() : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SuperAdminUserRejectedComplaints;
