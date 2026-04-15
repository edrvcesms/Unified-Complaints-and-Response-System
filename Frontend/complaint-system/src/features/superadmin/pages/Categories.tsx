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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await categoryMutation.mutateAsync(formData as any);
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
                  {category.created_at && (
                    <span className="text-xs text-gray-500">
                      Added {new Date(category.created_at).toLocaleDateString()}
                    </span>
                  )}
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
    </div>
  );
};

export default SuperAdminCategories;
