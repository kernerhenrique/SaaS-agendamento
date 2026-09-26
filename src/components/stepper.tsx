import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Indicador de etapas genérico. Usa `bg-primary`/`text-primary-foreground`
 * (já ajustados à cor de marca do negócio via `AccentColorScope`), então
 * funciona tanto na página pública quanto no admin sem receber cor por prop.
 * Extraído do `StepIndicator` de `src/app/[slug]/step-indicator.tsx`.
 */
export function Stepper({ steps, currentStep }: { steps: string[]; currentStep: number }) {
  return (
    <ol className="flex items-center gap-2 text-xs sm:text-sm">
      {steps.map((label, index) => {
        const stepNumber = index + 1;
        const isActive = stepNumber === currentStep;
        const isDone = stepNumber < currentStep;
        return (
          <li key={label} className="flex shrink-0 items-center gap-2" aria-current={isActive ? "step" : undefined}>
            <span
              aria-hidden
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                isActive || isDone ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
              )}
            >
              {isDone ? <Check className="size-4" /> : stepNumber}
            </span>
            {/* Em telas estreitas só a etapa atual mostra o nome, para não
                estourar a largura — os demais continuam para leitores de tela. */}
            <span className={isActive ? "font-medium" : "sr-only text-muted-foreground sm:not-sr-only"}>
              {label}
            </span>
            {stepNumber < steps.length ? <span aria-hidden className="mx-1 h-0.5 w-4 bg-border sm:w-8" /> : null}
          </li>
        );
      })}
    </ol>
  );
}
