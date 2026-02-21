// ─── components/Pagination.tsx ────────────────────────────────────────────────

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
  const getPageNumbers = (): number[] => {
    const pages: number[] = [];
    const start = Math.max(1, currentPage - 2);
    const end   = Math.min(totalPages, currentPage + 2);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
      <p className="text-xs text-gray-500">
        Page <span className="font-semibold text-gray-700">{currentPage}</span> of{" "}
        <span className="font-semibold text-gray-700">{totalPages}</span>
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-600
            border border-gray-200 hover:bg-gray-50 disabled:opacity-40
            disabled:cursor-not-allowed transition"
        >
          ← Prev
        </button>
        {getPageNumbers().map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`w-8 h-8 rounded-lg text-xs font-medium transition
              ${page === currentPage
                ? "bg-blue-700 text-white shadow-sm"
                : "text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}
          >
            {page}
          </button>
        ))}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-600
            border border-gray-200 hover:bg-gray-50 disabled:opacity-40
            disabled:cursor-not-allowed transition"
        >
          Next →
        </button>
      </div>
    </div>
  );
};