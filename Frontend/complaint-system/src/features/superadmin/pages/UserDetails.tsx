import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { User as UserIcon, MapPin, IdCard, ShieldCheck } from "lucide-react";
import { PageHeader } from "../../general";
import { superAdminInstance } from "../../../services/axios/apiServices";
import { ConfirmationModal } from "../../general/ConfirmationModal";
import { SuccessModal } from "../../general/SuccessModal";
import { ErrorModal } from "../../general/ErrorModal";
import { handleApiError } from "../../../utils/apiErrorHandler";
import LoadingIndicator from "../../general/LoadingIndicator";
import { ErrorMessage } from "../../general/ErrorMessage";
import type { UserData } from "../../../types/general/user";

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined || value === "") return "—";

  if (typeof value === "boolean") return value ? "Yes" : "No";

  if (typeof value === "string") {
    const normalized = value.trim();
    if (!normalized) return "—";

    const isoDate = Date.parse(normalized);
    if (!Number.isNaN(isoDate)) {
      return new Date(normalized).toLocaleString();
    }
    return normalized;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "—";
  }

  return String(value);
};

// For backend enum-style values that come back lowercase ("user", "male", "national_id").
const formatEnumValue = (value: unknown): string => {
  const formatted = formatValue(value);
  if (formatted === "—") return formatted;
  return formatted
    .replace(/_/g, " ")
    .split(" ")
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(" ");
};

// Date-only, no time — for fields like birthdate where the time component is meaningless.
const formatDateOnly = (value: unknown): string => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value !== "string") return formatValue(value);

  const normalized = value.trim();
  if (!normalized) return "—";

  const parsed = Date.parse(normalized);
  if (Number.isNaN(parsed)) return normalized;

  return new Date(normalized).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const buildDisplayName = (user?: Partial<UserData>) => {
  if (!user) return "Selected User";
  const fullName = [user.first_name, user.middle_name, user.last_name, user.suffix]
    .filter(Boolean)
    .join(" ")
    .trim();
  return fullName || user.email || "Selected User";
};

const getInitials = (user?: Partial<UserData>) => {
  const first = user?.first_name?.[0] ?? "";
  const last = user?.last_name?.[0] ?? "";
  const initials = `${first}${last}`.toUpperCase();
  return initials || (user?.email?.[0]?.toUpperCase() ?? "?");
};

// Deterministic accent from the user's id, so avatars aren't all the same color.
const AVATAR_PALETTE = [
  "bg-emerald-100 text-emerald-700",
  "bg-blue-100 text-blue-700",
  "bg-violet-100 text-violet-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-cyan-100 text-cyan-700",
];
const getAvatarTone = (id?: number | string) => {
  const n = typeof id === "number" ? id : Number(id) || 0;
  return AVATAR_PALETTE[n % AVATAR_PALETTE.length];
};

const Field: React.FC<{ label: string; value: unknown; enumStyle?: boolean; dateOnly?: boolean }> = ({
  label,
  value,
  enumStyle,
  dateOnly,
}) => (
  <div>
    <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">{label}</p>
    <p className="mt-1 text-sm text-gray-900 break-words">
      {dateOnly ? formatDateOnly(value) : enumStyle ? formatEnumValue(value) : formatValue(value)}
    </p>
  </div>
);

const Section: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({
  title,
  icon,
  children,
}) => (
  <div className="py-6 first:pt-0">
    <div className="mb-4 flex items-center gap-2 text-gray-500">
      {icon}
      <h3 className="text-xs font-semibold uppercase tracking-wider">{title}</h3>
    </div>
    <div className="grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-3">{children}</div>
  </div>
);

