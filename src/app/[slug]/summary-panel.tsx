import { formatPriceFromCents } from "@/lib/currency";

import { NO_PREFERENCE, type BookingSelection, type ProfessionalOption } from "./types";

function formatSlotLabel(startAt: string, timezone: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: timezone,
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(startAt));
}

export function SummaryPanel({
  selection,
  professionals,
  timezone,
  className,
}: {
  selection: BookingSelection;
  professionals: ProfessionalOption[];
  timezone: string;
  className?: string;
}) {
  const professionalName =
    selection.professionalId === NO_PREFERENCE
      ? "Sem preferência"
      : professionals.find((p) => p.id === selection.professionalId)?.name;

  if (!selection.service) {
    return null;
  }

  return (
    <div className={className}>
      <p className="text-sm font-semibold">Resumo</p>
      <dl className="mt-2 flex flex-col gap-1 text-sm">
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">Serviço</dt>
          <dd className="text-right font-medium">
            {selection.service.name} · {formatPriceFromCents(selection.service.priceCents)}
          </dd>
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
            <dd className="text-right font-medium capitalize">
              {formatSlotLabel(selection.slot.startAt, timezone)}
            </dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}
