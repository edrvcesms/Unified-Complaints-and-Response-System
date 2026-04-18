import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "../../general";
import { useSubmitForm } from "../../../hooks/useSubmitForm";
import { superAdminInstance } from "../../../services/axios/apiServices";
import { SuccessModal } from "../../general/SuccessModal";
import { ErrorModal } from "../../general/ErrorModal";
import { validateTitle } from "../../../utils/validators";
import LoadingIndicator from "../../general/LoadingIndicator";
import { ErrorMessage } from "../../general/ErrorMessage";

interface CategoryFormData {
  category_name: string;
}

interface CategoryItem {
  id: number;
  category_name: string;
  created_at?: string | null;
}

interface ConfigFormData {
  base_severity_weight: string;
  time_window_hours: string;
  category_radius_km: string;
  similarity_threshold: string;
}

interface CategoryConfigPayload {
  base_severity_weight?: number;
  time_window_hours?: number;
  category_radius_km?: number;
  similarity_threshold?: number;
}

const DEFAULT_CONFIG_FORM: ConfigFormData = {
  base_severity_weight: "",
  time_window_hours: "",
  category_radius_km: "",
  similarity_threshold: "",
};

const formatCategoryName = (value: string) =>
  value
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

export const SuperAdminCategories: React.FC = () => {
  const [formData, setFormData] = useState<CategoryFormData>({ category_name: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryItem | null>(null);
  const [configForm, setConfigForm] = useState<ConfigFormData>(DEFAULT_CONFIG_FORM);
  const [configErrors, setConfigErrors] = useState<Record<string, string>>({});
  const [successModal, setSuccessModal] = useState({ isOpen: false, title: "", message: "" });
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: "", message: "" });

  const {
    data: categories = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["superadmin", "categories"],
    queryFn: async () => {
      const response = await superAdminInstance.get<CategoryItem[]>("/categories");
      return response.data || [];
    },
  });

  const categoryMutation = useSubmitForm({
    endpoint: "/create-category",
    axiosInstance: superAdminInstance,
    validators: [
      (data: any) => {
        const errors: Record<string, string> = {};
        const nameError = validateTitle(data.category_name, "Category name");
        if (nameError) errors.category_name = nameError;
        return Object.keys(errors).length > 0 ? errors : null;
      },
    ],
    onSuccess: () => {
      setFormData({ category_name: "" });
      setErrors({});
      setIsCreateModalOpen(false);
      setSuccessModal({
        isOpen: true,
        title: "Category created",
        message: "The complaint category is now available in the system.",
      });
      refetch();
    },
    onError: (error) => {
      setErrors(error.errors || {});
      setErrorModal({
        isOpen: true,
        title: "Unable to create category",
        message: error.general || "Please check the form and try again.",
      });
    },
  });

  const updateConfigEndpoint = selectedCategory
    ? `/categories/${selectedCategory.id}/update-configs`
    : "/categories/0/update-configs";

  const buildConfigPayload = (data: ConfigFormData): CategoryConfigPayload => {
    const toNumberOrUndefined = (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return undefined;
      const parsed = Number(trimmed);
      return Number.isFinite(parsed) ? parsed : NaN;
    };

    return {
      base_severity_weight: toNumberOrUndefined(data.base_severity_weight),
      time_window_hours: toNumberOrUndefined(data.time_window_hours),
      category_radius_km: toNumberOrUndefined(data.category_radius_km),
      similarity_threshold: toNumberOrUndefined(data.similarity_threshold),
    };
  };

  const configMutation = useSubmitForm<CategoryConfigPayload>({
    endpoint: updateConfigEndpoint,
    method: "patch",
    axiosInstance: superAdminInstance,
    validators: [
      (data: CategoryConfigPayload) => {
        const nextErrors: Record<string, string> = {};
        const values = Object.values(data);
        const hasValue = values.some((value) => value !== undefined);

        if (!hasValue) {
          nextErrors.form = "Provide at least one config value.";
        }

        if (data.base_severity_weight !== undefined && !Number.isFinite(data.base_severity_weight)) {
          nextErrors.base_severity_weight = "Enter a valid number.";
        } else if (data.base_severity_weight !== undefined && data.base_severity_weight <= 0) {
          nextErrors.base_severity_weight = "Must be greater than 0.";
        }

        if (data.time_window_hours !== undefined && !Number.isFinite(data.time_window_hours)) {
          nextErrors.time_window_hours = "Enter a valid number.";
        } else if (data.time_window_hours !== undefined && data.time_window_hours <= 0) {
          nextErrors.time_window_hours = "Must be greater than 0.";
        }

        if (data.category_radius_km !== undefined && !Number.isFinite(data.category_radius_km)) {
          nextErrors.category_radius_km = "Enter a valid number.";
        } else if (data.category_radius_km !== undefined && data.category_radius_km <= 0) {
          nextErrors.category_radius_km = "Must be greater than 0.";
        }

        if (data.similarity_threshold !== undefined && !Number.isFinite(data.similarity_threshold)) {
          nextErrors.similarity_threshold = "Enter a valid number.";
        } else if (
          data.similarity_threshold !== undefined &&
          (data.similarity_threshold < 0 || data.similarity_threshold > 1)
        ) {
          nextErrors.similarity_threshold = "Must be between 0 and 1.";
        }

        return Object.keys(nextErrors).length > 0 ? nextErrors : null;
      },
    ],
    onSuccess: () => {
      setConfigForm(DEFAULT_CONFIG_FORM);
      setConfigErrors({});
      setIsConfigModalOpen(false);
      setSelectedCategory(null);
      setSuccessModal({
        isOpen: true,
        title: "Category configs updated",
        message: "The category configuration has been updated.",
      });
      refetch();
    },
    onError: (error) => {
      setConfigErrors(error.errors || {});
      setErrorModal({
        isOpen: true,
        title: "Unable to update category configs",
        message: error.general || "Please check the form and try again.",
      });
    },
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await categoryMutation.mutateAsync(formData as any);
  };

  const openConfigModal = (category: CategoryItem) => {
    setSelectedCategory(category);
    setConfigForm(DEFAULT_CONFIG_FORM);
    setConfigErrors({});
    setIsConfigModalOpen(true);
  };

  const closeConfigModal = () => {
    setIsConfigModalOpen(false);
    setSelectedCategory(null);
    setConfigErrors({});
    setConfigForm(DEFAULT_CONFIG_FORM);
  };

  const handleConfigChange = (field: keyof ConfigFormData, value: string) => {
    setConfigForm((prev) => ({ ...prev, [field]: value }));
    setConfigErrors((prev) => ({ ...prev, [field]: "", form: "" }));
  };

  const handleConfigSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedCategory) return;
    const payload = buildConfigPayload(configForm);
    await configMutation.mutateAsync(payload as any);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Complaint Categories"
        description="Add new complaint categories for incident reporting."
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
          Add New Category
        </button>
      </div>

      {isLoading && <LoadingIndicator />}

      {error && (
        <ErrorMessage message="Failed to load categories. Please refresh." />
      )}

      {!isLoading && !error && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Available Categories</h2>
              <p className="text-xs text-gray-500">{categories.length} categories</p>
            </div>
            <button
              type="button"
              onClick={() => refetch()}
              className="text-xs font-semibold text-green-700 hover:text-green-800"
            >
              Refresh
            </button>
          </div>

          {categories.length === 0 ? (
            <div className="px-6 py-10 text-sm text-gray-500">No categories found.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {categories.map((category) => (
                <div key={category.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{formatCategoryName(category.category_name)}</p>
                    <p className="text-xs text-gray-500">ID: {category.id}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {category.created_at && (
                      <span className="text-xs text-gray-500">
                        Added {new Date(category.created_at).toLocaleDateString()}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => openConfigModal(category)}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      Update Configs
                    </button>
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
                <h2 className="text-base font-semibold text-gray-900">Add New Category</h2>
                <p className="text-xs text-gray-500">Create a complaint category for incident reporting.</p>
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
                <label className="text-xs font-medium text-gray-600">Category name</label>
                <input
                  name="category_name"
                  value={formData.category_name}
                  onChange={(e) => {
                    setFormData({ category_name: e.target.value });
                    setErrors((prev) => ({ ...prev, category_name: "" }));
                  }}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
                  placeholder="e.g. Noise Complaint"
                />
                {errors.category_name && (
                  <p className="mt-1 text-xs text-red-600">{errors.category_name}</p>
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
                  disabled={categoryMutation.isPending}
                  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 transition disabled:opacity-60"
                >
                  {categoryMutation.isPending ? "Creating..." : "Create category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isConfigModalOpen && selectedCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-gray-200 bg-white p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Update Category Configs</h2>
                <p className="text-xs text-gray-500">
                  Category: {formatCategoryName(selectedCategory.category_name)}
                </p>
              </div>
              <button
                type="button"
                onClick={closeConfigModal}
                className="text-sm font-semibold text-gray-500 hover:text-gray-700"
              >
                Close
              </button>
            </div>

            {configErrors.form && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
                {configErrors.form}
              </div>
            )}

            <form onSubmit={handleConfigSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-gray-600">Base severity weight</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min={0}
                    value={configForm.base_severity_weight}
                    onChange={(e) => handleConfigChange("base_severity_weight", e.target.value)}
                    className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none ${
                      configErrors.base_severity_weight
                        ? "border-red-300 focus:border-red-400"
                        : "border-gray-200 focus:border-green-500"
                    }`}
                    placeholder="e.g. 2.0"
                  />
                  <p className="mt-1 text-[11px] text-gray-500">Suggested range: 1.0 to 5.0</p>
                  {configErrors.base_severity_weight && (
                    <p className="mt-1 text-xs text-red-600">{configErrors.base_severity_weight}</p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600">Time window (hours)</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    min={0}
                    value={configForm.time_window_hours}
                    onChange={(e) => handleConfigChange("time_window_hours", e.target.value)}
                    className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none ${
                      configErrors.time_window_hours
                        ? "border-red-300 focus:border-red-400"
                        : "border-gray-200 focus:border-green-500"
                    }`}
                    placeholder="e.g. 24"
                  />
                  <p className="mt-1 text-[11px] text-gray-500">Default: 24 hours</p>
                  {configErrors.time_window_hours && (
                    <p className="mt-1 text-xs text-red-600">{configErrors.time_window_hours}</p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600">Category radius (km)</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    min={0}
                    value={configForm.category_radius_km}
                    onChange={(e) => handleConfigChange("category_radius_km", e.target.value)}
                    className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none ${
                      configErrors.category_radius_km
                        ? "border-red-300 focus:border-red-400"
                        : "border-gray-200 focus:border-green-500"
                    }`}
                    placeholder="e.g. 5"
                  />
                  <p className="mt-1 text-[11px] text-gray-500">Default: 5 km</p>
                  {configErrors.category_radius_km && (
                    <p className="mt-1 text-xs text-red-600">{configErrors.category_radius_km}</p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600">Similarity threshold</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min={0}
                    max={1}
                    value={configForm.similarity_threshold}
                    onChange={(e) => handleConfigChange("similarity_threshold", e.target.value)}
                    className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none ${
                      configErrors.similarity_threshold
                        ? "border-red-300 focus:border-red-400"
                        : "border-gray-200 focus:border-green-500"
                    }`}
                    placeholder="e.g. 0.65"
                  />
                  <p className="mt-1 text-[11px] text-gray-500">Range: 0 to 1</p>
                  {configErrors.similarity_threshold && (
                    <p className="mt-1 text-xs text-red-600">{configErrors.similarity_threshold}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeConfigModal}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={configMutation.isPending}
                  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 transition disabled:opacity-60"
                >
                  {configMutation.isPending ? "Saving..." : "Save configs"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminCategories;
