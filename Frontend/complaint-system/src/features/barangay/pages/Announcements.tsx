import { useState, useRef } from "react";
import { useTranslation } from 'react-i18next';
import { 
  useMyAnnouncements, 
  useCreateAnnouncement, 
  useUpdateAnnouncement, 
  useDeleteAnnouncement 
} from "../../../hooks/useAnnouncement";
import { PageHeader } from "../../general";
import { SuccessModal } from "../../general/SuccessModal";
import { ErrorModal } from "../../general/ErrorModal";
import LoadingIndicator from "../../general/LoadingIndicator";
import { 
  Upload, 
  X, 
  FileImage, 
  FileVideo, 
  Plus, 
  Edit, 
  Trash2, 
  Calendar,
  User,
  Image as ImageIcon,
  Video,
  ImageOff,
  ChevronLeft,
  ChevronRight,
  Play
} from "lucide-react";
import { validateTitle, validateDescription } from "../../../utils/validators";
import type { Announcement } from "../../../types/general/announcement";
import type { PaginationQueryParams } from "../../../types/general/pagination";

const MAX_UPLOAD_FILES = 3;

const getVideoMimeType = (mediaType: string, mediaUrl: string) => {
  if (mediaType.includes("/")) {
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

// Small square thumbnail used in the compact list view.
// Videos show a static frame + play icon overlay instead of a live <video> tag,
// since a playing/controls video at 56px is unusable and wastes space.
const MediaThumbnail: React.FC<{ url: string; type: string; onClick?: () => void }> = ({ url, type, onClick }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const { t } = useTranslation();
  const isVideo = type.startsWith('video');

  return (
    <button
      type="button"
      onClick={onClick}
      className="relative w-14 h-14 rounded-md overflow-hidden border border-gray-200 bg-gray-100 shrink-0 focus:outline-none focus:ring-2 focus:ring-primary-400"
      title={isVideo ? t('common.video', 'Video') : t('common.image', 'Image')}
    >
      {loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-pulse">
            <ImageIcon className="w-4 h-4 text-gray-300" />
          </div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <ImageOff className="w-4 h-4 text-gray-400" />
        </div>
      )}
      {isVideo ? (
        <video
          className={`w-full h-full object-cover transition-opacity duration-200 ${loading ? 'opacity-0' : 'opacity-100'}`}
          preload="metadata"
          muted
          onLoadedData={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setError(true);
          }}
        >
          <source src={`${url}#t=0.1`} type={getVideoMimeType(type, url)} />
        </video>
      ) : (
        <img 
          src={url} 
          alt="Media" 
          className={`w-full h-full object-cover transition-opacity duration-200 ${loading ? 'opacity-0' : 'opacity-100'}`}
          onLoad={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setError(true);
          }}
        />
      )}
      {isVideo && !loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <Play className="w-5 h-5 text-white fill-white" />
        </div>
      )}
    </button>
  );
};

// Full-size viewer shown on top of everything when a thumbnail is clicked.
// This is where the "real" viewing happens, so the list itself can stay compact.
const MediaLightbox: React.FC<{
  media: { url: string; type: string }[];
  index: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}> = ({ media, index, onClose, onNavigate }) => {
  const current = media[index];
  if (!current) return null;
  const isVideo = current.type.startsWith('video');

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-white/80 hover:text-white transition-colors"
        aria-label="Close"
      >
        <X className="w-6 h-6" />
      </button>

      {media.length > 1 && index > 0 && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onNavigate(index - 1); }}
          className="absolute left-4 p-2 text-white/80 hover:text-white transition-colors"
          aria-label="Previous"
        >
          <ChevronLeft className="w-8 h-8" />
        </button>
      )}

      <div
        className="max-w-3xl max-h-[85vh] w-full flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {isVideo ? (
          <video src={current.url} controls autoPlay className="max-w-full max-h-[85vh] rounded-lg" />
        ) : (
          <img src={current.url} alt="Media" className="max-w-full max-h-[85vh] rounded-lg object-contain" />
        )}
      </div>

      {media.length > 1 && index < media.length - 1 && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onNavigate(index + 1); }}
          className="absolute right-4 p-2 text-white/80 hover:text-white transition-colors"
          aria-label="Next"
        >
          <ChevronRight className="w-8 h-8" />
        </button>
      )}

      {media.length > 1 && (
        <div className="absolute bottom-4 text-sm text-white/70">
          {index + 1} / {media.length}
        </div>
      )}
    </div>
  );
};

interface FormData {
  title: string;
  content: string;
}

interface FormErrors {
  title?: string;
  content?: string;
  files?: string;
}

