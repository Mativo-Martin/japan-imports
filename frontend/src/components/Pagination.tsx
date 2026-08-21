'use client';

import React, { memo } from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  canGoNext: boolean;
  canGoPrev: boolean;
  className?: string;
}

const Pagination = memo(function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  canGoNext,
  canGoPrev,
  className = '',
}: PaginationProps) {
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (currentPage > 3) {
        pages.push('...');
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) {
          pages.push(i);
        }
      }

      if (currentPage < totalPages - 2) {
        pages.push('...');
      }

      pages.push(totalPages);
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className={`pagination ${className}`}>
      <button
        className="pagination-btn pagination-prev"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={!canGoPrev}
        aria-label="Previous page"
      >
        <i className="ti ti-chevron-left" aria-hidden="true" />
        <span className="pagination-btn-label">Previous</span>
      </button>

      <div className="pagination-numbers">
        {pageNumbers.map((page, idx) =>
          page === '...' ? (
            <span key={`dots-${idx}`} className="pagination-dots">
              •••
            </span>
          ) : (
            <button
              key={page}
              className={`pagination-number ${
                page === currentPage ? 'active' : ''
              }`}
              onClick={() => onPageChange(page as number)}
              aria-label={`Go to page ${page}`}
              aria-current={page === currentPage ? 'page' : undefined}
            >
              {page}
            </button>
          )
        )}
      </div>

      <button
        className="pagination-btn pagination-next"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={!canGoNext}
        aria-label="Next page"
      >
        <span className="pagination-btn-label">Next</span>
        <i className="ti ti-chevron-right" aria-hidden="true" />
      </button>

      <div className="pagination-info" aria-live="polite">
        Page <span className="pagination-current">{currentPage}</span> of{' '}
        <span className="pagination-total">{totalPages}</span>
      </div>
    </div>
  );
});

export default Pagination;