import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, MapPinned } from "lucide-react";
import { PageHeader } from "../../general";
import { ErrorMessage } from "../../general/ErrorMessage";
import LoadingIndicator from "../../general/LoadingIndicator";
import { SuccessModal } from "../../general/SuccessModal";
import { ErrorModal } from "../../general/ErrorModal";
import { useSubmitForm } from "../../../hooks/useSubmitForm";
import { getAllBarangays } from "../../../services/barangay/barangays";
import { superAdminInstance } from "../../../services/axios/apiServices";
import type { BarangayAccountData } from "../../../types/barangay/barangayAccount";

interface EvacuationCenterFormData {
  center_name: string;
  barangay_id: string;
  latitude: string;
  longitude: string;
  address: string;
  contact_number: string;
}

interface EvacuationCenterPayload {
  center_name: string;
  barangay_id: number;
  latitude: number;
  longitude: number;
  address: string;
  contact_number?: string;
}

const DEFAULT_FORM: EvacuationCenterFormData = {
  center_name: "",
  barangay_id: "",
  latitude: "",
  longitude: "",
  address: "",
  contact_number: "",
};

const getAllBarangaysForSelect = async (): Promise<BarangayAccountData[]> => {
  const pageSize = 100;
  const firstPage = await getAllBarangays({ page: 1, page_size: pageSize });
  const pages = [ ...firstPage.data ];
  const totalPages = firstPage.pagination?.total_pages ?? 1;

  for (let page = 2; page <= totalPages; page += 1) {
    const response = await getAllBarangays({ page, page_size: pageSize });
    pages.push(...response.data);
  }

  return pages;
};

