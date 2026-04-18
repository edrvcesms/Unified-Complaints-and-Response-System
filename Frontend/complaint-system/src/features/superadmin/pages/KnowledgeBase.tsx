import React, { useCallback, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { knowledgeBaseApi } from "../../../services/axios/apiServices";

interface UploadResponse {
  message: string;
  chunks_indexed: number;
  chunk_titles: string[];
}

interface ApiError {
  response?: {
    data?: {
      detail?: string;
    };
    status?: number;
  };
  message?: string;
}

function getErrorMessage(err: unknown): string {
  const error = err as ApiError;
  return (
    error?.response?.data?.detail ||
    error?.message ||
    "An unexpected error occurred."
  );
}

const MAX_FILE_SIZE_MB = 20;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export default function KnowledgeBase() {
  const [file, setFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = (f: File): string | null => {
    if (!f.name.toLowerCase().endsWith(".pdf")) return "Only PDF files are accepted.";
    if (f.size === 0) return "The selected file is empty.";
    if (f.size > MAX_FILE_SIZE_BYTES) return `File exceeds the ${MAX_FILE_SIZE_MB} MB limit.`;
    return null;
  };

  const pickFile = (f: File) => {
    const err = validateFile(f);
    setValidationError(err);
    setFile(err ? null : f);
    mutation.reset();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) pickFile(f);
    e.target.value = "";
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) pickFile(f);
  }, []);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const mutation = useMutation<UploadResponse, unknown, File>({
    mutationFn: async (f: File) => {
      const formData = new FormData();
      formData.append("file", f);
      const data = await knowledgeBaseApi.post<UploadResponse>(
        "/upload-pdf",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      return data as UploadResponse;
    },
    onSuccess: () => {
      setFile(null);
    },
  });

  const handleSubmit = () => {
    if (!file) return;
    const err = validateFile(file);
    if (err) { setValidationError(err); return; }
    mutation.mutate(file);
  };

  const handleRemoveFile = () => {
    setFile(null);
    setValidationError(null);
    mutation.reset();
  };

  const isSuccess = mutation.isSuccess;
  const isError = mutation.isError;
  const isPending = mutation.isPending;

  return (
    <div className="space-y-6">
      {/* Page Header — matches admin pattern */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Knowledge Base</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Upload a PDF to extract, chunk, and index its contents into Pinecone.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* Card header */}
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Upload PDF</h2>
          <p className="text-xs text-gray-500">Max file size: {MAX_FILE_SIZE_MB} MB</p>
        </div>

        <div className="px-6 py-6 space-y-5">
          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => !file && inputRef.current?.click()}
            className={`relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 transition cursor-pointer
              ${isDragging ? "border-green-400 bg-green-50" : "border-gray-200 bg-gray-50 hover:bg-gray-100"}
              ${file ? "cursor-default" : ""}
            `}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={handleInputChange}
            />

            {/* Icon */}
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl transition ${isDragging ? "bg-green-100" : "bg-white border border-gray-200"}`}>
              <svg className={`h-6 w-6 ${isDragging ? "text-green-600" : "text-gray-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
            </div>

            {file ? (
              /* Selected file preview */
              <div className="flex flex-col items-center gap-1 text-center">
                <span className="text-sm font-medium text-gray-900 break-all max-w-xs">{file.name}</span>
                <span className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleRemoveFile(); }}
                  className="mt-1 inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700 font-medium"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                  Remove
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1 text-center">
                <p className="text-sm font-medium text-gray-700">
                  {isDragging ? "Drop your PDF here" : "Drag & drop your PDF here"}
                </p>
                <p className="text-xs text-gray-400">or <span className="text-green-600 font-medium underline underline-offset-2">browse to upload</span></p>
              </div>
            )}
          </div>

          {/* Validation error */}
          {validationError && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
              <svg className="h-4 w-4 text-red-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
              <p className="text-xs text-red-700 font-medium">{validationError}</p>
            </div>
          )}

          {/* API error */}
          {isError && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
              <svg className="h-4 w-4 text-red-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
              <p className="text-xs text-red-700 font-medium">{getErrorMessage(mutation.error)}</p>
            </div>
          )}

          {/* Success result */}
          {isSuccess && mutation.data && (
            <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-100">
                  <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-green-800">{mutation.data.message}</p>
              </div>

              {mutation.data.chunk_titles.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-green-700 mb-2">
                    Indexed sections ({mutation.data.chunks_indexed})
                  </p>
                  <ul className="space-y-1 max-h-48 overflow-y-auto pr-1">
                    {mutation.data.chunk_titles.map((title, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs text-green-800">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
                        {title}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Submit */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!file || isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-5 py-2 text-sm font-semibold text-white hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Uploading…
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                  </svg>
                  Upload & Index
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}