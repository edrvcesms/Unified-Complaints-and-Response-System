import { useTranslation } from "react-i18next";
import type{ StatusFilter, SeverityScoreFilter, ComplaintStatusFilter } from "../../../types/complaints/complaint";
import { STATUS_FILTERS, SEVERITY_SCORE_FILTERS, COMPLAINT_STATUS_FILTERS } from "../../../types/complaints/complaint";
import type { SortOption } from "../../../hooks/useFilter";

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
            ? "bg-primary-600 text-white"
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
      focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 
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
      focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 
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

interface ComplaintStatusFilterDropdownProps {
  current: ComplaintStatusFilter;
  onChange: (status: ComplaintStatusFilter) => void;
}

export const ComplaintStatusFilterDropdown: React.FC<ComplaintStatusFilterDropdownProps> = ({
  current,
  onChange,
}) => (
  <select
    value={current}
    onChange={(e) => onChange(e.target.value as ComplaintStatusFilter)}
    className="px-4 py-2.5 text-sm border border-gray-300 rounded-lg shadow-sm 
      focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 
      bg-white hover:border-gray-400 transition-colors cursor-pointer
      appearance-none bg-no-repeat bg-right pr-10
      font-medium text-gray-700"
    style={{
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236B7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
      backgroundPosition: 'right 0.5rem center',
      backgroundSize: '1.5em 1.5em',
    }}
  >
    {COMPLAINT_STATUS_FILTERS.map(({ label, value }) => (
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
}) => {
  const { t } = useTranslation();
  
  const SORT_OPTIONS: { label: string; value: SortOption }[] = [
    { label: t('filters.sort.default'), value: "none" },
    { label: t('filters.sort.priorityHighLow'), value: "priority_high_to_low" },
    { label: t('filters.sort.priorityLowHigh'), value: "priority_low_to_high" },
    { label: t('filters.sort.dateNewestFirst'), value: "date_newest_first" },
    { label: t('filters.sort.dateOldestFirst'), value: "date_oldest_first" },
    { label: t('filters.sort.dateNewestLast'), value: "date_newest_last" },
    { label: t('filters.sort.dateOldestLast'), value: "date_oldest_last" },
  ];

  return (
  <select
    value={current}
    onChange={(e) => onChange(e.target.value as SortOption)}
    className="px-4 py-2.5 text-sm border border-gray-300 rounded-lg shadow-sm 
      focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 
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
};

interface DateFilterProps {
  dateFrom: string;
  dateTo: string;
  minDate?: string;
  maxDate?: string;
  onDateFromChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDateToChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
}

export const DateFilter: React.FC<DateFilterProps> = ({
  dateFrom,
  dateTo,
  minDate,
  maxDate,
  onDateFromChange,
  onDateToChange,
  onClear,
}) => (
  <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
    <input
      type="date"
      value={dateFrom}
      onChange={onDateFromChange}
      min={minDate}
      max={maxDate}
      className="px-3 py-2.5 text-sm border border-gray-300 rounded-lg shadow-sm 
        focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 
        bg-white hover:border-gray-400 transition-colors cursor-pointer"
      placeholder="From"
    />
    <span className="text-gray-500 text-sm hidden sm:block">to</span>
    <input
      type="date"
      value={dateTo}
      onChange={onDateToChange}
      min={minDate}
      max={maxDate}
      className="px-3 py-2.5 text-sm border border-gray-300 rounded-lg shadow-sm 
        focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 
        bg-white hover:border-gray-400 transition-colors cursor-pointer"
      placeholder="To"
    />
    {(dateFrom || dateTo) && (
      <button
        onClick={onClear}
        className="px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 
          border border-red-300 rounded-lg hover:bg-red-50 transition-colors whitespace-nowrap cursor-pointer"
      >
        Clear
      </button>
    )}
  </div>
);