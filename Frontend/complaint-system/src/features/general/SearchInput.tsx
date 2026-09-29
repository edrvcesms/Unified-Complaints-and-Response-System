import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";

interface SearchInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSearch: () => void;
  placeholder?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({ 
  value, 
  onChange,
  onSearch,
  placeholder
}) => {
  const { t } = useTranslation();
  
  return (
    <form
      className="flex w-full sm:max-w-md items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        onSearch();
      }}
    >
      <input
        type="text"
        placeholder={placeholder || t('search.placeholder')}
        value={value}
        onChange={onChange}
        maxLength={200}
        className="min-w-0 flex-1 h-11 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder-gray-400"
      />
      <button
        type="submit"
        aria-label="Search"
        title="Search"
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary-600 text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
      >
        <Search className="h-4 w-4" />
      </button>
    </form>
  );
};
