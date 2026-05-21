import { Button } from './Button'
import { cn } from '../../utils/cn'

const Pagination = ({ page, totalPages, onPageChange, className }) => {
  const getPageNumbers = () => {
    const pages = []
    const startPage = Math.max(1, page - 2)
    const endPage = Math.min(totalPages, page + 2)

    if (startPage > 1) pages.push(1)
    if (startPage > 2) pages.push('...')

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i)
    }

    if (endPage < totalPages - 1) pages.push('...')
    if (endPage < totalPages) pages.push(totalPages)

    return pages
  }

  return (
    <div className={cn('flex items-center justify-center gap-2', className)}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
      >
        ← Prev
      </Button>

      <div className="flex items-center gap-1">
        {getPageNumbers().map((p, idx) => (
          <button
            key={idx}
            onClick={() => typeof p === 'number' && onPageChange(p)}
            disabled={p === '...'}
            className={cn(
              'px-2 py-1 rounded text-sm transition-colors',
              p === page
                ? 'bg-teal-500 text-white font-semibold'
                : p === '...'
                ? 'cursor-default text-gray-400'
                : 'border border-navy border-opacity-10 hover:bg-navy hover:bg-opacity-5'
            )}
          >
            {p}
          </button>
        ))}
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
      >
        Next →
      </Button>

      <span className="ml-4 text-sm text-gray-600">
        Page {page} / {totalPages}
      </span>
    </div>
  )
}

export { Pagination }
