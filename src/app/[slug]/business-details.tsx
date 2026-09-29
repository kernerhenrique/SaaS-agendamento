import { ChevronDown, Clock, Info } from "lucide-react";

import { describeBookingPolicies, formatHoursRange, groupBusinessHours } from "@/lib/business-info";
import { todayInTimeZone, weekdayOfLocalDate } from "@/lib/date";

import type { BusinessInfo } from "./types";

/**
 * "Horários e políticas" no topo da página pública: fechado por padrão para
 * não empurrar o fluxo de reserva para baixo no celular. O resumo mostra o
 * horário de hoje; aberto, a semana agrupada e as políticas em frases.
 */
export function BusinessDetails({ business }: { business: BusinessInfo }) {
  const hasHours = business.workingHours.length > 0;
  const today = weekdayOfLocalDate(todayInTimeZone(business.timezone));
  const todayHours = business.workingHours.find((entry) => entry.weekday === today);
  const policies = describeBookingPolicies(business);

  return (
    <details className="group mt-3 rounded-lg border bg-background text-sm">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg px-3 py-2 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none [&::-webkit-details-marker]:hidden">
        {hasHours ? <Clock className="size-4 shrink-0 text-muted-foreground" /> : <Info className="size-4 shrink-0 text-muted-foreground" />}
        <span className="min-w-0 flex-1 truncate">
          {hasHours ? (
            todayHours ? (
              <>
                <span className="font-medium text-success">Aberto hoje</span> · {formatHoursRange(todayHours)}
              </>
            ) : (
              <span className="text-muted-foreground">Fechado hoje</span>
            )
          ) : (
            "Políticas de reserva"
          )}
        </span>
        {/* No celular a seta basta; o rótulo cortaria o horário de hoje. */}
        <span className="hidden shrink-0 text-caption text-muted-foreground sm:inline">
          {hasHours ? "Horários e políticas" : "Ver"}
        </span>
        <span className="sr-only sm:hidden">Ver horários e políticas</span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180 motion-reduce:transition-none" />
      </summary>

      <div className="grid gap-4 border-t px-3 py-3 sm:grid-cols-2">
        {hasHours ? (
          <div>
            <h2 className="mb-1.5 font-medium">Horário de funcionamento</h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
              {groupBusinessHours(business.workingHours).map((group) => (
                <div key={group.days} className="contents">
                  <dt className="text-muted-foreground">{group.days}</dt>
                  <dd className="tabular-nums">{group.hours}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}
        <div>
          <h2 className="mb-1.5 font-medium">Como funciona a reserva</h2>
          <ul className="flex list-disc flex-col gap-1 pl-4 text-muted-foreground">
            {policies.map((sentence) => (
              <li key={sentence}>{sentence}</li>
            ))}
          </ul>
          {business.policyText ? <p className="mt-2 whitespace-pre-line text-muted-foreground">{business.policyText}</p> : null}
        </div>
      </div>
    </details>
  );
}
