import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { PageHeader } from "../../general";
import { useSubmitForm } from "../../../hooks/useSubmitForm";
import { superAdminInstance } from "../../../services/axios/apiServices";
import { SuccessModal } from "../../general/SuccessModal";
import { ErrorModal } from "../../general/ErrorModal";
import LoadingIndicator from "../../general/LoadingIndicator";
import { ErrorMessage } from "../../general/ErrorMessage";
import { validateTitle } from "../../../utils/validators";

interface EmergencyContact {
  id: number;
  contact_number: string;
}

interface EmergencyAgency {
  id: number;
  agency_name: string;
  created_at?: string | null;
  emergency_contacts?: EmergencyContact[];
}

interface HotlineFormData {
  agency_name: string;
  contact_numbers: string[];
}

const DEFAULT_FORM: HotlineFormData = {
  agency_name: "",
  contact_numbers: [""],
};

export const SuperAdminEmergencyHotlines: React.FC = () => {
  const [formData, setFormData] = useState<HotlineFormData>(DEFAULT_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [successModal, setSuccessModal] = useState({ isOpen: false, title: "", message: "" });
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: "", message: "" });

  const {
    data: hotlines = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["superadmin", "emergency-hotlines"],
    queryFn: async () => {
      try {
        const response = await superAdminInstance.get<EmergencyAgency[]>("/emergency-hotlines");
        return response.data || [];
      } catch (err) {
        const status = (err as AxiosError)?.response?.status;
        if (status === 404) return [];
        throw err;
      }
    },
  });

  const createMutation = useSubmitForm<HotlineFormData>({
    endpoint: "/emergency-hotlines/add-hotline",
    axiosInstance: superAdminInstance,
    validators: [
      (data: HotlineFormData) => {
        const nextErrors: Record<string, string> = {};
        const nameError = validateTitle(data.agency_name, "Agency name");
        if (nameError) nextErrors.agency_name = nameError;

        if (!Array.isArray(data.contact_numbers) || data.contact_numbers.length === 0) {
          nextErrors.contact_numbers = "At least one contact number is required.";
        } else if (data.contact_numbers.some((value) => !value.trim())) {
          nextErrors.contact_numbers = "Please fill in all contact numbers.";
        }

        return Object.keys(nextErrors).length > 0 ? nextErrors : null;
      },
    ],
    onSuccess: () => {
      setFormData(DEFAULT_FORM);
      setErrors({});
      setIsCreateModalOpen(false);
      setSuccessModal({
        isOpen: true,
        title: "Hotline added",
        message: "The emergency hotline has been saved.",
      });
      refetch();
    },
    onError: (error) => {
      setErrors(error.errors || {});
      setErrorModal({
        isOpen: true,
        title: "Unable to add hotline",
        message: error.general || "Please check the form and try again.",
      });
    },
  });

  const handleAgencyChange = (value: string) => {
    setFormData((prev) => ({ ...prev, agency_name: value }));
    setErrors((prev) => ({ ...prev, agency_name: "" }));
  };

  const handleContactChange = (index: number, value: string) => {
    setFormData((prev) => {
      const updated = [...prev.contact_numbers];
      updated[index] = value;
      return { ...prev, contact_numbers: updated };
    });
    setErrors((prev) => ({ ...prev, contact_numbers: "" }));
  };

  const addContactNumber = () => {
    setFormData((prev) => ({ ...prev, contact_numbers: [...prev.contact_numbers, ""] }));
  };

  const removeContactNumber = (index: number) => {
    setFormData((prev) => {
      if (prev.contact_numbers.length <= 1) return prev;
      const updated = prev.contact_numbers.filter((_, idx) => idx !== index);
      return { ...prev, contact_numbers: updated };
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const payload: HotlineFormData = {
      agency_name: formData.agency_name.trim(),
      contact_numbers: formData.contact_numbers.map((value) => value.trim()),
    };

    await createMutation.mutateAsync(payload as any);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Emergency Hotlines"
        description="Manage agency hotlines for emergency response."
      />

      <div className="flex justify-start">
        <button
          type="button"
          onClick={() => {
            setErrors({});
            setIsCreateModalOpen(true);
          }}
          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 transition"
        >
          Add New Hotline
        </button>
      </div>

      {isLoading && <LoadingIndicator />}

      {error && (
        <ErrorMessage message="Failed to load emergency hotlines. Please refresh." />
      )}

      {!isLoading && !error && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Agencies</h2>
              <p className="text-xs text-gray-500">{hotlines.length} agencies</p>
            </div>
            <button
              type="button"
              onClick={() => refetch()}
              className="text-xs font-semibold text-green-700 hover:text-green-800"
            >
              Refresh
            </button>
          </div>

          {hotlines.length === 0 ? (
            <div className="px-6 py-10 text-sm text-gray-500">No emergency hotlines found.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {hotlines.map((agency) => (
                <div key={agency.id} className="px-6 py-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{agency.agency_name}</p>
                      <p className="text-xs text-gray-500">ID: {agency.id}</p>
                    </div>
                    {agency.created_at && (
                      <span className="text-xs text-gray-500">
                        Added {new Date(agency.created_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {agency.emergency_contacts && agency.emergency_contacts.length > 0 ? (
                      agency.emergency_contacts.map((contact) => (
                        <span
                          key={contact.id}
                          className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700"
                        >
                          {contact.contact_number}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-gray-500">No contact numbers</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
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

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-xl border border-gray-200 bg-white p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Add Emergency Hotline</h2>
                <p className="text-xs text-gray-500">Provide the agency name and contact numbers.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setErrors({});
                }}
                className="text-sm font-semibold text-gray-500 hover:text-gray-700"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600">Agency name</label>
                <input
                  name="agency_name"
                  value={formData.agency_name}
                  onChange={(e) => handleAgencyChange(e.target.value)}
                  className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none ${
                    errors.agency_name ? "border-red-300 focus:border-red-400" : "border-gray-200 focus:border-green-500"
                  }`}
                  placeholder="e.g. City Fire Department"
                />
                {errors.agency_name && (
                  <p className="mt-1 text-xs text-red-600">{errors.agency_name}</p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-gray-600">Contact numbers</label>
                  <button
                    type="button"
                    onClick={addContactNumber}
                    className="text-xs font-semibold text-green-700 hover:text-green-800"
                  >
                    Add number
                  </button>
                </div>
                <div className="mt-2 space-y-2">
                  {formData.contact_numbers.map((value, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        value={value}
                        onChange={(e) => handleContactChange(index, e.target.value)}
                        className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none ${
                          errors.contact_numbers ? "border-red-300 focus:border-red-400" : "border-gray-200 focus:border-green-500"
                        }`}
                        placeholder="e.g. 0917-123-4567"
                      />
                      <button
                        type="button"
                        onClick={() => removeContactNumber(index)}
                        disabled={formData.contact_numbers.length === 1}
                        className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
                {errors.contact_numbers && (
                  <p className="mt-1 text-xs text-red-600">{errors.contact_numbers}</p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setErrors({});
                  }}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 transition disabled:opacity-60"
                >
                  {createMutation.isPending ? "Saving..." : "Save hotline"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminEmergencyHotlines;
