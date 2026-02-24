import type{ StatusFilter, SeverityScoreFilter } from "../../../types/complaints/complaint";
import { STATUS_FILTERS, SEVERITY_SCORE_FILTERS } from "../../../types/complaints/complaint";
import type { SortOption } from "../../../hooks/useFilter";

const SORT_OPTIONS: { label: string; value: SortOption }[] = [
  { label: "Default", value: "none" },
  { label: "Severity Score: High to Low", value: "severity_score_desc" },
  { label: "Severity Score: Low to High", value: "severity_score_asc" },
  { label: "Severity Level: High to Low", value: "severity_level_desc" },
  { label: "Severity Level: Low to High", value: "severity_level_asc" },
];

interface StatusFilterPillsProps {
  current: StatusFilter;
  onChange: (status: StatusFilter) => void;
}

export const StatusFilterPills: React.FC<StatusFilterPillsProps> = ({
  current,
  onChange,
}) => (
  <div className="flex gap-2 flex-wrap">
    {STATUS_FILTERS.map(({ label, value }) => (
      <button
        key={value}
        onClick={() => onChange(value)}
        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
          current === value
            ? "bg-blue-600 text-white"
            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
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
    className="px-4 py-2.5 text-sm border border-gray-300 rounded-lg shadow-sm 
      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
      bg-white hover:border-gray-400 transition-colors cursor-pointer
      appearance-none bg-no-repeat bg-right pr-10
      font-medium text-gray-700"
    style={{
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236B7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
      backgroundPosition: 'right 0.5rem center',
      backgroundSize: '1.5em 1.5em',
    }}
  >
    {STATUS_FILTERS.map(({ label, value }) => (
      <option key={value} value={value} className="py-2">
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
        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
          current === value
            ? "bg-purple-600 text-white"
            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
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
    className="px-4 py-2.5 text-sm border border-gray-300 rounded-lg shadow-sm 
      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
      bg-white hover:border-gray-400 transition-colors cursor-pointer
      appearance-none bg-no-repeat bg-right pr-10
      font-medium text-gray-700"
    style={{
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236B7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
      backgroundPosition: 'right 0.5rem center',
      backgroundSize: '1.5em 1.5em',
    }}
  >
    {SEVERITY_SCORE_FILTERS.map(({ label, value }) => (
      <option key={value} value={value} className="py-2">
        {label}
      </option>
    ))}
  </select>
);

interface SortDropdownProps {
  current: SortOption;
  onChange: (sort: SortOption) => void;
}

export const SortDropdown: React.FC<SortDropdownProps> = ({
  current,
  onChange,
}) => (
  <select
    value={current}
    onChange={(e) => onChange(e.target.value as SortOption)}
    className="px-4 py-2.5 text-sm border border-gray-300 rounded-lg shadow-sm 
      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
      bg-white hover:border-gray-400 transition-colors cursor-pointer
      appearance-none bg-no-repeat bg-right pr-10
      font-medium text-gray-700"
    style={{
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236B7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
      backgroundPosition: 'right 0.5rem center',
      backgroundSize: '1.5em 1.5em',
    }}
  >
    {SORT_OPTIONS.map(({ label, value }) => (
      <option key={value} value={value} className="py-2">
        {label}
      </option>
    ))}
  </select>
);