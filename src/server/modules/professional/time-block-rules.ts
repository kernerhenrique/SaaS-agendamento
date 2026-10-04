import { addDaysToIsoDate, localMinutesToUtc, utcToLocalDate, utcToLocalMinutes } from "@/lib/date";
import { minutesToTimeInput } from "@/lib/weekday";

/**
 * Folgas e ausências de UM profissional (módulo puro: tela e testes). Dias
 * fechados do negócio inteiro ficam em Configurações (BusinessClosure); aqui
 * é a pessoa: folga, médico, férias. Gravado como TimeBlock (início/fim em UTC).
 */
export type TimeBlockForm =
  | { mode: "days"; startDate: string; endDate: string }
  | { mode: "hours"; date: string; startTime: string; endTime: string };

export function buildTimeBlockRange(form: TimeBlockForm, timeZone: string): { startAt: Date; endAt: Date } {
  if (form.mode === "days") {
    if (!form.startDate) throw new Error("Escolha a data");
    const endDate = form.endDate || form.startDate;
    if (endDate < form.startDate) throw new Error("A data final precisa ser igual ou depois da inicial");
    // Dia inteiro: da meia-noite do primeiro dia à meia-noite depois do último.
    return {
      startAt: localMinutesToUtc(form.startDate, 0, timeZone),
      endAt: localMinutesToUtc(addDaysToIsoDate(endDate, 1), 0, timeZone),
    };
  }
  const start = parseTime(form.startTime);
  const end = parseTime(form.endTime);
  if (!form.date || start === null || end === null) throw new Error("Preencha data, início e fim");
  if (end <= start) throw new Error("O fim precisa ser depois do início");
  return { startAt: localMinutesToUtc(form.date, start, timeZone), endAt: localMinutesToUtc(form.date, end, timeZone) };
}

function parseTime(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

const dayMonth = (isoDate: string) => `${isoDate.slice(8, 10)}/${isoDate.slice(5, 7)}`;

/**
 * "12/10 · dia inteiro", "15/10 a 30/10 · dias inteiros", "20/10, 14:00 às 16:00"
 * ou "20/10, 14:00 até 22/10, 10:00". Um fim às 23:59 (bloqueios antigos) conta como dia inteiro.
 */
export function describeTimeBlock(startAt: Date, endAt: Date, timeZone: string): string {
  const startDate = utcToLocalDate(startAt, timeZone);
  const startMinute = utcToLocalMinutes(startAt, timeZone);
  const endMinute = utcToLocalMinutes(endAt, timeZone);
  let endDate = utcToLocalDate(endAt, timeZone);

  const endsAtMidnight = endMinute === 0 && endDate > startDate;
  if (startMinute === 0 && (endsAtMidnight || endMinute >= 23 * 60 + 59)) {
    if (endsAtMidnight) endDate = addDaysToIsoDate(endDate, -1);
    return endDate === startDate ? `${dayMonth(startDate)} · dia inteiro` : `${dayMonth(startDate)} a ${dayMonth(endDate)} · dias inteiros`;
  }
  if (endDate === startDate) {
    return `${dayMonth(startDate)}, ${minutesToTimeInput(startMinute)} às ${minutesToTimeInput(endMinute)}`;
  }
  return `${dayMonth(startDate)}, ${minutesToTimeInput(startMinute)} até ${dayMonth(endDate)}, ${minutesToTimeInput(endMinute)}`;
}
