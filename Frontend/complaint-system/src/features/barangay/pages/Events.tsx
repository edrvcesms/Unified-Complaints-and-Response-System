import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { PageHeader } from "../../general";
import { SuccessModal } from "../../general/SuccessModal";
import { ErrorModal } from "../../general/ErrorModal";
import { useCreateEvent, useDeleteEvent, useEvents, useUpdateEvent } from "../../../hooks/useEvent";
import { validateDescription, validateTitle } from "../../../utils/validators";
import type { Event } from "../../../types/general/event";
import { Calendar, Edit, FileImage, FileVideo, MapPin, Plus, Trash2, Upload, X } from "lucide-react";

interface EventForm {
  event_name: string;
  description: string;
  date: string;
  location: string;
}

interface EventFormErrors {
  event_name?: string;
  description?: string;
  date?: string;
  location?: string;
  files?: string;
}

const defaultFormState: EventForm = {
  event_name: "",
  description: "",
  date: "",
  location: "",
};

const getVideoMimeType = (mediaType: string, mediaUrl: string) => {
  if (mediaType?.includes("/")) {
    return mediaType;
  }

  const loweredUrl = mediaUrl.toLowerCase();
  if (loweredUrl.endsWith(".webm")) {
    return "video/webm";
  }
  if (loweredUrl.endsWith(".mov")) {
    return "video/quicktime";
  }
  if (loweredUrl.endsWith(".mkv")) {
    return "video/x-matroska";
  }

  return "video/mp4";
};

const EventMediaPreview: React.FC<{ mediaUrl: string; mediaType: string; className?: string }> = ({ mediaUrl, mediaType, className = "" }) => {
  if (mediaType?.startsWith("video")) {
    return (
      <video className={`w-full h-full object-cover ${className}`} controls muted preload="metadata">
        <source src={mediaUrl} type={getVideoMimeType(mediaType, mediaUrl)} />
      </video>
    );
  }

  return <img src={mediaUrl} alt="Event media" className={`w-full h-full object-cover ${className}`} loading="lazy" />;
};

const getMediaList = (media: Event["media"] | undefined | null) => (Array.isArray(media) ? media : []);

