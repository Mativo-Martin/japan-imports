import { useSearchParams } from 'react-router-dom'

export function usePaginationParams() {
  const [searchParams, setSearchParams] = useSearchParams()

  const page = parseInt(searchParams.get('page') || '1', 10)
  const pageSize = parseInt(searchParams.get('pageSize') || '20', 10)
  const sortBy = searchParams.get('sortBy') || 'price_usd'
  const sortOrder = searchParams.get('sortOrder') || 'asc'

  const setPage = (newPage) => {
    const params = new URLSearchParams(searchParams)
    params.set('page', String(newPage))
    setSearchParams(params)
  }

  const setPageSize = (newSize) => {
    const params = new URLSearchParams(searchParams)
    params.set('pageSize', String(newSize))
    params.set('page', '1') // Reset to page 1 when changing page size
    setSearchParams(params)
  }

  const setSortBy = (newSort) => {
    const params = new URLSearchParams(searchParams)
    params.set('sortBy', newSort)
    params.set('page', '1')
    setSearchParams(params)
  }

  const setSortOrder = (newOrder) => {
    const params = new URLSearchParams(searchParams)
    params.set('sortOrder', newOrder)
    setSearchParams(params)
  }

  return {
    page,
    pageSize,
    sortBy,
    sortOrder,
    setPage,
    setPageSize,
    setSortBy,
    setSortOrder,
  }
}
