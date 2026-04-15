import { useState } from "react";
import { useSubmitForm } from "../../../hooks/useSubmitForm";
import { superAdminInstance } from "../../../services/axios/apiServices";
import { PageHeader } from "../../general";
import { SuccessModal } from "../../general/SuccessModal";
import { ErrorModal } from "../../general/ErrorModal";
import { validateEmail, validatePassword, validateTitle } from "../../../utils/validators";
import type { LoginRequestData } from "../../../types/auth/login";
import { Building2, Landmark, ShieldCheck, type LucideIcon } from "lucide-react";

interface BarangayFormData {
  barangay_name: string;
  barangay_address: string;
  barangay_contact_number: string;
  barangay_email: string;
  password: string;
  latitude: string;
  longitude: string;
}

interface DepartmentFormData {
  department_name: string;
  description: string;
  email: string;
  password: string;
}

interface LguFormData {
  email: string;
  password: string;
}

type AccountType = "barangay" | "department" | "lgu";

const buildEmailValidator = (email: string) =>
  validateEmail({ email, password: "", role: "official" } as LoginRequestData);

const buildPasswordValidator = (password: string) =>
  validatePassword({ email: "", password, role: "official" } as LoginRequestData);

const SectionCard: React.FC<{ title: string; description?: string; children: React.ReactNode }> = ({
  title,
  description,
  children,
}) => (
  <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
    <div className="mb-4">
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      {description && <p className="mt-1 text-xs text-gray-500">{description}</p>}
    </div>
    {children}
  </div>
);

const FieldError: React.FC<{ message?: string }> = ({ message }) => (
  message ? <p className="mt-1 text-xs text-red-600">{message}</p> : null
);