export const EventsPage: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"create" | "manage">("create");
  const [formData, setFormData] = useState<EventForm>(defaultFormState);
  const [errors, setErrors] = useState<EventFormErrors>({});
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [existingMediaToKeep, setExistingMediaToKeep] = useState<number[]>([]);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [successModal, setSuccessModal] = useState({ isOpen: false, title: "", message: "" });
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: "", message: "" });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { events, isLoading, refetch } = useEvents();
  const createEventMutation = useCreateEvent();
  const updateEventMutation = useUpdateEvent();
  const deleteEventMutation = useDeleteEvent();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validTypes = ["image/jpeg", "image/png", "video/mp4"];
    const invalidFiles = files.filter((file) => !validTypes.includes(file.type));

    if (invalidFiles.length > 0) {
      setErrors((prev) => ({ ...prev, files: t("errors.invalidFileType") }));
      return;
    }

    setSelectedFiles((prev) => [...prev, ...files]);
    setErrors((prev) => ({ ...prev, files: undefined }));

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const validate = () => {
    const newErrors: EventFormErrors = {};

    const nameError = validateTitle(formData.event_name, t("events.form.name"));
    if (nameError) {
      newErrors.event_name = nameError;
    }

    const descriptionError = validateDescription(formData.description, t("events.form.description"), false);
    if (descriptionError) {
      newErrors.description = descriptionError;
    }

    if (!formData.date) {
      newErrors.date = t("events.error.dateRequired");
    }

    const locationError = validateDescription(formData.location, t("events.form.location"), false);
    if (locationError) {
      newErrors.location = locationError;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    setFormData(defaultFormState);
    setErrors({});
    setSelectedFiles([]);
    setExistingMediaToKeep([]);
    setEditingEvent(null);
  };

  const buildPayload = () => {
    const payload = new FormData();
    payload.append("event_data", JSON.stringify(formData));

    if (editingEvent) {
      payload.append("keep_media_ids", JSON.stringify(existingMediaToKeep));
    }

    selectedFiles.forEach((file) => payload.append("event_files", file));
    return payload;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    try {
      const payload = buildPayload();

      if (editingEvent) {
        await updateEventMutation.mutateAsync({ eventId: editingEvent.id, eventData: payload });
        setSuccessModal({
          isOpen: true,
          title: t("events.success.updated"),
          message: t("events.success.updatedMessage"),
        });
      } else {
        await createEventMutation.mutateAsync(payload);
        setSuccessModal({
          isOpen: true,
          title: t("events.success.created"),
          message: t("events.success.createdMessage"),
        });
      }

      resetForm();
    } catch (error: any) {
      setErrorModal({
        isOpen: true,
        title: t("events.error.title"),
        message: error?.response?.data?.detail || t(`events.error.${editingEvent ? "updateFailed" : "createFailed"}`),
      });
    }
  };

  const handleEdit = (event: Event) => {
    const eventMedia = getMediaList(event.media);

    setEditingEvent(event);
    setFormData({
      event_name: event.event_name,
      description: event.description || "",
      date: new Date(event.date).toISOString().slice(0, 16),
      location: event.location || "",
    });
    setSelectedFiles([]);
    setExistingMediaToKeep(eventMedia.map((media) => media.id));
    setActiveTab("create");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (eventId: number) => {
    try {
      await deleteEventMutation.mutateAsync(eventId);
      setSuccessModal({
        isOpen: true,
        title: t("events.success.deleted"),
        message: t("events.success.deletedMessage"),
      });
      setDeleteConfirm(null);
    } catch (error: any) {
      setErrorModal({
        isOpen: true,
        title: t("events.error.title"),
        message: error?.response?.data?.detail || t("events.error.deleteFailed"),
      });
    }
  };

  const formatDate = (value: Date) =>
    new Date(value).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const isMutating = createEventMutation.isPending || updateEventMutation.isPending;

  return (
    <div className="space-y-6">
      <PageHeader title={t("events.title")} description={t("events.description")} />

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab("create")}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === "create" ? "border-primary-600 text-primary-600" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <Plus className="w-4 h-4" />
            {editingEvent ? t("events.editTab") : t("events.createTab")}
          </button>
          <button
            onClick={() => {
              setActiveTab("manage");
              refetch();
            }}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === "manage" ? "border-primary-600 text-primary-600" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <Edit className="w-4 h-4" />
            {t("events.manageTab")}
            {!!events?.length && (
              <span className="px-2 py-0.5 text-xs font-semibold bg-primary-100 text-primary-600 rounded-full">{events.length}</span>
            )}
          </button>
        </div>

        {activeTab === "create" && (
          <div className="p-6">
            {editingEvent && (
              <div className="mb-4 p-3 bg-primary-50 border border-primary-200 rounded-lg flex items-center justify-between">
                <p className="text-sm text-primary-700">
                  {t("events.form.editing")} <span className="font-semibold">{editingEvent.event_name}</span>
                </p>
                <button onClick={resetForm} type="button" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                  {t("events.form.cancel")}
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="event_name" className="block text-sm font-medium text-gray-700 mb-1.5">
                  {t("events.form.name")} <span className="text-red-500">*</span>
                </label>
                <input
                  id="event_name"
                  name="event_name"
                  value={formData.event_name}
                  onChange={handleChange}
                  maxLength={200}
                  placeholder={t("events.form.namePlaceholder")}
                  className={`w-full px-4 py-2.5 rounded-lg border text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 transition ${
                    errors.event_name
                      ? "border-red-400 bg-red-50 focus:ring-red-300"
                      : "border-gray-300 bg-white focus:ring-primary-400 focus:border-primary-400"
                  }`}
                />
                {errors.event_name && <p className="mt-1 text-sm text-red-600">{errors.event_name}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1.5">
                    {t("events.form.date")} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    id="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    className={`w-full px-4 py-2.5 rounded-lg border text-sm text-gray-800 focus:outline-none focus:ring-2 transition ${
                      errors.date
                        ? "border-red-400 bg-red-50 focus:ring-red-300"
                        : "border-gray-300 bg-white focus:ring-blue-400 focus:border-blue-400"
                    }`}
                  />
                  {errors.date && <p className="mt-1 text-sm text-red-600">{errors.date}</p>}
                </div>
                <div>
                  <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1.5">
                    {t("events.form.location")}
                  </label>
                  <input
                    type="text"
                    id="location"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    maxLength={5000}
                    placeholder={t("events.form.locationPlaceholder")}
                    className={`w-full px-4 py-2.5 rounded-lg border text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 transition ${
                      errors.location
                        ? "border-red-400 bg-red-50 focus:ring-red-300"
                        : "border-gray-300 bg-white focus:ring-blue-400 focus:border-blue-400"
                    }`}
                  />
                  {errors.location && <p className="mt-1 text-sm text-red-600">{errors.location}</p>}
                </div>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1.5">
                  {t("events.form.description")}
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                  maxLength={5000}
                  placeholder={t("events.form.descriptionPlaceholder")}
                  className={`w-full px-4 py-2.5 rounded-lg border text-sm text-gray-800 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 transition ${
                    errors.description
                      ? "border-red-400 bg-red-50 focus:ring-red-300"
                      : "border-gray-300 bg-white focus:ring-blue-400 focus:border-blue-400"
                  }`}
                />
                {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("events.form.uploadMedia")}</label>

                {editingEvent && getMediaList(editingEvent.media).length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      {t("events.form.existingMedia")} ({existingMediaToKeep.length})
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {getMediaList(editingEvent.media)
                        .filter((media) => existingMediaToKeep.includes(media.id))
                        .map((media) => (
                          <div key={media.id} className="relative group">
                            <div className="aspect-square rounded-lg border border-gray-200 overflow-hidden bg-gray-100">
                              <EventMediaPreview mediaUrl={media.media_url} mediaType={media.media_type} />
                            </div>
                            <button
                              type="button"
                              onClick={() => setExistingMediaToKeep((prev) => prev.filter((id) => id !== media.id))}
                              className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-md"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-400 hover:bg-primary-50/30 transition-colors cursor-pointer"
                >
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">{t("events.form.uploadDescription")}</p>
                  <p className="text-xs text-gray-500 mt-1">JPG, PNG, MP4</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    multiple
                    accept="image/jpeg,image/png,video/mp4"
                    onChange={handleFileSelect}
                  />
                </div>
                {errors.files && <p className="mt-1 text-sm text-red-600">{errors.files}</p>}

                {selectedFiles.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {selectedFiles.map((file, index) => (
                      <div key={`${file.name}-${index}`} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-3">
                          <div className="flex items-center gap-2 min-w-0">
                            {file.type.startsWith("image") ? (
                              <FileImage className="w-4 h-4 text-green-600 shrink-0" />
                            ) : (
                              <FileVideo className="w-4 h-4 text-purple-600 shrink-0" />
                            )}
                            <span className="text-sm text-gray-700 truncate">{file.name}</span>
                          </div>
                        <button
                          type="button"
                          onClick={() => setSelectedFiles((prev) => prev.filter((_, i) => i !== index))}
                          className="text-gray-400 hover:text-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                {editingEvent && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-6 py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    {t("modal.cancel")}
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isMutating}
                  className="px-6 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingEvent
                    ? updateEventMutation.isPending
                      ? t("modal.processing")
                      : t("events.form.update")
                    : createEventMutation.isPending
                    ? t("modal.processing")
                    : t("events.form.submit")}
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === "manage" && (
          <div className="p-6">
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
              </div>
            ) : events && events.length > 0 ? (
              <div className="space-y-4">
                {events.map((event) => {
                  const eventMedia = getMediaList(event.media);

                  return (
                  <div key={event.id} className="border border-gray-200 rounded-lg p-5 hover:shadow-sm transition-shadow">
                    <h3 className="text-lg font-semibold text-gray-900">{event.event_name}</h3>
                    {event.description && <p className="text-sm text-gray-600 mt-2 line-clamp-3">{event.description}</p>}

                    <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4" />
                        {formatDate(event.date)}
                      </div>
                      {!!event.location && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-4 h-4" />
                          {event.location}
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <FileImage className="w-4 h-4" />
                        {eventMedia.length} {t("events.list.mediaCount")}
                      </div>
                    </div>

                    {eventMedia.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {eventMedia.slice(0, 4).map((media) => (
                          <div key={media.id} className="relative w-48 h-48 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                            <EventMediaPreview mediaUrl={media.media_url} mediaType={media.media_type} />
                          </div>
                        ))}
                        {eventMedia.length > 4 && (
                          <div className="w-48 h-48 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-600">+{eventMedia.length - 4}</span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-3 mt-3 border-t border-gray-200">
                      <button
                        onClick={() => handleEdit(event)}
                        className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                        {t("events.list.edit")}
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(event.id)}
                        className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        {t("events.list.delete")}
                      </button>
                    </div>

                    {deleteConfirm === event.id && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-700 mb-3">{t("events.list.deleteConfirm")}</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleDelete(event.id)}
                            disabled={deleteEventMutation.isPending}
                            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                          >
                            {deleteEventMutation.isPending ? t("modal.processing") : t("events.list.confirmDelete")}
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            {t("events.list.cancelDelete")}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )})}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-2">{t("events.list.noEvents")}</p>
                <p className="text-sm text-gray-400 mb-4">{t("events.list.noEventsMessage")}</p>
                <button
                  onClick={() => setActiveTab("create")}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  {t("events.createTab")}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

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
