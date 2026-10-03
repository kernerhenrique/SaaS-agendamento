"use client";

import { useEffect, useState } from "react";

import type { ClosureRange } from "@/server/modules/business/closure-rules";

export interface BusinessClosure extends ClosureRange {
  id: string;
}

/**
 * Dias fechados do negócio (de hoje em diante) para a agenda e o encaixe
 * avisarem. Sem os dados (carregando ou erro), nada é bloqueado aqui: o
 * servidor revalida o encaixe de qualquer forma. `version` refaz a busca.
 */
export function useBusinessClosures(version = 0): BusinessClosure[] {
  const [closures, setClosures] = useState<BusinessClosure[]>([]);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/business/closures")
      .then((response) => (response.ok ? response.json() : { closures: [] }))
      .then((data: { closures?: BusinessClosure[] }) => {
        if (!cancelled) setClosures(data.closures ?? []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [version]);
  return closures;
}
