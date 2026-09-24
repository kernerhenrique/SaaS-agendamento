const STEP_LABELS = ["Serviço", "Profissional", "Horário", "Contato"];

export function StepIndicator({ currentStep, accentColor }: { currentStep: number; accentColor: string }) {
  return (
    <ol className="flex items-center gap-2 text-xs sm:text-sm">
      {STEP_LABELS.map((label, index) => {
        const stepNumber = index + 1;
        const isActive = stepNumber === currentStep;
        const isDone = stepNumber < currentStep;
        return (
          <li key={label} className="flex items-center gap-2">
            <span
              className="flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium"
              style={{
                backgroundColor: isActive || isDone ? accentColor : "var(--muted)",
                color: isActive || isDone ? "white" : "var(--muted-foreground)",
              }}
            >
              {stepNumber}
            </span>
            <span className={isActive ? "font-medium" : "text-muted-foreground"}>{label}</span>
            {stepNumber < STEP_LABELS.length ? (
              <span className="mx-1 h-px w-4 bg-border sm:w-8" />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
