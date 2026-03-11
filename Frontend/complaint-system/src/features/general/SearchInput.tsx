import { useTranslation } from "react-i18next";

interface SearchInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({ 
  value, 
  onChange,
  placeholder
}) => {
  const { t } = useTranslation();
  
  return (
  <input
    type="text"
    placeholder={placeholder || t('search.placeholder')}
    value={value}
    onChange={onChange}
    maxLength={200}
    className="w-full sm:w-80 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"
  />
  );
};
