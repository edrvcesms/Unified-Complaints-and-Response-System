import type{ StatusFilter } from "../../../../types/complaints/complaint";
import { STATUS_FILTERS } from "../../../../types/complaints/complaint";

interface StatusFilterPillsProps {
  current: StatusFilter;
  onChange: (status: StatusFilter) => void;
}

export const StatusFilterPills: React.FC<StatusFilterPillsProps> = ({
  current,
  onChange,
}) => (
  <div className="flex gap-2 flex-wrap ">
    {STATUS_FILTERS.map(({ label, value }) => (
      <button
        key={value}
        onClick={() => onChange(value)}
        className={`px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${
          current === value
            ? "bg-blue-700 text-white shadow-sm"
            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
        }`}
      >
        {label}
      </button>
    ))}
  </div>
);