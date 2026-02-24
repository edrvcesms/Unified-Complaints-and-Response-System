interface SearchInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const SearchInput: React.FC<SearchInputProps> = ({ value, onChange }) => (
  <input
    type="text"
    placeholder="Search by title, name, category, barangay, or ID..."
    value={value}
    onChange={onChange}
    className="w-full sm:w-72 px-3 py-1.5 text-sm border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
  />
);