// ─── components/ui/StatusBadge.tsx ───────────────────────────────────────────

interface StatusBadgeProps {
  status: string; // "submitted" | "under_review" | "resolved"
}

// Maps backend status strings to Tailwind classes + display labels
const STATUS_MAP: Record<string, { label: string; classes: string; dot: string }> = {
  submitted:    { label: "Submitted",    classes: "bg-gray-100 text-gray-800 border-green-200", dot: "bg-gray-500" },
  under_review: { label: "Under Review", classes: "bg-blue-100   text-blue-800   border-blue-200",   dot: "bg-blue-500"   },
  resolved:     { label: "Resolved",     classes: "bg-green-100  text-green-800  border-green-200",  dot: "bg-green-500"  },
};

const FALLBACK = { label: "Unknown", classes: "bg-gray-100 text-gray-600 border-gray-200", dot: "bg-gray-400" };

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const config = STATUS_MAP[status] ?? FALLBACK;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full
      text-xs font-semibold border ${config.classes}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
};