import React, { useState } from "react";

interface ActionsTakenModalProps {
  isOpen: boolean;
  title: string;
  confirmText: string;
  confirmColor: "red" | "green" | "yellow" | "blue";
  onConfirm: (actionsTaken: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
  description?: string;
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
}) => {
  const [actionsTaken, setActionsTaken] = useState("");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-sm w-full p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            try {
               onConfirm(actionsTaken);
            } catch (err) {
              console.error("Submit failed:", err);
            }
          }}
        >
          {description && (
            <p className="text-sm text-gray-600 mb-3">{description}</p>
          )}
          <label className="block text-lg font-medium text-gray-700 mb-2">Actions Taken</label>
          <textarea
            className="w-full border text-sm border-gray-300 rounded-md p-2 mb-6 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
            rows={3}
            value={actionsTaken}
            onChange={e => setActionsTaken(e.target.value)}
            required
            disabled={isLoading}
            placeholder="Describe the actions taken to address this complaint…"
          />
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
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
