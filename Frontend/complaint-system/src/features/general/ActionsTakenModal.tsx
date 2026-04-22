import React, { useEffect, useRef, useState } from "react";

const MAX_UPLOAD_FILES = 3;

interface ActionsTakenModalProps {
  isOpen: boolean;
  title: string;
  confirmText: string;
  confirmColor: "red" | "green" | "yellow" | "blue";
  onConfirm: (actionsTaken: string, attachments: File[]) => void;
  onCancel: () => void;
  isLoading?: boolean;
  description?: string;
  externalError?: string;
}

const colorClasses = {
  red: "bg-red-600 hover:bg-red-700",
  green: "bg-green-600 hover:bg-green-700",
  yellow: "bg-yellow-600 hover:bg-yellow-700",
  blue: "bg-primary-600 hover:bg-primary-700",
};

export const ActionsTakenModal: React.FC<ActionsTakenModalProps> = ({
  isOpen,
  title,
  confirmText,
  confirmColor,
  onConfirm,
  onCancel,
  isLoading = false,
  description,
  externalError,
}) => {
  const [actionsTaken, setActionsTaken] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setActionsTaken("");
      setSelectedFiles([]);
      setFileError("");
    }
  }, [isOpen]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    setSelectedFiles((prev) => {
      const nextFiles = [...prev, ...files];
      if (nextFiles.length > MAX_UPLOAD_FILES) {
        setFileError(`You can only upload up to ${MAX_UPLOAD_FILES} files.`);
      } else {
        setFileError("");
      }
      return nextFiles.slice(0, MAX_UPLOAD_FILES);
    });
    event.target.value = "";
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, fileIndex) => fileIndex !== index));
    setFileError("");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-sm w-full p-6 max-h-[85vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            try {
               onConfirm(actionsTaken, selectedFiles);
            } catch (err) {
              console.error("Submit failed:", err);
            }
          }}
        >
          {description && (
            <p className="text-sm text-gray-600 mb-2">{description}</p>
          )}
          <label className="block text-lg font-medium text-gray-700 mb-2">Actions Taken</label>
          <textarea
            className="w-full border text-sm border-gray-300 rounded-md p-2 mb-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
            rows={3}
            value={actionsTaken}
            onChange={e => setActionsTaken(e.target.value)}
            required
            disabled={isLoading}
            placeholder="Describe the actions taken to address this complaint…"
          />
          <div className="mt-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Attachments (optional)
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed border-gray-300 rounded-md p-4 text-center transition-colors cursor-pointer ${
                isLoading ? "pointer-events-none opacity-70" : "hover:border-primary-400 hover:bg-primary-50/30"
              }`}
            >
              <p className="text-xs text-gray-600">Click to upload files</p>
              <p className="text-[11px] text-gray-500 mt-1">Images, videos, PDFs, or documents</p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFileSelect}
                className="hidden"
                disabled={isLoading}
              />
            </div>
            {selectedFiles.length > 0 && (
              <div className="mt-3 space-y-2">
                {selectedFiles.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-md px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-xs text-gray-700 truncate">{file.name}</p>
                      <p className="text-[11px] text-gray-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(index)}
                      className="text-xs text-gray-400 hover:text-red-600"
                      disabled={isLoading}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
            {fileError && <p className="mt-2 text-xs text-red-600">{fileError}</p>}
            
            {externalError && <p className="mt-2 text-xs text-red-600">{externalError}</p>}
          </div>
          <div className="flex items-center mt-4 justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className={`px-4 py-2 text-sm font-medium text-white rounded-md transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${colorClasses[confirmColor]}`}
            >
              {isLoading ? (
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
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              ) : null}
              {isLoading ? "Processing..." : confirmText}
            </button>
            
          </div>
        </form>
      </div>
    </div>
  );
};
