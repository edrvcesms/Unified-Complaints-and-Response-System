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
    className="w-full sm:w-80 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"
  />
);