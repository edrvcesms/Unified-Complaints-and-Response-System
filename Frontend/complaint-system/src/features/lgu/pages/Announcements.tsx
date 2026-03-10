import { useState, useRef } from "react";
import { 
  useMyAnnouncements, 
  useCreateAnnouncement, 
  useUpdateAnnouncement, 
  useDeleteAnnouncement 
} from "../../../hooks/useAnnouncement";
import { PageHeader } from "../../general";
import { SuccessModal } from "../../general/SuccessModal";
import { ErrorModal } from "../../general/ErrorModal";
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
  ImageOff
} from "lucide-react";
import { validateTitle, validateDescription } from "../../../utils/validators";
import type { Announcement } from "../../../types/general/announcement";

// Media Thumbnail Component with loading and error states
const MediaThumbnail: React.FC<{ url: string; type: string }> = ({ url, type }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  if (type.startsWith('video')) {
    return (
      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
        <Video className="w-8 h-8 text-gray-400" />
      </div>
    );
  }

  return (
    <>
      {loading && !error && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <div className="animate-pulse flex flex-col items-center gap-1">
            <ImageIcon className="w-6 h-6 text-gray-300" />
            <span className="text-xs text-gray-400">Loading...</span>
          </div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <div className="flex flex-col items-center gap-1">
            <ImageOff className="w-6 h-6 text-gray-400" />
            <span className="text-xs text-gray-400">Failed</span>
          </div>
        </div>
      )}
      <img 
        src={url} 
        alt="Media" 
        className={`w-full h-full object-cover transition-opacity duration-200 ${
          loading ? 'opacity-0' : 'opacity-100'
        }`}
        onLoad={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setError(true);
        }}
      />
    </>
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