interface QueryMeta {
  page: number;
  page_size: number;
}

export const AnnouncementsPage: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"create" | "manage">("manage");
  const [formData, setFormData] = useState<FormData>({
    title: "",
    content: "",
  });
  const [meta, setMeta] = useState<QueryMeta>({ page: 1, page_size: 10 });
  const [errors, setErrors] = useState<FormErrors>({});
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [existingMediaToKeep, setExistingMediaToKeep] = useState<number[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [successModal, setSuccessModal] = useState({ isOpen: false, title: "", message: "" });
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: "", message: "" });
  
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // Lightbox state: which announcement's media is open, and at what index.
  const [lightbox, setLightbox] = useState<{ announcementId: number; index: number } | null>(null);

  const { announcements, isLoading, refetch, pagination } = useMyAnnouncements({
    page: meta.page,
    page_size: meta.page_size,
  });
  const createAnnouncementMutation = useCreateAnnouncement();
  const updateAnnouncementMutation = useUpdateAnnouncement();
  const deleteAnnouncementMutation = useDeleteAnnouncement();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handlePageChange = (newPage: number) => {
    setMeta((prev) => ({ ...prev, page: newPage }));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    const validTypes = ["image/jpeg", "image/png", "video/mp4", "video/mpeg", "video/quicktime"];
    const invalidFiles = files.filter((file) => !validTypes.includes(file.type));
    
    if (invalidFiles.length > 0) {
      setErrors((prev) => ({ 
        ...prev, 
        files: t('errors.invalidFileType')
      }));
      return;
    }

    if (selectedFiles.length + files.length > MAX_UPLOAD_FILES) {
      setErrors((prev) => ({
        ...prev,
        files: `You can only upload up to ${MAX_UPLOAD_FILES} files.`
      }));
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }
    
    setSelectedFiles((prev) => [...prev, ...files]);
    setErrors((prev) => ({ ...prev, files: undefined }));
    
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const removeExistingMedia = (mediaId: number) => {
    setExistingMediaToKeep((prev) => prev.filter((id) => id !== mediaId));
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    
    const titleError = validateTitle(formData.title, "Title");
    if (titleError) {
      newErrors.title = titleError;
    }
    
    const contentError = validateDescription(formData.content, "Content", true);
    if (contentError) {
      newErrors.content = contentError;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }

    const formDataToSend = new FormData();
    formDataToSend.append("announcement_data", JSON.stringify({
      title: formData.title,
      content: formData.content,
    }));
    
    if (editingAnnouncement) {
      formDataToSend.append("keep_media_ids", JSON.stringify(existingMediaToKeep));
    }
    
    selectedFiles.forEach((file) => {
      formDataToSend.append("media_files", file);
    });

    try {
      if (editingAnnouncement) {
        await updateAnnouncementMutation.mutateAsync({
          announcementId: editingAnnouncement.id,
          formData: formDataToSend
        });
        setSuccessModal({
          isOpen: true,
          title: t('announcements.success.updated'),
          message: t('announcements.success.updatedMessage'),
        });
        setEditingAnnouncement(null);
      } else {
        await createAnnouncementMutation.mutateAsync(formDataToSend);
        setSuccessModal({
          isOpen: true,
          title: t('announcements.success.created'),
          message: t('announcements.success.createdMessage'),
        });
      }
      
      setFormData({ title: "", content: "" });
      setSelectedFiles([]);
      setExistingMediaToKeep([]);
    } catch (error: any) {
      setErrorModal({
        isOpen: true,
        title: t('announcements.error.title'),
        message: error?.response?.data?.detail || t(`announcements.error.${editingAnnouncement ? 'update' : 'create'}Failed`),
      });
    }
  };

  const handleEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      content: announcement.content,
    });
    setSelectedFiles([]);
    setExistingMediaToKeep(announcement.media.map((m) => m.id));
    setActiveTab("create");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setEditingAnnouncement(null);
    setFormData({ title: "", content: "" });
    setSelectedFiles([]);
    setExistingMediaToKeep([]);
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteAnnouncementMutation.mutateAsync(id);
      setSuccessModal({
        isOpen: true,
        title: t('announcements.success.deleted'),
        message: t('announcements.success.deletedMessage'),
      });
      setDeleteConfirm(null);

      if (announcements.length === 1 && pagination?.has_previous) {
        setMeta((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }));
      } else {
        refetch();
      }
    } catch (error: any) {
      setErrorModal({
        isOpen: true,
        title: t('announcements.error.title'),
        message: error?.response?.data?.detail || t('announcements.error.deleteFailed'),
      });
    }
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith("image/")) {
      return <FileImage className="w-5 h-5 text-green-600" />;
    }
    return <FileVideo className="w-5 h-5 text-purple-600" />;
  };

  const formatDate = (dateString: Date) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // The announcement whose media is currently open in the lightbox, if any.
  const lightboxAnnouncement = lightbox
    ? announcements?.find((a) => a.id === lightbox.announcementId)
    : undefined;

  return (
    <div className="space-y-6">
      <PageHeader 
        title={t('announcements.title')}
        description={t('announcements.description')}
      />

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => {
              setActiveTab("manage");
              refetch();
            }}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === "manage"
                ? "border-primary-600 text-primary-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <Edit className="w-4 h-4" />
            {t('announcements.manageTab')}
            {typeof pagination?.total_items === "number" && pagination.total_items > 0 && (
              <span className="px-2 py-0.5 text-xs font-semibold bg-primary-100 text-primary-600 rounded-full">
                {pagination.total_items}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("create")}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === "create"
                ? "border-primary-600 text-primary-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <Plus className="w-4 h-4" />
            {editingAnnouncement ? t('announcements.editTab') : t('announcements.createTab')}
          </button>
        </div>


        {/* Manage Tab - Show announcements list */}
        {activeTab === "manage" && (
          <div className="p-6">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <LoadingIndicator />
              </div>
            ) : announcements && announcements.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-start">
                  {announcements.map((announcement) => (
                    <div
                      key={announcement.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-lg font-semibold text-gray-900 truncate">
                              {announcement.title}
                            </h3>
                            {/* Compact inline actions instead of a separate footer row */}
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => handleEdit(announcement)}
                                className="p-1.5 text-primary-600 hover:bg-primary-50 rounded-md transition-colors"
                                aria-label={t('announcements.list.edit')}
                                title={t('announcements.list.edit')}
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(announcement.id)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                aria-label={t('announcements.list.delete')}
                                title={t('announcements.list.delete')}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {announcement.content}
                          </p>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mt-2">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {formatDate(announcement.created_at)}
                            </div>
                            <div className="flex items-center gap-1">
                              <User className="w-3.5 h-3.5" />
                              {announcement.uploader.first_name} {announcement.uploader.last_name}
                            </div>
                          </div>

                          {/* Single compact trigger instead of an inline thumbnail strip — keeps the card narrow */}
                          {announcement.media.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setLightbox({ announcementId: announcement.id, index: 0 })}
                              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100 transition-colors"
                            >
                              {announcement.media.some((m) => m.media_type.startsWith('video')) ? (
                                <Video className="w-3.5 h-3.5" />
                              ) : (
                                <ImageIcon className="w-3.5 h-3.5" />
                              )}
                              {announcement.media.length === 1
                                ? t('announcements.list.viewMedia', 'View media')
                                : t('announcements.list.viewMediaCount', `View media (${announcement.media.length})`)}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Delete Confirmation */}
                      {deleteConfirm === announcement.id && (
                        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg max-w-md">
                          <p className="text-sm text-red-700 mb-3">
                            {t('announcements.list.deleteConfirm')}
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleDelete(announcement.id)}
                              disabled={deleteAnnouncementMutation.isPending}
                              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                            >
                              {deleteAnnouncementMutation.isPending ? t('modal.processing') : t('announcements.list.confirmDelete')}
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              {t('announcements.list.cancelDelete')}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Pagination Controls */}
                {pagination && pagination.total_pages > 1 && (
                  <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-500">
                      {t('pagination.pageOf', {
                        defaultValue: `Page ${pagination.page} of ${pagination.total_pages}`,
                        page: pagination.page,
                        totalPages: pagination.total_pages,
                      })}
                      {typeof pagination.total_items === "number" && (
                        <span> &middot; {pagination.total_items} total</span>
                      )}
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handlePageChange(meta.page - 1)}
                        disabled={!pagination.has_previous}
                        className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        {t('pagination.previous', 'Previous')}
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePageChange(meta.page + 1)}
                        disabled={!pagination.has_next}
                        className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {t('pagination.next', 'Next')}
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                  <Edit className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 mb-2">{t('announcements.list.noAnnouncements')}</p>
                <p className="text-sm text-gray-400 mb-4">
                  {t('announcements.list.noAnnouncementsMessage')}
                </p>
                <button
                  onClick={() => setActiveTab("create")}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  {t('announcements.createTab')}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Create/Edit Tab */}
        {activeTab === "create" && (
          <div className="p-6">
            {editingAnnouncement && (
              <div className="mb-4 p-3 bg-primary-50 border border-primary-200 rounded-lg flex items-center justify-between">
                <p className="text-sm text-primary-700">
                  Editing: <span className="font-semibold">{editingAnnouncement.title}</span>
                </p>
                <button
                  onClick={handleCancelEdit}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  {t('announcements.form.cancel')}
                </button>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title */}
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1.5">
                  {t('announcements.form.title')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder={t('announcements.form.titlePlaceholder')}
                  maxLength={200}
                  className={`w-full px-4 py-2.5 rounded-lg border text-sm text-gray-800 placeholder-gray-400
                    focus:outline-none focus:ring-2 transition
                    ${errors.title
                      ? "border-red-400 bg-red-50 focus:ring-red-300"
                      : "border-gray-300 bg-white focus:ring-primary-400 focus:border-primary-400"
                    }`}
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-red-600">{errors.title}</p>
                )}
              </div>

              {/* Content */}
              <div>
                <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1.5">
                  {t('announcements.form.content')} <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="content"
                  name="content"
                  value={formData.content}
                  onChange={handleChange}
                  placeholder={t('announcements.form.contentPlaceholder')}
                  rows={6}
                  maxLength={5000}
                  className={`w-full px-4 py-2.5 rounded-lg border text-sm text-gray-800 placeholder-gray-400
                    focus:outline-none focus:ring-2 transition resize-none
                    ${errors.content
                      ? "border-red-400 bg-red-50 focus:ring-red-300"
                      : "border-gray-300 bg-white focus:ring-blue-400 focus:border-blue-400"
                    }`}
                />
                {errors.content && (
                  <p className="mt-1 text-sm text-red-600">{errors.content}</p>
                )}
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {t('announcements.form.uploadMedia')}
                </label>
                
                {/* Existing Media - Show when editing (compact thumbnails, same lightbox pattern) */}
                {editingAnnouncement && editingAnnouncement.media.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      {t('announcements.form.existingMedia')} ({existingMediaToKeep.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {editingAnnouncement.media
                        .filter((media) => existingMediaToKeep.includes(media.id))
                        .map((media) => (
                          <div key={media.id} className="relative group">
                            <MediaThumbnail
                              url={media.media_url}
                              type={media.media_type}
                              onClick={() =>
                                setLightbox({ announcementId: editingAnnouncement.id, index: 0 })
                              }
                            />
                            <button
                              type="button"
                              onClick={() => removeExistingMedia(media.id)}
                              className="absolute -top-1.5 -right-1.5 p-0.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-md"
                              title="Remove media"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
                
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary-400 hover:bg-primary-50/30 transition-colors cursor-pointer"
                >
                  <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-600 mb-1">
                    {t('announcements.form.uploadDescription')}
                  </p>
                  <p className="text-xs text-gray-500">
                    Supported: JPG, PNG, MP4, MPEG, MOV
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Max {MAX_UPLOAD_FILES} files
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,video/mp4,video/mpeg,video/quicktime"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
                {errors.files && (
                  <p className="mt-1 text-sm text-red-600">{errors.files}</p>
                )}

                {/* Selected Files */}
                {selectedFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-medium text-gray-700">
                      {t('announcements.form.selectedFiles')} ({selectedFiles.length})
                    </p>
                    <div className="space-y-2">
                      {selectedFiles.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-3"
                        >
                          <div className="flex items-center gap-3">
                            {getFileIcon(file)}
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {file.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {(file.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="shrink-0 p-1 text-gray-400 hover:text-red-600 transition-colors"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                {editingAnnouncement && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-6 py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    {t('modal.cancel')}
                  </button>
                )}
                <button
                  type="submit"
                  disabled={createAnnouncementMutation.isPending || updateAnnouncementMutation.isPending}
                  className="px-6 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {(createAnnouncementMutation.isPending || updateAnnouncementMutation.isPending) && (
                    <svg
                      className="animate-spin h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  )}
                  {editingAnnouncement 
                    ? (updateAnnouncementMutation.isPending ? t('modal.processing') : t('announcements.form.update'))
                    : (createAnnouncementMutation.isPending ? t('modal.processing') : t('announcements.form.submit'))
                  }
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Full-size media viewer, triggered by clicking any thumbnail above */}
      {lightbox && lightboxAnnouncement && (
        <MediaLightbox
          media={lightboxAnnouncement.media.map((m) => ({ url: m.media_url, type: m.media_type }))}
          index={lightbox.index}
          onClose={() => setLightbox(null)}
          onNavigate={(index) => setLightbox({ announcementId: lightbox.announcementId, index })}
        />
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