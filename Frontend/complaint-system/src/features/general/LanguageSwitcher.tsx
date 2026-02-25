import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

export const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'tl' : 'en';
    i18n.changeLanguage(newLang);
  };

  const currentLanguage = i18n.language === 'en' ? 'English' : 'Tagalog';
  const nextLanguage = i18n.language === 'en' ? 'Tagalog' : 'English';

  return (
    <button
      onClick={toggleLanguage}
      className="w-full flex items-center gap-3 px-5 py-3 text-sm text-gray-700
        hover:bg-blue-50 hover:text-blue-800 transition duration-150 text-left cursor-pointer"
      aria-label={`Switch to ${nextLanguage}`}
    >
      <Globe className="w-4 h-4 text-gray-400" />
      <span>Language: {currentLanguage}</span>
    </button>
  );
};
