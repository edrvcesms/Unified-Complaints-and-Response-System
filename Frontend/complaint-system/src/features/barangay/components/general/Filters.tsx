import type{ StatusFilter, SeverityScoreFilter } from "../../../../types/complaints/complaint";
import { STATUS_FILTERS, SEVERITY_SCORE_FILTERS } from "../../../../types/complaints/complaint";

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

interface StatusFilterDropdownProps {
  current: StatusFilter;
  onChange: (status: StatusFilter) => void;
}

export const StatusFilterDropdown: React.FC<StatusFilterDropdownProps> = ({
  current,
  onChange,
}) => (
  <select
    value={current}
    onChange={(e) => onChange(e.target.value as StatusFilter)}
    className="px-3 py-2 text-sm border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white cursor-pointer"
  >
    {STATUS_FILTERS.map(({ label, value }) => (
      <option key={value} value={value}>
        {label}
      </option>
    ))}
  </select>
);

interface SeverityScoreFilterPillsProps {
  current: SeverityScoreFilter;
  onChange: (score: SeverityScoreFilter) => void;
}

export const SeverityScoreFilterPills: React.FC<SeverityScoreFilterPillsProps> = ({
  current,
  onChange,
}) => (
  <div className="flex gap-2 flex-wrap">
    {SEVERITY_SCORE_FILTERS.map(({ label, value }) => (
      <button
        key={value}
        onClick={() => onChange(value)}
        className={`px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${
          current === value
            ? "bg-purple-700 text-white shadow-sm"
            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
        }`}
      >
        {label}
      </button>
    ))}
  </div>
);

interface SeverityScoreFilterDropdownProps {
  current: SeverityScoreFilter;
  onChange: (score: SeverityScoreFilter) => void;
}

export const SeverityScoreFilterDropdown: React.FC<SeverityScoreFilterDropdownProps> = ({
  current,
  onChange,
}) => (
  <select
    value={current}
    onChange={(e) => onChange(e.target.value as SeverityScoreFilter)}
    className="px-3 py-2 text-sm border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white cursor-pointer"
  >
    {SEVERITY_SCORE_FILTERS.map(({ label, value }) => (
      <option key={value} value={value}>
        {label}
      </option>
    ))}
  </select>
);