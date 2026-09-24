import { Check } from "lucide-react";

import { getAccentForeground } from "@/lib/accent-color";

const STEP_LABELS = ["Serviço", "Profissional", "Horário", "Contato"];

export function StepIndicator({ currentStep, accentColor }: { currentStep: number; accentColor: string }) {
  const activeForeground = getAccentForeground(accentColor);

  return (
    <ol className="flex items-center gap-2 text-xs sm:text-sm">
      {STEP_LABELS.map((label, index) => {
        const stepNumber = index + 1;
        const isActive = stepNumber === currentStep;
        const isDone = stepNumber < currentStep;
        return (
          <li key={label} className="flex shrink-0 items-center gap-2" aria-current={isActive ? "step" : undefined}>
            <span
              aria-hidden
              className="flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors"
              style={{
                backgroundColor: isActive || isDone ? accentColor : "var(--muted)",
                color: isActive || isDone ? activeForeground : "var(--muted-foreground)",
              }}
            >
              {isDone ? <Check className="size-4" /> : stepNumber}
            </span>
            {/* No celular só a etapa atual mostra o nome — os 4 nomes juntos
                não cabem e causavam rolagem horizontal. Os demais continuam
                disponíveis para leitores de tela. */}
            <span className={isActive ? "font-medium" : "sr-only text-muted-foreground sm:not-sr-only"}>
              {label}
            </span>
            {stepNumber < STEP_LABELS.length ? (
              <span aria-hidden className="mx-1 h-0.5 w-4 bg-border sm:w-8" />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
