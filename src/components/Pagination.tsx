import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

/**
 * Turbo.az style pagination component with collapsed ellipsis pattern,
 * previous/next controls, and responsive layout.
 */
export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
}) => {
  if (totalPages <= 1) {
    return null;
  }

  // Generate pagination range with ellipsis
  const getPageItems = (): (number | string)[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }

    if (currentPage >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }

    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  };

  const pageItems = getPageItems();

  return (
    <nav
      id="catalog-pagination"
      aria-label="Kataloq səhifələri"
      className="flex items-center justify-center gap-1 sm:gap-1.5 mt-8 sm:mt-10 pt-4 pb-2 select-none"
    >
      {/* Previous Button */}
      <button
        id="pagination-btn-prev"
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        aria-label="Əvvəlki səhifə"
        className={`min-w-[38px] sm:min-w-[42px] h-[38px] sm:h-[42px] px-2 flex items-center justify-center rounded-xl text-xs sm:text-sm font-bold transition-all border ${
          currentPage <= 1
            ? 'bg-slate-100 text-slate-300 border-slate-200/50 cursor-not-allowed'
            : 'bg-white text-slate-700 hover:bg-blue-50 hover:text-[#1D4ED8] hover:border-blue-200 border-slate-200/80 shadow-2xs active:scale-95'
        }`}
      >
        <ChevronLeft className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
      </button>

      {/* Page Numbers */}
      <div className="flex items-center gap-1 sm:gap-1.5">
        {pageItems.map((item, index) => {
          if (typeof item === 'string') {
            return (
              <span
                key={`ellipsis-${index}`}
                className="w-7 sm:w-9 h-[38px] sm:h-[42px] flex items-center justify-center text-slate-400 font-bold text-xs sm:text-sm tracking-wider"
              >
                ...
              </span>
            );
          }

          const pageNum = item as number;
          const isActive = pageNum === currentPage;

          return (
            <button
              id={`pagination-page-${pageNum}`}
              key={`page-${pageNum}`}
              type="button"
              onClick={() => onPageChange(pageNum)}
              aria-current={isActive ? 'page' : undefined}
              aria-label={`Səhifə ${pageNum}`}
              className={`min-w-[38px] sm:min-w-[42px] h-[38px] sm:h-[42px] px-2 sm:px-3 flex items-center justify-center rounded-xl text-xs sm:text-sm transition-all border ${
                isActive
                  ? 'bg-[#1D4ED8] text-white border-[#1D4ED8] shadow-sm font-extrabold cursor-default'
                  : 'bg-white text-slate-700 hover:bg-blue-50 hover:text-[#1D4ED8] hover:border-blue-200 border-slate-200/80 font-bold shadow-2xs active:scale-95'
              }`}
            >
              {pageNum}
            </button>
          );
        })}
      </div>

      {/* Next Button */}
      <button
        id="pagination-btn-next"
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        aria-label="Növbəti səhifə"
        className={`min-w-[38px] sm:min-w-[42px] h-[38px] sm:h-[42px] px-2 flex items-center justify-center rounded-xl text-xs sm:text-sm font-bold transition-all border ${
          currentPage >= totalPages
            ? 'bg-slate-100 text-slate-300 border-slate-200/50 cursor-not-allowed'
            : 'bg-white text-slate-700 hover:bg-blue-50 hover:text-[#1D4ED8] hover:border-blue-200 border-slate-200/80 shadow-2xs active:scale-95'
        }`}
      >
        <ChevronRight className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
      </button>
    </nav>
  );
};
