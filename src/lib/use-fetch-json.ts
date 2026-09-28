"use client";

import { useEffect, useState } from "react";

/**
 * Busca JSON e guarda de qual URL veio o dado: enquanto a URL atual não
 * chegou, `loading` é true (skeleton); um `reloadKey` novo atualiza no lugar,
 * sem piscar. `url` null = não buscar. Usado no Financeiro e nos Relatórios.
 */
export function useFetchJson<T>(url: string | null, reloadKey = 0) {
  const [state, setState] = useState<{ url: string | null; data: T | null; error: boolean }>({
    url: null,
    data: null,
    error: false,
  });
  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    fetch(url)
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
      .then((data: T) => {
        if (!cancelled) setState({ url, data, error: false });
      })
      .catch(() => {
        if (!cancelled) setState({ url, data: null, error: true });
      });
    return () => {
      cancelled = true;
    };
  }, [url, reloadKey]);
  return {
    data: state.url === url ? state.data : null,
    loading: state.url !== url,
    error: state.url === url && state.error,
  };
}