export const SuperAdminEvacuationCenters: React.FC = () => {
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isBarangayMenuOpen, setIsBarangayMenuOpen] = useState(false);
  const barangayMenuRef = useRef<HTMLDivElement>(null);
  const [successModal, setSuccessModal] = useState({ isOpen: false, title: "", message: "" });
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: "", message: "" });

  const { data: barangays = [], isLoading: isLoadingBarangays, error: barangayError } = useQuery({
    queryKey: ["superadmin", "evacuation-center-barangays"],
    queryFn: getAllBarangaysForSelect,
  });

  const createMutation = useSubmitForm<EvacuationCenterPayload>({
    endpoint: "/create",
    axiosInstance: superAdminInstance,
    validators: [
      (data: EvacuationCenterPayload) => {
        const nextErrors: Record<string, string> = {};
        if (!data.center_name.trim()) nextErrors.center_name = "Center name is required.";
        if (!data.barangay_id) nextErrors.barangay_id = "Please select a barangay.";
        if (!data.address.trim()) nextErrors.address = "Address is required.";
        if (Number.isNaN(data.latitude) || data.latitude < -90 || data.latitude > 90) {
          nextErrors.latitude = "Enter a latitude between -90 and 90.";
        }
        if (Number.isNaN(data.longitude) || data.longitude < -180 || data.longitude > 180) {
          nextErrors.longitude = "Enter a longitude between -180 and 180.";
        }
        return Object.keys(nextErrors).length > 0 ? nextErrors : null;
      },
    ],
    onSuccess: () => {
      setFormData(DEFAULT_FORM);
      setErrors({});
      setSuccessModal({ isOpen: true, title: "Center created", message: "The evacuation center has been saved." });
    },
    onError: (error) => {
      setErrors(error.errors || {});
      setErrorModal({ isOpen: true, title: "Unable to create center", message: error.general || "Please check the form and try again." });
    },
  });

  const updateField = (field: keyof EvacuationCenterFormData, value: string) => {
    setFormData((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, [field]: "" }));
  };

  useEffect(() => {
    const closeMenu = (event: MouseEvent) => {
      if (!barangayMenuRef.current?.contains(event.target as Node)) {
        setIsBarangayMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", closeMenu);
    return () => document.removeEventListener("mousedown", closeMenu);
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await createMutation.mutateAsync({
      ...formData,
      barangay_id: formData.barangay_id ? Number(formData.barangay_id) : 0,
      latitude: formData.latitude.trim() ? Number(formData.latitude) : Number.NaN,
      longitude: formData.longitude.trim() ? Number(formData.longitude) : Number.NaN,
      contact_number: formData.contact_number.trim() || undefined,
      center_name: formData.center_name.trim(),
      address: formData.address.trim(),
    });
  };

  const inputClass = (field: string) => `mt-1 block w-full rounded-lg border px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100 ${errors[field] ? "border-red-400" : "border-gray-300"}`;

  return (
    <div className="space-y-6">
      <PageHeader title="Evacuation Centers" description="Register safe locations and associate them with a barangay." />

      {isLoadingBarangays && <LoadingIndicator />}
      {barangayError && <ErrorMessage message="Failed to load barangays. Please refresh and try again." />}

      <form onSubmit={handleSubmit} className="w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-gray-100 bg-gradient-to-r from-green-50 via-white to-emerald-50 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-green-600 p-3 text-white shadow-sm"><MapPinned className="h-5 w-5" /></div>
            <div><h2 className="text-lg font-semibold text-gray-900">Add an evacuation center</h2><p className="text-sm text-gray-500">Enter the center details and map location.</p></div>
          </div>
          <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-200">New location</span>
        </div>

        <div className="grid gap-5 p-6 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-sm font-medium text-gray-700 lg:col-span-2">Center name<input value={formData.center_name} onChange={(event) => updateField("center_name", event.target.value)} className={inputClass("center_name")} placeholder="e.g. City Sports Complex" /></label>
          <div ref={barangayMenuRef} className="relative text-sm font-medium text-gray-700">
            <span>Barangay</span>
            <button
              type="button"
              aria-haspopup="listbox"
              aria-expanded={isBarangayMenuOpen}
              onClick={() => setIsBarangayMenuOpen((previous) => !previous)}
              disabled={isLoadingBarangays || barangays.length === 0}
              className={`${inputClass("barangay_id")} flex items-center justify-between text-left disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400`}
            >
              <span className={formData.barangay_id ? "text-gray-900" : "text-gray-400"}>
                {barangays.find((barangay) => String(barangay.id) === formData.barangay_id)?.barangay_name || "Select a barangay"}
              </span>
              <ChevronDown className={`h-4 w-4 text-gray-500 transition ${isBarangayMenuOpen ? "rotate-180" : ""}`} />
            </button>
            {isBarangayMenuOpen && (
              <div role="listbox" className="absolute left-0 right-0 z-30 mt-2 max-h-60 overflow-y-auto rounded-lg border border-gray-200 bg-white p-1 shadow-lg">
                {barangays.map((barangay) => (
                  <button
                    key={barangay.id}
                    type="button"
                    role="option"
                    aria-selected={String(barangay.id) === formData.barangay_id}
                    onClick={() => {
                      updateField("barangay_id", String(barangay.id));
                      setIsBarangayMenuOpen(false);
                    }}
                    className={`block w-full rounded-md px-3 py-2 text-left text-sm transition hover:bg-green-50 hover:text-green-800 ${String(barangay.id) === formData.barangay_id ? "bg-green-50 font-semibold text-green-800" : "text-gray-700"}`}
                  >
                    {barangay.barangay_name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <label className="text-sm font-medium text-gray-700">Latitude<input type="number" step="any" min="-90" max="90" value={formData.latitude} onChange={(event) => updateField("latitude", event.target.value)} className={inputClass("latitude")} placeholder="14.5995" /></label>
          <label className="text-sm font-medium text-gray-700">Longitude<input type="number" step="any" min="-180" max="180" value={formData.longitude} onChange={(event) => updateField("longitude", event.target.value)} className={inputClass("longitude")} placeholder="120.9842" /></label>
          <label className="text-sm font-medium text-gray-700">Contact number <span className="font-normal text-gray-400">(optional)</span><input value={formData.contact_number} onChange={(event) => updateField("contact_number", event.target.value)} className={inputClass("contact_number")} placeholder="09XXXXXXXXX" /></label>
          <label className="text-sm font-medium text-gray-700 lg:col-span-2">Address<textarea value={formData.address} onChange={(event) => updateField("address", event.target.value)} className={`${inputClass("address")} min-h-24 resize-y`} placeholder="Complete address" /></label>
        </div>

        <div className="flex flex-col gap-4 border-t border-gray-100 bg-gray-50/70 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          {Object.values(errors).some(Boolean) ? <p className="text-sm text-red-600">Please correct the highlighted fields.</p> : <p className="text-sm text-gray-500">Coordinates help residents find this center quickly.</p>}
          <button type="submit" disabled={createMutation.isPending || isLoadingBarangays || barangays.length === 0} className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50">{createMutation.isPending ? "Creating..." : "Create evacuation center"}</button>
        </div>
      </form>

      <SuccessModal isOpen={successModal.isOpen} title={successModal.title} message={successModal.message} onClose={() => setSuccessModal((previous) => ({ ...previous, isOpen: false }))} />
      <ErrorModal isOpen={errorModal.isOpen} title={errorModal.title} message={errorModal.message} onClose={() => setErrorModal((previous) => ({ ...previous, isOpen: false }))} />
    </div>
  );
};