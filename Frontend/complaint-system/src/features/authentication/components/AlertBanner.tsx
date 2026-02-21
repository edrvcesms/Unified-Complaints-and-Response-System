// ─── UI: AlertBanner ──────────────────────────────────────────────────────────
// Full-width error banner shown at the top of the form for server/auth failures.

interface AlertBannerProps {
  message: string;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({ message }) => (
  <div
    role="alert"
    className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3"
  >
    <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M18 10A8 8 0 112 10a8 8 0 0116 0zm-7-4a1 1 0 10-2 0v4a1 1 0 102 0V6zm-1 8a1 1 0 100-2 1 1 0 000 2z"
        clipRule="evenodd"
      />
    </svg>
    <span>{message}</span>
  </div>
);