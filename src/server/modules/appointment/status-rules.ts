import { AppointmentStatus } from "@/generated/prisma/enums";

/**
 * Regras de status que dependem da hora (módulo puro: servidor e tela usam o
 * mesmo). "Concluído" e "Não compareceu" são estados finais e entram nos
 * relatórios: só fazem sentido depois que o atendimento começou. Antes disso,
 * o que se pode fazer é cancelar ou remarcar.
 */
const NEEDS_STARTED: AppointmentStatus[] = [AppointmentStatus.COMPLETED, AppointmentStatus.NO_SHOW];

export const NOT_STARTED_MESSAGE = "Concluir e “Não compareceu” ficam disponíveis a partir do horário do atendimento.";

/** A mudança para `next` já pode ser feita neste momento? */
export function isStatusChangeAvailable(next: AppointmentStatus, startAt: Date, now: Date): boolean {
  return !NEEDS_STARTED.includes(next) || startAt.getTime() <= now.getTime();
}
