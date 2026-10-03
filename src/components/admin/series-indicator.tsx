import { Repeat } from "lucide-react";

/** Ícone discreto de horário fixo (agendamento recorrente) nos blocos da agenda, com nome acessível. */
export function SeriesIndicator({ seriesId }: { seriesId: string | null }) {
  if (!seriesId) return null;
  return <Repeat className="size-3 shrink-0" role="img" aria-label="Horário fixo" />;
}