export const LguAnnouncements: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"create" | "manage">("create");
  const [formData, setFormData] = useState<FormData>({
    title: "",
    content: "",
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [existingMediaToKeep, setExistingMediaToKeep] = useState<number[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [successModal, setSuccessModal] = useState({ isOpen: false, title: "", message: "" });
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: "", message: "" });
  
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const { announcements, isLoading, refetch } = useMyAnnouncements();
  const createAnnouncementMutation = useCreateAnnouncement();
  const updateAnnouncementMutation = useUpdateAnnouncement();
  const deleteAnnouncementMutation = useDeleteAnnouncement();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    const validTypes = ["image/jpeg", "image/png", "video/mp4", "video/mpeg", "video/quicktime"];
    const invalidFiles = files.filter((file) => !validTypes.includes(file.type));
    
    if (invalidFiles.length > 0) {
      setErrors((prev) => ({ 
        ...prev, 
        files: "Only JPG, PNG images and MP4, MPEG, MOV videos are allowed" 
      }));
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
    
    // For editing: send IDs of existing media to keep
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
          title: "Success!",
          message: "Announcement updated successfully",
        });
        setEditingAnnouncement(null);
      } else {
        await createAnnouncementMutation.mutateAsync(formDataToSend);
        setSuccessModal({
          isOpen: true,
          title: "Success!",
          message: "Announcement created successfully",
        });
      }
      
      // Reset form
      setFormData({ title: "", content: "" });
      setSelectedFiles([]);
      setExistingMediaToKeep([]);
    } catch (error: any) {
      setErrorModal({
        isOpen: true,
        title: "Error",
        message: error?.response?.data?.detail || `Failed to ${editingAnnouncement ? 'update' : 'create'} announcement`,
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
    // Initialize with all existing media IDs
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
        title: "Success!",
        message: "Announcement deleted successfully",
      });
      setDeleteConfirm(null);
    } catch (error: any) {
      setErrorModal({
        isOpen: true,
        title: "Error",
        message: error?.response?.data?.detail || "Failed to delete announcement",
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
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Announcements"
        description="Create and manage announcements for the community"
      />

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab("create")}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === "create"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <Plus className="w-4 h-4" />
            {editingAnnouncement ? "Edit Announcement" : "Create Announcement"}
          </button>
          <button
            onClick={() => {
              setActiveTab("manage");
              refetch();
            }}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === "manage"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <Edit className="w-4 h-4" />
            My Announcements
            {announcements && announcements.length > 0 && (
              <span className="px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-600 rounded-full">
                {announcements.length}
              </span>
            )}
          </button>
        </div>

        {/* Create/Edit Tab */}
        {activeTab === "create" && (
          <div className="p-6">
            {editingAnnouncement && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                <p className="text-sm text-blue-700">
                  Editing: <span className="font-semibold">{editingAnnouncement.title}</span>
                </p>
                <button
                  onClick={handleCancelEdit}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Cancel Edit
                </button>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title */}
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Enter announcement title"
                  maxLength={200}
                  className={`w-full px-4 py-2.5 rounded-lg border text-sm text-gray-800 placeholder-gray-400
                    focus:outline-none focus:ring-2 transition
                    ${errors.title
                      ? "border-red-400 bg-red-50 focus:ring-red-300"
                      : "border-gray-300 bg-white focus:ring-blue-400 focus:border-blue-400"
                    }`}
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-red-600">{errors.title}</p>
                )}
              </div>

              {/* Content */}
              <div>
                <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Content <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="content"
                  name="content"
                  value={formData.content}
                  onChange={handleChange}
                  placeholder="Enter announcement content"
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
                  Media Files (Optional)
                </label>
                
                {/* Existing Media - Show when editing */}
                {editingAnnouncement && editingAnnouncement.media.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Current Media ({existingMediaToKeep.length})
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {editingAnnouncement.media
                        .filter((media) => existingMediaToKeep.includes(media.id))
                        .map((media) => (
                          <div key={media.id} className="relative group">
                            <div className="aspect-square rounded-lg border border-gray-200 overflow-hidden bg-gray-100">
                              <MediaThumbnail url={media.media_url} type={media.media_type} />
                            </div>
                            <button
                              type="button"
                              onClick={() => removeExistingMedia(media.id)}
                              className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-md"
                              title="Remove media"
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
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-colors cursor-pointer"
                >
                  <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-600 mb-1">
                    {editingAnnouncement ? "Click to add more images or videos" : "Click to upload images or videos"}
                  </p>
                  <p className="text-xs text-gray-500">
                    Supported: JPG, PNG, MP4, MPEG, MOV
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
                      {editingAnnouncement ? "New Files to Add" : "Selected Files"} ({selectedFiles.length})
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
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={createAnnouncementMutation.isPending || updateAnnouncementMutation.isPending}
                  className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
                    ? (updateAnnouncementMutation.isPending ? "Updating..." : "Update Announcement")
                    : (createAnnouncementMutation.isPending ? "Creating..." : "Create Announcement")
                  }
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Manage Tab */}
        {activeTab === "manage" && (
          <div className="p-6">
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
              </div>
            ) : announcements && announcements.length > 0 ? (
              <div className="space-y-4">
                {announcements.map((announcement) => (
                  <div
                    key={announcement.id}
                    className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {announcement.title}
                        </h3>
                        <p className="text-sm text-gray-600 mb-3 line-clamp-3">
                          {announcement.content}
                        </p>
                        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4" />
                            {formatDate(announcement.created_at)}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <User className="w-4 h-4" />
                            {announcement.uploader.first_name} {announcement.uploader.last_name}
                          </div>
                          {announcement.media.length > 0 && (
                            <div className="flex items-center gap-1.5">
                              {announcement.media.some(m => m.media_type.startsWith('image')) && (
                                <ImageIcon className="w-4 h-4" />
                              )}
                              {announcement.media.some(m => m.media_type.startsWith('video')) && (
                                <Video className="w-4 h-4" />
                              )}
                              <span>{announcement.media.length} media file(s)</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Media Preview */}
                        {announcement.media.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {announcement.media.slice(0, 3).map((media) => (
                              <div key={media.id} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                                <MediaThumbnail url={media.media_url} type={media.media_type} />
                              </div>
                            ))}
                            {announcement.media.length > 3 && (
                              <div className="w-20 h-20 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center">
                                <span className="text-sm font-medium text-gray-600">
                                  +{announcement.media.length - 3}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-3 border-t border-gray-200">
                      <button
                        onClick={() => handleEdit(announcement)}
                        className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(announcement.id)}
                        className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>

                    {/* Delete Confirmation */}
                    {deleteConfirm === announcement.id && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-700 mb-3">
                          Are you sure you want to delete this announcement? This action cannot be undone.
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleDelete(announcement.id)}
                            disabled={deleteAnnouncementMutation.isPending}
                            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                          >
                            {deleteAnnouncementMutation.isPending ? "Deleting..." : "Yes, Delete"}
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                  <Edit className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 mb-2">No announcements yet</p>
                <p className="text-sm text-gray-400 mb-4">
                  Create your first announcement to share with the community
                </p>
                <button
                  onClick={() => setActiveTab("create")}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Create Announcement
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
