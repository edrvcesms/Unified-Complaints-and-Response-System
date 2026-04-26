
import { useTranslation } from "react-i18next";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
}) => {
  const { t } = useTranslation();
  
  const getPageNumbers = (): number[] => {
    const pages: number[] = [];
    const start = Math.max(1, currentPage - 2);
    const end   = Math.min(totalPages, currentPage + 2);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-3 sm:px-4 py-3 border-t border-gray-200 bg-gray-50">
      <p className="text-xs text-gray-600 text-center sm:text-left">
        {t('pagination.pageInfo', { current: currentPage, total: totalPages })}
      </p>
      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-center">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="min-h-9 px-3 py-1.5 rounded-md text-xs font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          {t('pagination.prev')}
        </button>
        {getPageNumbers().map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`w-9 h-9 rounded-md text-xs font-medium transition-colors cursor-pointer
              ${page === currentPage
                ? "bg-primary-600 text-white"
                : "text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
              }`}
          >
            {page}
          </button>
        ))}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="min-h-9 px-3 py-1.5 rounded-md text-xs font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          {t('pagination.next')}
        </button>
      </div>
    </div>
  );
};