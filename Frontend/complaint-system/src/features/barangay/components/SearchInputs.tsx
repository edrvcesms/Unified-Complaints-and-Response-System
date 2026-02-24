interface SearchInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({ 
  value, 
  onChange,
  placeholder = "Search by title, category, barangay, or ID..."
}) => (
  <input
    type="text"
    placeholder={placeholder}
    value={value}
    onChange={onChange}
    className="w-full sm:w-72 px-3 py-1.5 text-sm border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
  />
);