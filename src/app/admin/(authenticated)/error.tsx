"use client";

import { useEffect } from "react";
import { RotateCcw, TriangleAlert } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";

/**
 * Erro inesperado numa tela do painel: mantém o menu e oferece tentar de novo.
 * `retry` (Next 16) busca os dados do servidor de novo — `reset` só re-renderia.
 */
export default function AdminError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-1 flex-col p-4 sm:p-6">
      <EmptyState
        icon={TriangleAlert}
        title="Não foi possível carregar esta tela"
        description="Verifique sua conexão e tente de novo."
        action={
          <Button size="sm" onClick={() => retry()}>
            <RotateCcw />
            Tentar de novo
          </Button>
        }
      />
    </main>
  );
}