const AccountTypeCard: React.FC<{
  title: string;
  description: string;
  icon: LucideIcon;
  iconWrapperClassName: string;
  iconClassName: string;
  onClick: () => void;
}> = ({ title, description, icon: Icon, iconWrapperClassName, iconClassName, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="rounded-xl border border-gray-200 bg-white p-5 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-green-300 hover:shadow-md"
  >
    <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl ${iconWrapperClassName}`}>
      <Icon className={`h-9 w-9 ${iconClassName}`} aria-hidden="true" />
    </div>
    <h2 className="text-base font-semibold text-gray-900">{title}</h2>
    <p className="mt-1 text-sm text-gray-600">{description}</p>
    <p className="mt-4 text-xs font-semibold text-green-700">Choose this account type</p>
  </button>
);

export const SuperAdminAccounts: React.FC = () => {
  const [successModal, setSuccessModal] = useState({ isOpen: false, title: "", message: "" });
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: "", message: "" });
  const [selectedAccountType, setSelectedAccountType] = useState<AccountType | null>(null);

  const [barangayData, setBarangayData] = useState<BarangayFormData>({
    barangay_name: "",
    barangay_address: "",
    barangay_contact_number: "",
    barangay_email: "",
    password: "",
    latitude: "",
    longitude: "",
  });
  const [barangayErrors, setBarangayErrors] = useState<Record<string, string>>({});

  const [departmentData, setDepartmentData] = useState<DepartmentFormData>({
    department_name: "",
    description: "",
    email: "",
    password: "",
  });
  const [departmentErrors, setDepartmentErrors] = useState<Record<string, string>>({});

  const [lguData, setLguData] = useState<LguFormData>({
    email: "",
    password: "",
  });
  const [lguErrors, setLguErrors] = useState<Record<string, string>>({});

  const barangayMutation = useSubmitForm({
    endpoint: "/create-brgy-account",
    axiosInstance: superAdminInstance,
    validators: [
      (data: any) => {
        const errors: Record<string, string> = {};
        const nameError = validateTitle(data.barangay_name, "Barangay name");
        if (nameError) errors.barangay_name = nameError;
        if (!data.barangay_address?.trim()) errors.barangay_address = "Address is required.";
        if (!data.barangay_contact_number?.trim()) errors.barangay_contact_number = "Contact number is required.";
        const emailError = buildEmailValidator(data.barangay_email);
        if (emailError?.email) errors.barangay_email = emailError.email;
        const passwordError = buildPasswordValidator(data.password);
        if (passwordError?.password) errors.password = passwordError.password;
        return Object.keys(errors).length > 0 ? errors : null;
      },
    ],
    onSuccess: () => {
      setBarangayData({
        barangay_name: "",
        barangay_address: "",
        barangay_contact_number: "",
        barangay_email: "",
        password: "",
        latitude: "",
        longitude: "",
      });
      setBarangayErrors({});
      setSuccessModal({
        isOpen: true,
        title: "Barangay account created",
        message: "The barangay account has been saved successfully.",
      });
    },
    onError: (error) => {
      setBarangayErrors(error.errors || {});
      setErrorModal({
        isOpen: true,
        title: "Unable to create barangay account",
        message: error.general || "Please check the form and try again.",
      });
    },
  });

  const departmentMutation = useSubmitForm({
    endpoint: "/create-department",
    axiosInstance: superAdminInstance,
    validators: [
      (data: any) => {
        const errors: Record<string, string> = {};
        const nameError = validateTitle(data.department_name, "Department name");
        if (nameError) errors.department_name = nameError;
        const emailError = buildEmailValidator(data.email);
        if (emailError?.email) errors.email = emailError.email;
        const passwordError = buildPasswordValidator(data.password);
        if (passwordError?.password) errors.password = passwordError.password;
        return Object.keys(errors).length > 0 ? errors : null;
      },
    ],
    onSuccess: () => {
      setDepartmentData({
        department_name: "",
        description: "",
        email: "",
        password: "",
      });
      setDepartmentErrors({});
      setSuccessModal({
        isOpen: true,
        title: "Department created",
        message: "The department account has been saved successfully.",
      });
    },
    onError: (error) => {
      setDepartmentErrors(error.errors || {});
      setErrorModal({
        isOpen: true,
        title: "Unable to create department",
        message: error.general || "Please check the form and try again.",
      });
    },
  });

  const lguMutation = useSubmitForm({
    endpoint: "/create-lgu-account",
    axiosInstance: superAdminInstance,
    validators: [
      (data: any) => {
        const errors: Record<string, string> = {};
        const emailError = buildEmailValidator(data.email);
        if (emailError?.email) errors.email = emailError.email;
        const passwordError = buildPasswordValidator(data.password);
        if (passwordError?.password) errors.password = passwordError.password;
        return Object.keys(errors).length > 0 ? errors : null;
      },
    ],
    onSuccess: () => {
      setLguData({ email: "", password: "" });
      setLguErrors({});
      setSuccessModal({
        isOpen: true,
        title: "LGU account created",
        message: "The LGU official account has been saved successfully.",
      });
    },
    onError: (error) => {
      setLguErrors(error.errors || {});
      setErrorModal({
        isOpen: true,
        title: "Unable to create LGU account",
        message: error.general || "Please check the form and try again.",
      });
    },
  });

  const handleBarangaySubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const payload = {
      barangay_name: barangayData.barangay_name,
      barangay_address: barangayData.barangay_address,
      barangay_contact_number: barangayData.barangay_contact_number,
      barangay_email: barangayData.barangay_email,
      password: barangayData.password,
      latitude: barangayData.latitude ? Number(barangayData.latitude) : undefined,
      longitude: barangayData.longitude ? Number(barangayData.longitude) : undefined,
    };

    await barangayMutation.mutateAsync(payload as any);
  };

  const handleDepartmentSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await departmentMutation.mutateAsync({
      department_name: departmentData.department_name,
      description: departmentData.description || undefined,
      email: departmentData.email,
      password: departmentData.password,
    } as any);
  };

  const handleLguSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await lguMutation.mutateAsync(lguData as any);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Accounts"
        description="Create and manage accounts for barangays, departments, and LGU officials."
      />

      {!selectedAccountType && (
        <div className="grid gap-4 md:grid-cols-3">
          <AccountTypeCard
            title="Create Barangay Account"
            description="Set up a barangay profile with contact details and login credentials."
            icon={Landmark}
            iconWrapperClassName="bg-green-100"
            iconClassName="text-green-700"
            onClick={() => setSelectedAccountType("barangay")}
          />
          <AccountTypeCard
            title="Create Department Account"
            description="Register a department and assign its official account credentials."
            icon={Building2}
            iconWrapperClassName="bg-blue-100"
            iconClassName="text-blue-700"
            onClick={() => setSelectedAccountType("department")}
          />
          <AccountTypeCard
            title="Create LGU Account"
            description="Create an LGU official account with secure login details."
            icon={ShieldCheck}
            iconWrapperClassName="bg-amber-100"
            iconClassName="text-amber-700"
            onClick={() => setSelectedAccountType("lgu")}
          />
        </div>
      )}

      {selectedAccountType && (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setSelectedAccountType(null)}
            className="text-sm font-semibold text-green-700 hover:text-green-800"
          >
            ← Change account type
          </button>

          {selectedAccountType === "barangay" && (
            <SectionCard
              title="Create Barangay Account"
              description="Provide barangay details and login credentials."
            >
              <form onSubmit={handleBarangaySubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-600">Barangay name</label>
                  <input
                    name="barangay_name"
                    value={barangayData.barangay_name}
                    onChange={(e) => {
                      setBarangayData((prev) => ({ ...prev, barangay_name: e.target.value }));
                      setBarangayErrors((prev) => ({ ...prev, barangay_name: "" }));
                    }}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
                    placeholder="Barangay name"
                  />
                  <FieldError message={barangayErrors.barangay_name} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Address</label>
                  <input
                    name="barangay_address"
                    value={barangayData.barangay_address}
                    onChange={(e) => {
                      setBarangayData((prev) => ({ ...prev, barangay_address: e.target.value }));
                      setBarangayErrors((prev) => ({ ...prev, barangay_address: "" }));
                    }}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
                    placeholder="Barangay address"
                  />
                  <FieldError message={barangayErrors.barangay_address} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Contact number</label>
                  <input
                    name="barangay_contact_number"
                    value={barangayData.barangay_contact_number}
                    onChange={(e) => {
                      setBarangayData((prev) => ({ ...prev, barangay_contact_number: e.target.value }));
                      setBarangayErrors((prev) => ({ ...prev, barangay_contact_number: "" }));
                    }}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
                    placeholder="Barangay contact number"
                  />
                  <FieldError message={barangayErrors.barangay_contact_number} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Barangay email</label>
                  <input
                    type="email"
                    name="barangay_email"
                    value={barangayData.barangay_email}
                    onChange={(e) => {
                      setBarangayData((prev) => ({ ...prev, barangay_email: e.target.value }));
                      setBarangayErrors((prev) => ({ ...prev, barangay_email: "" }));
                    }}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
                    placeholder="barangay@email.com"
                  />
                  <FieldError message={barangayErrors.barangay_email} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Password</label>
                  <input
                    type="password"
                    name="password"
                    value={barangayData.password}
                    onChange={(e) => {
                      setBarangayData((prev) => ({ ...prev, password: e.target.value }));
                      setBarangayErrors((prev) => ({ ...prev, password: "" }));
                    }}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
                    placeholder="At least 6 characters"
                  />
                  <FieldError message={barangayErrors.password} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-medium text-gray-600">Latitude (optional)</label>
                    <input
                      type="number"
                      name="latitude"
                      value={barangayData.latitude}
                      onChange={(e) => setBarangayData((prev) => ({ ...prev, latitude: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
                      placeholder="14.1142"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600">Longitude (optional)</label>
                    <input
                      type="number"
                      name="longitude"
                      value={barangayData.longitude}
                      onChange={(e) => setBarangayData((prev) => ({ ...prev, longitude: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
                      placeholder="121.4319"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={barangayMutation.isPending}
                  className="w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 transition disabled:opacity-60"
                >
                  {barangayMutation.isPending ? "Creating..." : "Create barangay account"}
                </button>
              </form>
            </SectionCard>
          )}

          {selectedAccountType === "department" && (
            <SectionCard
              title="Create Department Account"
              description="Add a department and staff login credentials."
            >
              <form onSubmit={handleDepartmentSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-600">Department name</label>
                  <input
                    name="department_name"
                    value={departmentData.department_name}
                    onChange={(e) => {
                      setDepartmentData((prev) => ({ ...prev, department_name: e.target.value }));
                      setDepartmentErrors((prev) => ({ ...prev, department_name: "" }));
                    }}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
                    placeholder="Department name"
                  />
                  <FieldError message={departmentErrors.department_name} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Description (optional)</label>
                  <textarea
                    name="description"
                    value={departmentData.description}
                    onChange={(e) => setDepartmentData((prev) => ({ ...prev, description: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
                    rows={3}
                    placeholder="Department responsibilities"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={departmentData.email}
                    onChange={(e) => {
                      setDepartmentData((prev) => ({ ...prev, email: e.target.value }));
                      setDepartmentErrors((prev) => ({ ...prev, email: "" }));
                    }}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
                    placeholder="department@email.com"
                  />
                  <FieldError message={departmentErrors.email} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Password</label>
                  <input
                    type="password"
                    name="password"
                    value={departmentData.password}
                    onChange={(e) => {
                      setDepartmentData((prev) => ({ ...prev, password: e.target.value }));
                      setDepartmentErrors((prev) => ({ ...prev, password: "" }));
                    }}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
                    placeholder="At least 6 characters"
                  />
                  <FieldError message={departmentErrors.password} />
                </div>
                <button
                  type="submit"
                  disabled={departmentMutation.isPending}
                  className="w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 transition disabled:opacity-60"
                >
                  {departmentMutation.isPending ? "Creating..." : "Create department"}
                </button>
              </form>
            </SectionCard>
          )}

          {selectedAccountType === "lgu" && (
            <SectionCard
              title="Create LGU Account"
              description="Add a new LGU official login."
            >
              <form onSubmit={handleLguSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-600">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={lguData.email}
                    onChange={(e) => {
                      setLguData((prev) => ({ ...prev, email: e.target.value }));
                      setLguErrors((prev) => ({ ...prev, email: "" }));
                    }}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
                    placeholder="lgu@email.com"
                  />
                  <FieldError message={lguErrors.email} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Password</label>
                  <input
                    type="password"
                    name="password"
                    value={lguData.password}
                    onChange={(e) => {
                      setLguData((prev) => ({ ...prev, password: e.target.value }));
                      setLguErrors((prev) => ({ ...prev, password: "" }));
                    }}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
                    placeholder="At least 6 characters"
                  />
                  <FieldError message={lguErrors.password} />
                </div>
                <button
                  type="submit"
                  disabled={lguMutation.isPending}
                  className="w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 transition disabled:opacity-60"
                >
                  {lguMutation.isPending ? "Creating..." : "Create LGU account"}
                </button>
              </form>
            </SectionCard>
          )}
        </div>
      )}

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

export default SuperAdminAccounts;
