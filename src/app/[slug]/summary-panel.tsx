import { formatPriceFromCents } from "@/lib/currency";

import { NO_PREFERENCE, type BookingSelection, type ProfessionalOption } from "./types";

/** "Qui., 24/09, 17:30" — já capitalizado, pois também aparece no meio de uma frase. */
function formatSlotLabel(startAt: string, timezone: string): string {
  const label = new Intl.DateTimeFormat("pt-BR", {
    timeZone: timezone,
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(startAt));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function SummaryPanel({
  selection,
  professionals,
  timezone,
  className,
  compact = false,
}: {
  selection: BookingSelection;
  professionals: ProfessionalOption[];
  timezone: string;
  className?: string;
  /** Versão de uma linha para o rodapé fixo do mobile, que não pode ocupar meia tela. */
  compact?: boolean;
}) {
  const professionalName =
    selection.professionalId === NO_PREFERENCE
      ? "Sem preferência"
      : professionals.find((p) => p.id === selection.professionalId)?.name;

  if (!selection.service) {
    return null;
  }

  if (compact) {
    const details = [
      professionalName,
      selection.slot ? formatSlotLabel(selection.slot.startAt, timezone) : null,
    ].filter(Boolean);
    return (
      <div className={className}>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{selection.service.name}</p>
            {details.length > 0 ? (
              <p className="truncate text-xs text-muted-foreground">{details.join(" · ")}</p>
            ) : null}
          </div>
          <p className="shrink-0 text-lg font-bold">{formatPriceFromCents(selection.service.priceCents)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <p className="text-sm font-semibold">Resumo</p>
      <dl className="mt-2 flex flex-col gap-1 text-sm">
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">Serviço</dt>
          <dd className="text-right font-medium">{selection.service.name}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">Duração</dt>
          <dd className="text-right font-medium">{selection.service.durationMin} min</dd>
        </div>
        {professionalName ? (
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Profissional</dt>
            <dd className="text-right font-medium">{professionalName}</dd>
          </div>
        ) : null}
        {selection.slot ? (
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Horário</dt>
            <dd className="text-right font-medium">
              {formatSlotLabel(selection.slot.startAt, timezone)}
            </dd>
          </div>
        ) : null}
        <div className="mt-2 flex items-baseline justify-between gap-2 border-t pt-3">
          <dt className="font-medium">Total</dt>
          <dd className="text-lg font-bold">{formatPriceFromCents(selection.service.priceCents)}</dd>
        </div>
      </dl>
    </div>
  );
}
