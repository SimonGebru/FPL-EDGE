import React from 'react';

export default function useApi(fetcher, initialParams = {}) {
  const [params, setParams] = React.useState(initialParams);
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  const reload = React.useCallback(async (override) => {
    setLoading(true);
    setError(null);
    try {
      const p = new URLSearchParams(override ?? params);
      const res = await fetcher(p);
      setData(res);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [fetcher, params]);

  React.useEffect(() => { reload(); }, []); // initial fetch

  return { data, loading, error, params, setParams, reload };
}