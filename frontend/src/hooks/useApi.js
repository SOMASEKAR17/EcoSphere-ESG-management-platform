import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Reusable hook for API calls with loading, error, and refetch support.
 *
 * @param {Function} fetchFn - An async function that returns the data (e.g. () => apiClient.get('/endpoint'))
 * @param {Array}    deps    - Dependency array for re-fetching (like useEffect deps)
 * @param {Object}   options - { immediate: true } to fetch on mount (default: true)
 *
 * @returns {{ data, loading, error, refetch, setData }}
 */
export default function useApi(fetchFn, deps = [], options = {}) {
  const { immediate = true } = options;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);

  // Keep latest fetchFn in a ref so we don't need it in deps
  const fnRef = useRef(fetchFn);
  fnRef.current = fetchFn;

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fnRef.current();
      const result = response?.data !== undefined ? response.data : response;
      setData(result);
      return result;
    } catch (err) {
      const message = err?.response?.data?.detail || err?.message || 'API request failed';
      setError(message);
      console.warn('[useApi] Error:', message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []); // stable identity

  useEffect(() => {
    if (immediate) {
      refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, refetch, setData };
}