const Badge: React.FC<{ label: string; tone: "green" | "gray" }> = ({ label, tone }) => (
  <span
    className={
      "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium " +
      (tone === "green" ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500")
    }
  >
    {tone === "green" && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
    {label}
  </span>
);

const IDThumb: React.FC<{ label: string; src?: string | null }> = ({ label, src }) => {
  if (!src) {
    return (
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">{label}</p>
        <div className="mt-2 flex h-28 w-full items-center justify-center rounded-lg border border-dashed border-gray-200 text-xs text-gray-400">
          Not provided
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">{label}</p>
      <a href={src} target="_blank" rel="noreferrer" className="group mt-2 block">
        <img
          src={src}
          alt={label}
          className="h-auto w-full rounded-lg border border-gray-200 object-cover shadow-sm transition group-hover:opacity-80"
        />
      </a>
    </div>
  );
};

export const SuperAdminUserDetails: React.FC = () => {
  const navigate = useNavigate();
  const { userId } = useParams();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [successModal, setSuccessModal] = useState({ isOpen: false, title: "", message: "" });
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: "", message: "" });

  const {
    data: user,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["superadmin", "user-details", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      if (!userId) throw new Error("User ID is required");
      const response = await superAdminInstance.get<UserData>(`/unverified-user/${userId}`);
      return response.data;
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await superAdminInstance.post(`/verify-user-account/${id}`);
      return response.data;
    },
    onSuccess: () => {
      setConfirmOpen(false);
      setSuccessModal({
        isOpen: true,
        title: "User verified",
        message: "The user account has been verified successfully.",
      });
      void refetch();
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

  const handleVerifyConfirm = async () => {
    if (!userId) return;
    await verifyMutation.mutateAsync(Number(userId));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Details"
        description={
          user ? `Review the full profile record for ${buildDisplayName(user)}.` : "Review the full profile record for this user."
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => navigate("/superadmin/verify-users")}
          className="text-sm font-medium text-gray-500 hover:text-gray-900"
        >
          ← Back to Verify Users
        </button>
        <button
          type="button"
          onClick={() => void refetch()}
          className="ml-auto inline-flex items-center rounded-md border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      {isLoading && <LoadingIndicator />}
      {error && <ErrorMessage message="Failed to load user details. Please try again." />}

      {!isLoading && !error && user && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          {/* Identity header */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 px-6 py-5">
            <div className="flex items-center gap-4">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-full text-base font-semibold ${getAvatarTone(
                  user.id,
                )}`}
              >
                {getInitials(user)}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{buildDisplayName(user)}</h2>
                <p className="text-sm text-gray-500">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge label={user.is_verified ? "Verified" : "Unverified"} tone={user.is_verified ? "green" : "gray"} />
              {user.is_administrator && <Badge label="Administrator" tone="gray" />}
              {!user.is_verified && (
                <button
                  type="button"
                  onClick={() => setConfirmOpen(true)}
                  className="inline-flex items-center rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
                >
                  Verify User
                </button>
              )}
            </div>
          </div>

          <div className="divide-y divide-gray-100 px-6">
            <Section title="Personal" icon={<UserIcon className="h-3.5 w-3.5" />}>
              <Field label="First Name" value={user.first_name} />
              <Field label="Middle Name" value={user.middle_name} />
              <Field label="Last Name" value={user.last_name} />
              <Field label="Suffix" value={user.suffix} />
              <Field label="Age" value={user.age} />
              <Field label="Birthdate" value={user.birthdate} dateOnly />
              <Field label="Gender" value={user.gender} enumStyle />
            </Section>

            <Section title="Contact & Address" icon={<MapPin className="h-3.5 w-3.5" />}>
              <Field label="Phone Number" value={user.phone_number} />
              <Field label="Barangay" value={user.barangay} />
              <Field label="Full Address" value={user.full_address} />
              <Field label="Latitude" value={user.latitude} />
              <Field label="Longitude" value={user.longitude} />
            </Section>

            <Section title="Identification" icon={<IdCard className="h-3.5 w-3.5" />}>
              <Field label="ID Type" value={user.id_type} enumStyle />
              <Field label="ID Number" value={user.id_number} />
            </Section>

            <div className="py-6">
              <div className="mb-4 flex items-center gap-2 text-gray-500">
                <IdCard className="h-3.5 w-3.5" />
                <h3 className="text-xs font-semibold uppercase tracking-wider">ID Documents</h3>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <IDThumb label="Front ID" src={user.front_id} />
                <IDThumb label="Back ID" src={user.back_id} />
                <IDThumb label="Selfie with ID" src={user.selfie_with_id} />
              </div>
            </div>

            <Section title="Account" icon={<ShieldCheck className="h-3.5 w-3.5" />}>
              <Field label="User ID" value={user.id} />
              <Field label="Joined At" value={user.created_at} />
              <Field label="Last Login" value={user.last_login} />
            </Section>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={confirmOpen}
        title="Verify user"
        message={user ? `Verify ${buildDisplayName(user)}? This will grant access to the system.` : "Verify this user?"}
        confirmText="Confirm"
        confirmColor="green"
        onConfirm={handleVerifyConfirm}
        onCancel={() => {
          if (!verifyMutation.isPending) {
            setConfirmOpen(false);
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

export default SuperAdminUserDetails;