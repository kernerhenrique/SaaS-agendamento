import { StatusBadge } from "@/components/status-badge";
import type { AppointmentStatus } from "@/generated/prisma/enums";
import { STATUS_LABELS, STATUS_TONE } from "@/lib/appointment-status";

export interface HistoryItem {
  id: string;
  startAt: string;
  status: AppointmentStatus;
  service: { name: string };
  professional?: { name: string };
}

/**
 * Agendamentos de um cliente em duas listas: futuros (o próximo primeiro) e
 * passados (o mais recente primeiro). Usado no drawer do agendamento e na
 * ficha do cliente.
 */
export function AppointmentHistoryLists({
  items,
  now,
  formatDateTime,
}: {
  items: HistoryItem[];
  now: Date;
  formatDateTime: (iso: string, options: Intl.DateTimeFormatOptions) => string;
}) {
  const future = items.filter((item) => new Date(item.startAt) > now).sort((a, b) => a.startAt.localeCompare(b.startAt));
  const past = items.filter((item) => new Date(item.startAt) <= now).sort((a, b) => b.startAt.localeCompare(a.startAt));

  const list = (title: string, entries: HistoryItem[], empty: string) => (
    <section className="flex flex-col gap-2" aria-label={title}>
      <h3 className="text-caption font-medium text-muted-foreground uppercase">{title}</h3>
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {entries.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="min-w-0">
                <span className="block truncate">
                  {formatDateTime(item.startAt, { day: "2-digit", month: "2-digit", year: "2-digit" })},{" "}
                  {formatDateTime(item.startAt, { hour: "2-digit", minute: "2-digit" })} · {item.service.name}
                </span>
                {item.professional ? <span className="block text-caption text-muted-foreground">{item.professional.name}</span> : null}
              </span>
              <StatusBadge tone={STATUS_TONE[item.status]}>{STATUS_LABELS[item.status]}</StatusBadge>
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  return (
    <>
      {list("Agendamentos futuros", future, "Nenhum agendamento futuro.")}
      {list("Agendamentos passados", past, "Nenhum agendamento passado.")}
    </>
  );
}
