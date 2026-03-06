import { useState, useRef } from "react";
import { useCreateAnnouncement } from "../../../hooks/useAnnouncement";
import { PageHeader } from "../../general";
import { SuccessModal } from "../../general/SuccessModal";
import { ErrorModal } from "../../general/ErrorModal";
import { Upload, X, FileImage, FileVideo } from "lucide-react";

interface FormData {
  title: string;
  content: string;
}

interface FormErrors {
  title?: string;
  content?: string;
  files?: string;
}

export const AnnouncementsPage: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    title: "",
    content: "",
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [successModal, setSuccessModal] = useState({ isOpen: false, title: "", message: "" });
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: "", message: "" });

  const createAnnouncementMutation = useCreateAnnouncement();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Validate file types
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

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    
    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    }
    
    if (!formData.content.trim()) {
      newErrors.content = "Content is required";
    }
    
    if (selectedFiles.length === 0) {
      newErrors.files = "Please upload at least one image or video";
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
    
    selectedFiles.forEach((file) => {
      formDataToSend.append("media_files", file);
    });

    try {
      await createAnnouncementMutation.mutateAsync(formDataToSend);
      setSuccessModal({
        isOpen: true,
        title: "Success!",
        message: "Announcement created successfully",
      });
      
      // Reset form
      setFormData({ title: "", content: "" });
      setSelectedFiles([]);
    } catch (error: any) {
      setErrorModal({
        isOpen: true,
        title: "Error",
        message: error?.response?.data?.detail || "Failed to create announcement",
      });
    }
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith("image/")) {
      return <FileImage className="w-5 h-5 text-green-600" />;
    }
    return <FileVideo className="w-5 h-5 text-purple-600" />;
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Create Announcement"
        description="Share important updates and information with the community"
      />

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
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
              Media Files <span className="text-red-500">*</span>
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-colors cursor-pointer"
            >
              <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-600 mb-1">
                Click to upload images or videos
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
                  Selected Files ({selectedFiles.length})
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
          <div className="flex justify-end pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={createAnnouncementMutation.isPending}
              className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {createAnnouncementMutation.isPending && (
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
              {createAnnouncementMutation.isPending ? "Creating..." : "Create Announcement"}
            </button>
          </div>
        </form>
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
