import { useState, useEffect, useCallback } from 'react';

/**
 * useFetchPaged — hook for server-side paginated data
 * @param {Function} apiFn - API function that accepts { page, limit, ...filters }
 * @param {Object} filters - Additional filter params
 * @param {String} dataKey - Key in response containing the array
 */
export function useFetchPaged(apiFn, filters = {}, dataKey = 'data') {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const limit = 20;

  const fetchData = useCallback(async (pageNum = page) => {
    setLoading(true);
    setError(null);
    try {
      const params = { page: pageNum, limit, ...filters };
      const { data: res } = await apiFn(params);
      setData(res[dataKey] || []);
      setTotal(res.total || 0);
      setPage(res.page || pageNum);
      setTotalPages(res.totalPages || 1);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [page, JSON.stringify(filters)]); // eslint-disable-line

  useEffect(() => {
    fetchData(page);
  }, [page, fetchData]);

  const refresh = () => fetchData(page);
  const goToPage = (p) => setPage(p);
  const nextPage = () => page < totalPages && setPage(page + 1);
  const prevPage = () => page > 1 && setPage(page - 1);

  return {
    data,
    total,
    page,
    totalPages,
    loading,
    error,
    refresh,
    goToPage,
    nextPage,
    prevPage,
    setData,
  };
}

export default useFetchPaged;
